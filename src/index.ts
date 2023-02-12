import * as net from 'net';
import { Transform, TransformOptions } from 'stream';
import { CustomError } from 'ts-custom-error';

import { Decoder, Encoder } from '@msgpack/msgpack';

const encoding = "utf8";

const postfix = Buffer.from("<EOF>", encoding);

export const exception_codes = {
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

/**
 * The logger
 * @group Logging
 */
export const log = {
  /**
   * Enable or disable logging
   */
  enabled: true,

  /**
   * Can be set to a custom logger that will be used instead of console
   */
  logger: undefined as any as CustomLogger,

  d: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.debug(msg) : console.debug(msg);
  },
  i: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.info(msg) : console.info(msg);
  },
  w: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.warning(msg) : console.warn(msg);
  },
  e: function (msg: string) {
    if (!this.enabled) return;
    this.logger ? this.logger.error(msg) : console.error(msg);
  },
};

class EError extends CustomError {
  code: number;

  constructor(message: string) {
    super(message);
    this.code = exception_codes[this.name as keyof typeof exception_codes];
    Object.defineProperty(this, "name", { value: "EError" });
  }
}

/**
 * Base class for all server errors
 * @extends Error
 * @category Errors
 */
export class ServerError extends EError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "ServerError" });
  }
}

/**
 * Base class for all authentication errors
 * @extends ServerError
 * @category Errors
 */
export class AuthError extends ServerError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "AuthError" });
  }
}

/**
 * Wrong credentials error
 * @extends AuthError
 * @category Errors
 */
export class AuthWrongCredentialsError extends AuthError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "AuthWrongCredentialsError" });
  }
}

/**
 * Authentication required error
 * @extends AuthError
 * @category Errors
 */
export class AuthRequiredError extends AuthError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "AuthRequiredError" });
  }
}

/**
 * Missing credentials error
 * @extends AuthError
 * @category Errors
 */
export class AuthMissingCredentials extends AuthError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "AuthMissingCredentials" });
  }
}

/**
 * Base class for all client errors
 * @extends ServerError
 * @category Errors
 */
export class ClientError extends ServerError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "ClientError" });
  }
}

/**
 * Timeout error
 * @extends ClientError
 * @category Errors
 */
export class TimeoutError extends ClientError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "TimoutError" });
  }
}

/**
 * Base class for all connection errors
 * @extends ClientError
 * @category Errors
 */
export class ConnectionError extends ClientError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: "ConnectionError" });
  }
}

/**
 * Server disconnect error
 * @extends ConnectionError
 * @category Errors
 */
export class ServerDisconnectError extends ConnectionError { }

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;

export type JsonMap = {
  [key: string]: AnyJson;
}
export type JsonArray = AnyJson[];

export type Msg = JsonMap;

// See https://github.com/microsoft/TypeScript/issues/1897#issuecomment-424163618
export type JsonMapCompatible<TKeys extends string = string> = { [Key in TKeys]: AnyJson };

export type ServerCommand =
  | "handshake"
  | "call"
  | "requestauth"
  | "dropauth"
  | "serverquit"
  | "serverrestart"
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

/**
 * A helper function that will wrap your message up like this:
 * ```
 * msg = {
 *      'session': session_id,
 *      'name': name,
 *      'command': command, <--- your command is put here
 *      'data': data, # <--- your message is put here
 *   }
 * ```
 * @param  {ServerCommand} command - message to wrap
 * @param  {AnyJson} data - message to wrap
 * @param  {string} session_id - optional, session id
 * @param  {string} name - name of client
 * @param  {AnyJson} msg_id - optional message id
 * @return {ServerMsg}
 */
