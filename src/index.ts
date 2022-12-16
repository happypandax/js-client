import * as net from 'net';
import { Transform, TransformOptions } from 'stream';

import { Decoder, Encoder } from '@msgpack/msgpack';

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

export interface CustomLogger {
  debug: (m: string) => void;
  info: (m: string) => void;
  warning: (m: string) => void;
  error: (m: string) => void;
}

export const log = {
  enabled: true,
  logger: (undefined as any) as CustomLogger,
  d: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.debug(msg) : console.debug(msg);
  },
  i: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.debug(msg) : console.info(msg);
  },
  w: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.debug(msg) : console.warn(msg);
  },
  e: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.debug(msg) : console.error(msg);
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

export class ServerError extends EError { }
export class AuthError extends ServerError { }
export class AuthWrongCredentialsError extends AuthError { }
export class AuthRequiredError extends AuthError { }
export class AuthMissingCredentials extends AuthError { }
export class ClientError extends ServerError { }
export class TimoutError extends ClientError { }
export class ConnectionError extends ClientError { }
export class ServerDisconnectError extends ConnectionError { }

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {
  [key: string]: AnyJson;
}
export interface JsonArray extends Array<AnyJson> { }

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
 * @param  {AnyJson} msg_dict - message to wrap
 * @param  {string} session_id - optional, session id
 * @param  {string} name - name of client
 * @param  {ServerError} error - error message object to include in the final message
 * @param  {Object} opts - optional options
 * @param  [opts.to_json] {boolean} - convert the final message to json string
 * @param  [opts.to_bytes] {boolean} - convert the final message to bytes buffer
 * @param  {AnyJson} msg_id - optional message id
 * @return {ServerMsg|string|Buffer}
 */
export function finalize(
  msg_dict: AnyJson,
  session_id?: string | null,
  name?: string,
  error?: ServerErrorMsg,
  msg_id?: AnyJson
) {
  session_id = session_id || "";

  let msg = {
    __id__: msg_id,
    session: session_id,
    name: name ? name : "js-client",
    data: msg_dict,
  } as ServerMsg;

  if (error) msg.error = error;

  return msg;
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
    let remaining_buffer = buffer;
    let idx = buffer.indexOf(postfix);
    let eof = false;
    let data = Buffer.from("", encoding);
    if (idx !== -1) {
      data = buffer.slice(0, idx);
      remaining_buffer = buffer.slice(idx + postfix.length);
      eof = true;
    }

    return { data, remaining_buffer, eof };
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

    let eof = true;

    while (eof && err == null) {
      const { data, remaining_buffer, eof: eof_ } = this._end_of_msg(
        this._buffer
      );
      eof = eof_;
      this._buffer = remaining_buffer;

      if (eof && data.length) {
        this.push(data);
      }
    }

    callback(err);
  }
}

type Version = {
  core: [number, number, number];
  db: [number, number, number];
  torrent: [number, number, number];
};

export type ServerErrorMsg = { code: number; msg: string };
export type ServerMsg = {
  __id__?: string | number;
  session: string;
  name: string;
  data: AnyJson;
  error?: ServerErrorMsg;
};
export type ServerFunctionMsg = {
  fname: string;
  data: AnyJson;
  error?: ServerErrorMsg;
};

/**
 * A class representing a HappyPanda X client
 */
export class Client {
  public name: string;

  /**
   * Whether to resolve localhost to IPv4 (default: true), see https://github.com/nodejs/node/issues/40702
   */
  public resolve_IPV4_localhost: boolean;
  public version: Version | null;
  public guest_allowed: boolean;
  public session: string;

  _id_counter: number;
  _alive: boolean;
  _disconnected: boolean;
  _ready: boolean;
  _server: [string, number];
  _accepted: boolean;
  _last_user: string | null;
  _last_pass: string | null;
  _stream: HPXTransform;
  _timeout: number;
  _sock: net.Socket | null;
  _encoder: Encoder;
  _decoder: Decoder;
  _connecting: boolean;
  __data_promises_order: (string | number)[];
  __data_promises: {
    [k: string]: [resolve: (v?: any) => void, reject: (v: any) => void];
  };

