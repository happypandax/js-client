import * as net from "net";
import * as zlib from "zlib";
import { Transform, TransformOptions } from "stream";

const encoding = "utf8";

const postfix = Buffer.from("<EOF>", encoding);

const exception_codes = {
  AuthRequiredError: 407,
  AuthWrongCredentialsError: 411,
  AuthMissingCredentials: 412,
  ServerError: 400,
  AuthError: 406,
  ClientError: 500,
  ConnectionError: 501,
  ServerDisconnectError: 502,
};

const log = {
  d: function (msg: string) {
    console.debug(msg);
  },
  i: function (msg: string) {
    console.log(msg);
  },
  w: function (msg: string) {
    console.warn(msg);
  },
  e: function (msg: string) {
    console.error(msg);
  },
  c: function (msg: string) {
    console.error(msg);
  },
};

class EError extends Error {
  code: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
    this.code = exception_codes[this.name as keyof typeof exception_codes];
  }
}

export class ServerError extends EError {}
export class AuthError extends ServerError {}
export class AuthWrongCredentialsError extends AuthError {}
export class AuthRequiredError extends AuthError {}
export class AuthMissingCredentials extends AuthError {}
export class ClientError extends ServerError {}
export class ConnectionError extends ClientError {}
export class ServerDisconnectError extends ConnectionError {}

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {
  [key: string]: AnyJson;
}
export interface JsonArray extends Array<AnyJson> {}

export type Msg = JsonMap;

/**
 * A helper function that will wrap your message up like this:
 * ```
 * msg = {
 *      'session': session_id,
 *      'name': name,
 *      'data': data, # <--- your message is put here
 *   }
 * ```
 * @param  {Object} msg_dict - message to wrap
 * @param  {string} session_id - optional, session id
 * @param  {string} name - name of client
 * @param  {Object} error - error message object to include in the final message
 * @param  {Object} opts - optional options
 * @param  [opts.to_json] {boolean} - convert the final message to json string
 * @param  [opts.to_bytes] {boolean} - convert the final message to bytes buffer
 * @return {Object|string|Buffer}
 */
export function finalize(
  msg_dict: AnyJson,
  session_id?: string | null,
  name?: string,
  error?: Msg,
  opts?: Partial<{ to_json: boolean; to_bytes: boolean }>
) {
  session_id = session_id || "";
  if (opts === undefined) opts = {};

  let to_json = opts.to_json ?? false;

  const to_bytes = opts.to_bytes ?? false;
  if (opts.to_bytes === true) to_json = true;

  let msg = {
    session: session_id,
    name: name ? name : "js-client",
    data: msg_dict,
  } as Msg;

  if (error) msg.error = error;

  let rmsg: string | Buffer | Msg = msg;

  if (to_json) rmsg = JSON.stringify(msg);

  if (to_bytes) rmsg = Buffer.from(rmsg as string, encoding);

  return rmsg;
}

class HPXTransform extends Transform {
  _buffer: Buffer;
  _client_name: string;

  constructor(client_name: string, options: TransformOptions) {
    super(options);
    this._buffer = Buffer.from("", encoding);
    this._client_name = client_name;
  }

  _end_of_msg(buffer: Buffer) {
    let chunk = buffer;
    let idx = buffer.indexOf(postfix);
    let eof = false;
    let remaining_buffer = Buffer.from("", encoding);
    if (idx !== -1) {
      chunk = buffer.slice(0, idx);
      remaining_buffer = buffer.slice(idx + postfix.length);
      eof = true;
    }

    return { chunk, remaining_buffer, eof };
  }

  _transform(
    chunk: Buffer,
    enc: string,
    callback: (err: Error | null, buffer?: Buffer) => any
  ) {
    let err: Error | null = null;
    if (!chunk.length)
      err = new ServerDisconnectError(
        "Server disconnected for client '" + this._client_name + "'"
      );
    this._buffer = Buffer.concat([this._buffer, chunk]);
    const { chunk: data, remaining_buffer, eof } = this._end_of_msg(
      this._buffer
    );
    if (eof) {
      this._buffer = remaining_buffer;
    }

    if (data) {
      zlib.unzip(data, (zip_err, zip_buffer) => {
        if (!zip_err) {
          log.d(
            "Recieved " + zip_buffer.length.toString() + " bytes from server"
          );
          callback(err, zip_buffer);
        } else log.e(zip_err.message);
      });
    } else callback(err);
  }
}

type Version = {
  core: [number, number, number];
  db: [number, number, number];
  torrent: [number, number, number];
};

export type ServerMsg = { session: string; name: string; data: AnyJson };
export type ServerErrorMsg = { code: number; msg: string };

/**
 * A class representing a HappyPanda X client
 */