export function finalize<C extends ServerCommand>(
  command: C,
  data: ClientMsg<C>["data"],
  session_id?: string | null,
  name?: string,
  msg_id?: ClientMsg<C>["__id__"]
) {
  session_id = session_id || "";

  let msg: ClientMsg<C> = {
    __id__: msg_id,
    command,
    session: session_id,
    name: name ? name : "js-client",
    data,
  };

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
      const {
        data,
        remaining_buffer,
        eof: eof_,
      } = this._end_of_msg(this._buffer);
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

export interface ClientMsgBase<D = AnyJson> {
  __id__?: string | number;
  session: string;
  command: ServerCommand | AnyJson;
  name: string;
  data?: D;
}

export interface ClientMsg<C extends ServerCommand = "call"> extends ClientMsgBase {
  command: C;
  data: C extends "call"
  ? ClientFunctionMsg[]
  : C extends "handshake"
  ? { username: string; password: string } | {} | undefined
  : AnyJson;
}

type ServerInfo = { version: Version; guest_allowed: boolean }

export interface ServerMsgBase<D = AnyJson> {
  __id__?: string | number;
  session: string;
  name: string;
  data: D;
  error?: ServerErrorMsg;
}

export interface ServerMsg<C extends ServerCommand> extends ServerMsgBase {
  data: C extends "call"
  ? ServerFunctionMsg[]
  : C extends "handshake"
  ? "Authenticated" | null
  : C extends "requestauth" | "dropauth"
  ? ServerInfo | null
  : C extends "serverquit" | "serverrestart"
  ? "ok" | null
  : AnyJson;
}

export type ServerFunctionMsg = {
  fname: string;
  data: AnyJson;
  error?: ServerErrorMsg;
};

export type ClientFunctionMsg = {
  fname: string;
  [arg: string]: AnyJson;
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

  private _id_counter: number;
  private _alive: boolean;
  private _disconnected: boolean;
  private _ready: boolean;
  private _server: [string, number];
  private _last_user: string | null;
  private _last_pass: string | null;
  private _stream: HPXTransform;
  private _timeout: number;
  private _sock: net.Socket | null;
  private _encoder: Encoder;
  private _decoder: Decoder;
  private _connecting: boolean;
  private __data_promises_order: (string | number)[];
  private __data_promises: {
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

  private _create_socket() {
    this._sock = new net.Socket();
    this._sock.setTimeout(this.timeout, this._on_timeout.bind(this));
    this._sock.on("data", (data) => this._stream.write(data));
    this._sock.on("connect", this._on_connect.bind(this));
    this._sock.on("close", this._on_disconnect.bind(this));
    this._sock.on("end", this._on_disconnect.bind(this));
    this._sock.on("error", this._on_error.bind(this));
  }

  /**
   *  Add a listener to the underlying socket
   * @param  {string} event - event name
   * @param  {Function} listener - listener function
   * @return {Client}
   */
  on(...args: Parameters<net.Socket["on"]>) {
    this._sock?.on(...args);
    return this;
  }

  /**
   * Add a listener to the underlying socket
   * @param  {string} event - event name
   * @param  {Function} listener - listener function
   * @return {Client}
   */
  once(...args: Parameters<net.Socket["once"]>) {
    this._sock?.once(...args);
    return this;
  }

  /**
   * Remove a listener from the underlying socket
   * @param  {string} event - event name
   * @param  {Function} listener - listener function
   * @return {Client}
   */
  off(...args: Parameters<net.Socket["off"]>) {
    this._sock?.off(...args);
    return this;
  }

  /**
   * Check if server is still alive
   * @return {boolean}
   */
  alive() {
    return this._alive && !this._sock?.destroyed;
  }

  /**
   * Check if client is ready to exchange messages with server
   * @return {boolean}
   */
  ready() {
    return this._ready;
  }

  /**
   * Get the timeout value
   * @return {number}
   */
  get timeout() {
    return this._timeout;
  }

  set timeout(t: number) {
    this._timeout = t;
    this._sock?.setTimeout(this._timeout, this._on_timeout.bind(this));
  }

  private get _connect_msg_id() {
    return this.name + "_connect";
  }

  private get _close_msg_id() {
    return this.name + "_close";
  }

  private _next_id() {
    this._id_counter = (this._id_counter + 1) % 99999;
    return this.name + "_msg_" + this._id_counter;
  }

  private _add_data_promise(
    msg_id: string | number,
    resolve: (v: any) => void,
    reject: (v: any) => void
  ) {
    this.__data_promises[msg_id] = [resolve, reject];
    this.__data_promises_order.push(msg_id);
  }

  private _get_data_promise(msg_id: string | number | undefined) {
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

  private _get_earliest_data_promise() {
    const msg_id = this.__data_promises_order.shift();
    if (msg_id) {
      const v = this.__data_promises[msg_id];
      if (v) {
        delete this.__data_promises[msg_id];
      }
      return v;
    }
  }

  private _server_info(msg?: ServerMsgBase<ServerInfo | null>) {
    if (msg) {
      let serv_data = msg?.data;
      if (serv_data && serv_data?.version) {
        this.guest_allowed = serv_data.guest_allowed || false;
        this.version = serv_data.version;
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
        finalize("handshake", d, undefined, this.name)
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
        return true;
      }
    }

    return false;
  }

  /**
   * Forces client to request a new handshake, but doesn't invalidate previous session
   * @category async
   * @returns {Promise}
   */
  async request_auth() {
    let data = await this.send_raw(finalize("requestauth", null, undefined, this.name));

    this._server_info(data);
    this.session = "";
  }

  /**
   * Logout and invalidates the session
   * @category async
   * @returns {Promise}
   */
  async drop_auth() {
    let data = await this.send_raw(finalize("dropauth", null, this.session, this.name));
    this._server_info(data);
    this.session = "";
  }

  /**
   * Send the serverquit command
   * @category async
   * @returns {Promise}
   */
  async server_quit() {
    return await this.send_raw(finalize("serverquit", null, this.session, this.name));
  }

  /**
   * Send the serverrestart command
   * @category async
   * @returns {Promise}
   */
  async server_restart() {
    return await this.send_raw(finalize("serverrestart", null, this.session, this.name));
  }

  /**
   * Call a single function, this is even more of a shortcut than send
   * @category async
   * @param  {ClientMsg<'call'>['data']} data - data
   * @returns {Promise}
   */
  async call(data: ClientMsg<'call'>['data']) {
    return await this.send('call', data);
  }

  /**
   * Call a single function, this is even more of a shortcut than send
   * @category async
   * @param  {string} fname - function name
   * @param  [args] {object} - function arguments
   * @returns {Promise}
   */
  async call_function(fname: string, args?: Record<string, AnyJson>) {
    return await this.send('call', [{ fname, ...args }]);
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
    let p = new Promise<undefined | ServerMsgBase<ServerInfo>>((resolve, reject) => {
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
        if (this._sock?.destroyed) {
          this._create_socket();
        }
        this._sock?.connect(this._server[1], h);
      } else
        reject(
          Error(`Client '${this.name}' already connected or trying to connect`)
        );
    });
    return p;
  }

  private _on_timeout() {
    this._connecting = false;
    const err = new TimeoutError("timeout");

    if (!this._ready) {
      this._disconnect();
      this._sock?.destroy(err);
    }

    log.e(`Client '${this.name}' timed out after ${this.timeout}ms`);

    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      return connect_p[1](err);
    }

    const close_p = this._get_data_promise(this._close_msg_id);
    if (close_p) {
      return close_p[1](err);
    }

    const p = this._get_earliest_data_promise();
    if (p) {
      return p[1](err);
    }
  }

  private _on_connect() {
    this._connecting = false;
    this._alive = true;

    log.d(
      `Client '${this.name
      }' successfully connected to server at: ${JSON.stringify(this._server)}`
    );
  }

  private _on_error(error: Error) {
    this._connecting = false;
    this._disconnect();

    log.e(`An error occured in client '${this.name}': ${error.message}`);
    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      return connect_p[1](error);
    }

    const p = this._get_earliest_data_promise();
    if (p) {
      return p[1](error);
    }
  }

  private _on_disconnect() {
    if (this._disconnected) {
      return;
    }
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

  private _disconnect() {
    this._alive = false;
    this._disconnected = true;
    this.session = "";
    this._ready = false;
  }
  /**
   * Like {@link send_raw}, but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name
   * @category async
   * @param  {JsonMap} data - the data part of the message
   * @param  {ServerCommand} command - the command, defaults to 'call'
   * @returns {Promise}
   * @fullfil {Object} - message from server
   */
  async send<C extends ServerCommand>(command: C, data: ClientMsg<C>["data"]) {
    const msg_id = this._next_id();
    return this._send<C>(
      finalize(command, data, this.session, this.name, msg_id),
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
  async send_raw<C extends ServerCommand>(msg: ClientMsg<C>) {
    if (!msg.__id__) {
      msg.__id__ = this._next_id();
    }
    return this._send<C>(msg, msg.__id__);
  }

  private async _send<C extends ServerCommand>(msg_bytes: unknown, msg_id: string | number) {
    let p = new Promise<ServerMsg<C>>((resolve, reject) => {
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

  private _recv(data: Buffer) {
    log.d(
      `Client '${this.name
      }' recieved ${data.length.toString()} bytes from server`
    );

    if (!this._alive) {
      return;
    }

    let err: unknown | undefined;
    let parsed_data: ServerMsg<any> | undefined;

    try {
      parsed_data = this._decoder.decode(data) as ServerMsg<any>;
    } catch (e) {
      err = e;
    }

    const connect_p = this._get_data_promise(this._connect_msg_id);
    if (connect_p) {
      if (err) {
        return connect_p[1](err);
      }

      this._server_info(parsed_data as ServerMsgBase<ServerInfo>);
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
      this._sock?.end(() => {
        setTimeout(() => {
          if (!this._disconnected) {
            this._sock?.destroy();
            this._on_disconnect();
          }
          const p = this._get_data_promise(this._close_msg_id);
          if (p) {
            return p[0]();
          }
        }, 1000);
      });
    });
  }
}
export default Client;