  /**
   * @param  {Object} params - optional params
   * @param  [params.name=js-client] {string} - name of client
   * @param  [params.host] {string} - server host
   * @param  [params.port] {integer} - server port
   * @param  [params.user] {string} - username
   * @param  [params.password] {string} - password
   * @param  [params.session_id] {string} - a server session id
   * @param  [params.timeout] {integer} - connection timeout
   */
  constructor({
    name,
    host,
    port,
    session_id,
    timeout,
    user,
    password,
  }: Partial<{
    name: string;
    host: string;
    user: string | null;
    password: string | null;
    port: number;
    session_id: string;
    timeout: number;
  }>) {
    this.name = name || "js-client";
    this._server = [host || "localhost", port || 7007]; // [host, port]
    this._alive = false;
    this._disconnected = false; // specifically used by _on_disconnect
    this._ready = false;
    this.session = session_id || "";
    this.resolve_IPV4_localhost = true; // see https://github.com/nodejs/node/issues/40702
    this.version = null;
    this.guest_allowed = false;
    this._accepted = false;
    this._id_counter = 0;

    this._last_user = user ?? "";
    this._last_pass = password ?? "";

    this._stream = new HPXTransform(this.name, {
      defaultEncoding: encoding,
    });
    this._stream.on("data", this._recv.bind(this));

    this._timeout = timeout || 5000;
    this._sock = null;
    // lol
    this._encoder = new Encoder(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    this._decoder = new Decoder();

    this.__data_promises = {};
    this.__data_promises_order = [];
    this._connecting = false;
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

  get timeout() {
    return this._timeout;
  }

  set timeout(t: number) {
    this._timeout = t;
    this._sock?.setTimeout(this._timeout);
  }

  get _connect_msg_id() {
    return this.name + "_connect";
  }

  get _close_msg_id() {
    return this.name + "_close";
  }

  _next_id() {
    this._id_counter = (this._id_counter + 1) % 99999;
    return this.name + "_msg_" + this._id_counter;
  }

  _add_data_promise(
    msg_id: string | number,
    resolve: (v: any) => void,
    reject: (v: any) => void
  ) {
    this.__data_promises[msg_id] = [resolve, reject];
    this.__data_promises_order.push(msg_id);
  }

  _get_data_promise(msg_id: string | number | undefined) {
    if (!msg_id) return;
    const v = this.__data_promises[msg_id];
    if (v) {
      delete this.__data_promises[msg_id];
      const idx = this.__data_promises_order.indexOf(msg_id);
      if (idx > -1) {
        this.__data_promises_order.splice(idx, 1);
      }
    }
    return v;
  }

  _get_earliest_data_promise() {
    const msg_id = this.__data_promises_order.shift();
    if (msg_id) {
      const v = this.__data_promises[msg_id];
      if (v) {
        delete this.__data_promises[msg_id];
      }
      return v;
    }
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
    }>
  ) {
    let user = params.user;
    let password = params.password;

    if (user === undefined) {
      user = this._last_user;
      password = this._last_pass;
    }

    let ignore_err = params.ignore_err;

    if (this.alive()) {
      if (password === undefined) password = null;

      if (user) {
        this._last_user = user;
        this._last_pass = password;
      }

      let d = {} as { user: string; password: typeof password };
      if (user) {
        d.user = user;
        d.password = password;
      }

      log.d(
        `Client '${this.name}' handshaking server at ${JSON.stringify(
          this._server
        )}`
      );

      let data = await this.send_raw(
        finalize(d, undefined, this.name, undefined) as ServerMsg
      );

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

      let serv_data = data.data;
      if (serv_data === "Authenticated") {
        this.session = data.session as string;
        this._accepted = true;
        return true;
      }
    }

    return false;
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
  async connect(params?: { host?: string; port?: number }) {
    let host = params?.host;
    let port = params?.port;
    let p = new Promise<undefined | JsonMap>((resolve, reject) => {
      if (!this._alive && !this._connecting) {
        if (host !== undefined && port !== undefined) {
          this._server = [host, port];
        }
        log.d(
          `Client '${this.name}' connecting to server at: ${JSON.stringify(
            this._server
          )}`
        );
        this._connecting = true;
        this._disconnected = false;
        this._add_data_promise(this._connect_msg_id, resolve, reject);
        let h = this._server[0];
        if (this.resolve_IPV4_localhost) {
          if (h === "localhost") h = "127.0.0.1";
        }
        this._sock?.connect(this._server[1], h, () => {
          this._connecting = false;
          this._alive = true;
        });
      } else
        reject(
          Error(`Client '${this.name}' already connected or trying to connect`)
        );
    });
    return p;
  }

  _on_timeout() {
    const err = new TimoutError("timeout");
    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      return connect_p[1](err);
    }

    const p = this._get_earliest_data_promise();
    if (p) {
      return p[1](err);
    }
  }

  _on_connect() {
    log.d(
      `Client '${this.name
      }' successfully connected to server at: ${JSON.stringify(this._server)}`
    );
  }

  _on_error(error: Error) {
    this._connecting = false;
    log.e(`An error occured in client '${this.name}': ${error.message}`);
    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      return connect_p[1](error);
    }

    const p = this._get_earliest_data_promise();
    if (p) {
      return p[1](error);
    }

    this._disconnect();
  }