export class Client {
  name: string;
  _alive: boolean;
  _ready: boolean;
  _buffer: Buffer;
  session: string;
  _server: [string, number];
  version: Version | null;
  guest_allowed: boolean;
  _accepted: boolean;
  _last_user: string | null;
  _last_pass: string | null;
  _stream: HPXTransform;
  timeout: number;
  _sock: net.Socket | null;
  _first_message: boolean;
  _connecting: boolean;
  _resolved_connected_promises: boolean;
  _on_connect_promise_resolves: [(v: any) => void, (v: any) => void][];
  _promise_resolves: [(v: any) => void, (v: any) => void][];

  /**
   * @param  {Object} params - optional params
   * @param  [params.name=js-client] {string} - name of client
   * @param  [params.host] {string} - server host
   * @param  [params.port] {integer} - server port
   * @param  [params.session_id] {string} - a server session id
   * @param  [params.timeout] {integer} - connection timeout
   */
  constructor({
    name,
    host,
    port,
    session_id,
    timeout,
  }: Partial<{
    name: string;
    host: string;
    port: number;
    session_id: string;
    timeout: number;
  }>) {
    this.name = name || "js-client";
    this._server = [host || "localhost", port || 7007]; // [host, port]
    this._alive = false;
    this._ready = false;
    this._buffer = Buffer.from("", encoding);
    this.session = session_id || "";
    this.version = null;
    this.guest_allowed = false;
    this._accepted = false;

    this._last_user = "";
    this._last_pass = "";

    this._stream = new HPXTransform(this.name, {
      defaultEncoding: encoding,
    });
    this._stream.on("data", this._recv.bind(this));

    this.timeout = timeout || 10;
    this._sock = null;

    this._first_message = true;
    this._promise_resolves = [];
    this._on_connect_promise_resolves = [];
    this._connecting = false;
    this._resolved_connected_promises = false;
    this._create_socket();
  }

  _create_socket() {
    this._sock = new net.Socket();
    this._sock.setTimeout(this.timeout, this._on_timeout.bind(this));
    this._sock.on("data", (data) => this._stream.write(data));
    this._sock.on("connect", this._on_connect.bind(this));
    this._sock.on("close", this._on_disconnect.bind(this));
    this._sock.on("end", this._on_disconnect.bind(this));
    this._sock.on("error", this._on_error.bind(this));
  }

  /**
   * Check if server is still alive
   * @return {boolean}
   */
  alive() {
    return this._alive;
  }

  /**
   * Check if client is ready to exchange messages with server
   * @return {boolean}
   */
  ready() {
    return this._ready;
  }

  _server_info(data?: Msg) {
    if (data) {
      let serv_data = data.data as Msg;
      if (serv_data && serv_data.hasOwnProperty("version")) {
        this.guest_allowed = (serv_data.guest_allowed as boolean) || false;
        this.version = serv_data.version as Version;
        this._ready = true;
      }
    }
  }
  /**
   * Set server address
   * @param  {string} host - server host
   * @param  {integer} port - server port
   */
  set_server(host: string, port: number) {
    this._server = [host, port];
  }
  /**
   * Perfom a handshake with the HPX server
   * @category async
   * @param  {object} params - optinal params
   * @param  [params.user] {string} - username
   * @param  [params.password] {integer} - password
   * @param  [params.ignore_err] {boolean} - ignore error
   * @throws {AuthError}
   * @returns {Promise}
   */
  async handshake(
    params: Partial<{
      user: string | null;
      password: string | null;
      ignore_err: boolean;
      data: Msg;
    }>
  ) {
    let data = params.data;
    let user = params.user || null;
    let password: string | null | undefined = params.password;
    let ignore_err = params.ignore_err;

    if (this.alive()) {
      if (password === undefined) password = null;

      if (user) {
        this._last_user = user;
        this._last_pass = password;
      }
      if (!ignore_err && data) {
        let serv_error = data.error as ServerErrorMsg;
        if (serv_error) {
          if (serv_error.code === exception_codes["AuthWrongCredentialsError"])
            throw new AuthWrongCredentialsError(serv_error.msg);
          else if (serv_error.code === exception_codes["AuthRequiredError"])
            throw new AuthRequiredError(serv_error.msg);
          else if (
            serv_error.code === exception_codes["AuthMissingCredentials"]
          )
            throw new AuthMissingCredentials(serv_error.msg);
          else
            throw new AuthError(
              serv_error.code.toString() + ": " + serv_error.msg
            );
        }
      }

      if (!data) {
        let d = {} as { user: string; password: typeof password };
        if (user) {
          d.user = user;
          d.password = password;
        }
        let serv_data = await this.send_raw(
          finalize(d, undefined, this.name, undefined) as Msg
        );
        await this.handshake({ data: serv_data, ignore_err: ignore_err });
      } else if (data) {
        let serv_data = data.data;
        if (serv_data === "Authenticated") {
          this.session = data.session as string;
          this._accepted = true;
        }
      }
    }
  }
  /**
   * Basically a re-login
   * @category async
   * @param  {boolean} ignore_err - ignore error
   * @returns {Promise}
   */
  async request_auth(ignore_err?: boolean) {
    let data = await this.send([
      {
        session: "",
        name: this.name,
        data: "requestauth",
      },
    ]);
    this._server_info(data);
    await this.handshake({
      user: this._last_user,
      password: this._last_pass || undefined,
      ignore_err: ignore_err,
    });
  }
  /**
   * Check if the client is still connected to the server
   * @return {boolean}
   */
  is_connected() {
    return this.alive();
  }
  /**
   * Connect to HPX server
   * @category async
   * @param  {object} params - optional params
   * @param  [params.host] {string} - server host
   * @param  [params.port] {integer} - server port
   * @returns {Promise}
   */
  async connect(params: { host: string; port: number }) {
    params = params || {};
    let host = params.host;
    let port = params.port;
    let p = new Promise((resolve, reject) => {
      if (!this._alive && !this._connecting) {
        if (host !== undefined) {
          this._server = [host, port];
        }
        this._on_connect_promise_resolves.unshift([resolve, reject]);
        log.d(
          "Client connecting to server at: " + JSON.stringify(this._server)
        );
        this._connecting = true;
        this._sock?.connect(this._server[1], this._server[0], () => {
          this._connecting = false;
          this._alive = true;
          if (this.session) this._accepted = true;
        });
      } else resolve(false);
    });
    await p;
    return this.alive();
  }