  _on_disconnect() {
    if (this._disconnected) {
      return;
    }
    this._disconnected = true;
    log.d(
      `Client '${this.name}' disconnected from server at: ${JSON.stringify(
        this._server
      )}`
    );
    this._disconnect();
    const p = this._get_data_promise(this._close_msg_id);
    if (p) {
      p[0]();
    }
  }

  _disconnect() {
    this._alive = false;
    this._accepted = false;
    this.session = "";
    this._ready = false;
  }
  /**
   * Like {@link send_raw}, but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name
   * @category async
   * @param  {Array} msg - this is an array of Object's
   * @returns {Promise}
   * @fullfil {Object} - message from server
   */
  async send(msg: JsonArray) {
    const msg_id = this._next_id();
    return this._send(
      finalize(msg, this.session, this.name, undefined, msg_id),
      msg_id
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
  async send_raw(msg: ServerMsg) {
    if (!msg.__id__) {
      msg.__id__ = this._next_id();
    }
    return this._send(msg, msg.__id__);
  }

  async _send(msg_bytes: unknown, msg_id: string | number) {
    let p = new Promise<ServerMsg>((resolve, reject) => {
      if (!this._alive) {
        return reject(
          new ClientError(`Client '${this.name}' is not connected to server`)
        );
      }

      try {
        const d = this._encoder.encode(msg_bytes);
        this._sock?.write(d);
        this._sock?.write(postfix);
        this._add_data_promise(msg_id, resolve, reject);

        log.d(
          `Client '${this.name
          }' sending ${d.length.toString()} bytes to server ${JSON.stringify(
            this._server
          )}`
        );
      } catch (err) {
        reject(err);
      }
    });

    return p;
  }

  _recv(data: Buffer) {
    log.d(
      `Client '${this.name
      }' recieved ${data.length.toString()} bytes from server`
    );

    if (!this._alive) {
      return;
    }

    let err: unknown | undefined;
    let parsed_data: ServerMsg | undefined;

    try {
      parsed_data = this._decoder.decode(data) as ServerMsg;
    } catch (e) {
      err = e;
    }

    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      if (err) {
        return connect_p[1](err);
      }

      this._server_info(parsed_data);
      return connect_p[0](parsed_data);
    }

    if (parsed_data) {
      const p = this._get_data_promise(parsed_data.__id__);
      if (p) {
        return p[0](parsed_data);
      }
    } else if (err) {
      const p = this._get_earliest_data_promise();
      if (p) {
        return p[1](err);
      }
    }
  }
  /**
   * Close the connection
   * @returns {Promise}
   */
  async close() {
    log.d(`Client '${this.name}' closing connection to server`);
    this._disconnect();
    return new Promise<void>((resolve, reject) => {
      this._add_data_promise(this._close_msg_id, resolve, reject);
      this._sock?.end();
    });
  }
}
export default Client;