  _on_timeout() {}

  _on_connect() {
    log.d(
      "Client successfully connected to server at: " +
        JSON.stringify(this._server)
    );
  }

  _on_error(error: Error) {
    this._connecting = false;
    log.e(error.message);
    if (this._on_connect_promise_resolves.length) {
      let proms = this._on_connect_promise_resolves.shift();
      proms?.[0](error);
    }
    this._disconnect();
  }

  _on_disconnect() {
    this._disconnect();
  }

  _disconnect() {
    this._alive = false;
    this._accepted = false;
    this.session = "";
    this._ready = false;
    this._first_message = true;
  }
  /**
   * Like {@link send_raw}, but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name
   * @category async
   * @param  {Array} msg - this is an array of Object's
   * @returns {Promise}
   * @fullfil {Object} - message from server
   */
  async send(msg: JsonArray) {
    return this._send(
      finalize(msg, this.session, this.name, undefined, {
        to_bytes: true,
        to_json: true,
      }) as Buffer
    );
  }
  /**
   * Send json-compatible Object to server. Receive json-compatible Object from server.
   *
   * Note that this method will not modify your message and expects you to add the name and session yourself. See the {@link finalize} function.
   * @category async
   * @param  {Object} msg - message to send to the server
   * @returns {Promise}
   * @fullfil {Object} - message from server
   */
  async send_raw(msg: Msg) {
    return this._send(Buffer.from(JSON.stringify(msg), encoding));
  }

  async _send(msg_bytes: Buffer) {
    let p = new Promise<ServerMsg>((resolve, reject) => {
      if (!this._alive) {
        throw new ClientError(
          "Client '" + this.name + "' is not connected to server"
        );
      }

      log.d(
        "Sending " +
          msg_bytes.length.toString() +
          " bytes to server " +
          JSON.stringify(this._server)
      );

      zlib.gzip(msg_bytes, (err, buffer) => {
        if (!err) {
          this._sock?.write(buffer);
          this._sock?.write(postfix);
        } else {
          reject(err);
        }
        this._promise_resolves.unshift([resolve, reject]);
      });
    });

    return p;
  }

  _recv(data: Buffer) {
    let parsed_data = JSON.parse(data.toString());
    if (this._first_message) {
      this._first_message = false;
      this._server_info(parsed_data);
    }

    if (this._on_connect_promise_resolves.length) {
      while (this._on_connect_promise_resolves.length) {
        let proms = this._on_connect_promise_resolves.shift();
        proms?.[0](true);
      }
      if (!this._resolved_connected_promises) {
        this._resolved_connected_promises = true;
        return;
      }
    }

    if (this._promise_resolves.length) {
      let proms = this._promise_resolves.shift();
      proms?.[0](parsed_data);
      return;
    }
  }
  /**
   * Close the connection
   */
  close() {
    log.d("Closing connection to server");
    this._disconnect();
    this._sock?.end();
  }
}
export default Client;
