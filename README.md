# happypandax-client for javascript

> A javascript client library for communicating with HappyPanda X servers

> Note: This is a nodejs module and is not meant to be able to run in a browser!

> Version`>=3.0.0` of this library does not support earlier HPX versions`<=0.13`, please use version`<3.0.0` of this library for that

## Installing

Install and update npm or yarn

```
$ yarn add happypandax-client
```

## Example

Get up and running fast:

```typescript
import Client from "happypandax-client";

const c = new Client({ name: "my-client" });
c.connect({ host: "localhost", port: 7007 }).then(function () {
  c.handshake({ user: null, password: null })
    .then(function () {
      c.send([{ fname: "get_version" }]).then(function (data) {
        console.log(data);
      });
    })
    .finally(() => c.close());
});
```

or, using _Async/Await_ syntax:

```typescript
import Client from "happypandax-client";

let c = new Client({ name: "my-client" });

async function main() {
  await c.connect({ host: "localhost", port: 7007 });
  await c.handshake({ user: null, password: null });

  let data = await c.send([{ fname: "get_version" }]);
  console.log(data);
  c.close();
}

main();
```

## API

#### Logging

```typescript
import { log } from "happypandax-client";

// Enable/disable logging
log.enabled = false;

// Custom logger
log.logger = {
  debug: console.debug,
  info: console.info,
  warning: console.warn,
  error: console.error,
};
```

#### Behaviour

Due to a [change](https://github.com/nodejs/node/issues/40702) in NodeJS v17, `localhost` might now return a IPV6 address.
To restore previous behaviour of always preferring the IPV4 address, `Client.resolve_IPV4_localhost` was added and set to `true` by default.

### Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd><p>A class representing a HappyPanda X client</p></dd>
</dl>

### Functions

<dl>
<dt><a href="#finalize">finalize(msg_dict, session_id, name, error, opts, msg_id)</a> ⇒ <code>ServerMsg</code> | <code>string</code> | <code>Buffer</code></dt>
<dd><p>A helper function that will wrap your message up like this:</p>
<pre class="prettyprint source"><code>msg = {
     'session': session_id,
     'name': name,
     'data': data, # &lt;--- your message is put here
  }
</code></pre></dd>
</dl>

<a name="Client"></a>

### Client

<p>A class representing a HappyPanda X client</p>

**Kind**: global class

- [Client](#Client)
  - [new Client(params)](#new_Client_new)
  - [.alive()](#Client+alive) ⇒ <code>boolean</code>
  - [.ready()](#Client+ready) ⇒ <code>boolean</code>
  - [.set_server(host, port)](#Client+set_server)
  - [.is_connected()](#Client+is_connected) ⇒ <code>boolean</code>
  - [.close()](#Client+close) ⇒ <code>Promise</code>
  - _async_
    - [.handshake(params)](#Client+handshake) ⇒ <code>Promise</code>
    - [.request_auth(ignore_err)](#Client+request_auth) ⇒ <code>Promise</code>
    - [.connect(params)](#Client+connect) ⇒ <code>Promise</code>
    - [.send(msg)](#Client+send) ⇒ <code>Promise</code>
    - [.send_raw(msg)](#Client+send_raw) ⇒ <code>Promise</code>

<a name="new_Client_new"></a>

#### new Client(params)

| Param               | Type                 | Default                            | Description                |
| ------------------- | -------------------- | ---------------------------------- | -------------------------- |
| params              | <code>Object</code>  |                                    | <p>optional params</p>     |
| [params.name]       | <code>string</code>  | <code>&quot;js-client&quot;</code> | <p>name of client</p>      |
| [params.host]       | <code>string</code>  |                                    | <p>server host</p>         |
| [params.port]       | <code>integer</code> |                                    | <p>server port</p>         |
| [params.user]       | <code>string</code>  |                                    | <p>username</p>            |
| [params.password]   | <code>string</code>  |                                    | <p>password</p>            |
| [params.session_id] | <code>string</code>  |                                    | <p>a server session id</p> |
| [params.timeout]    | <code>integer</code> |                                    | <p>connection timeout</p>  |

<a name="Client+alive"></a>

#### client.alive() ⇒ <code>boolean</code>

<p>Check if server is still alive</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+ready"></a>

#### client.ready() ⇒ <code>boolean</code>

<p>Check if client is ready to exchange messages with server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+set_server"></a>

#### client.set_server(host, port)

<p>Set server address</p>

**Kind**: instance method of [<code>Client</code>](#Client)

| Param | Type                 | Description        |
| ----- | -------------------- | ------------------ |
| host  | <code>string</code>  | <p>server host</p> |
| port  | <code>integer</code> | <p>server port</p> |

<a name="Client+is_connected"></a>

#### client.is_connected() ⇒ <code>boolean</code>

<p>Check if the client is still connected to the server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+close"></a>

#### client.close() ⇒ <code>Promise</code>

<p>Close the connection</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+handshake"></a>

#### client.handshake(params) ⇒ <code>Promise</code>

<p>Perfom a handshake with the HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Throws**:

- <code>AuthError</code>

| Param               | Type                 | Description           |
| ------------------- | -------------------- | --------------------- |
| params              | <code>object</code>  | <p>optinal params</p> |
| [params.user]       | <code>string</code>  | <p>username</p>       |
| [params.password]   | <code>integer</code> | <p>password</p>       |
| [params.ignore_err] | <code>boolean</code> | <p>ignore error</p>   |

<a name="Client+request_auth"></a>

#### client.request_auth(ignore_err) ⇒ <code>Promise</code>

<p>Basically a re-login</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async

| Param      | Type                 | Description         |
| ---------- | -------------------- | ------------------- |
| ignore_err | <code>boolean</code> | <p>ignore error</p> |

<a name="Client+connect"></a>

#### client.connect(params) ⇒ <code>Promise</code>

<p>Connect to HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async

| Param         | Type                 | Description            |
| ------------- | -------------------- | ---------------------- |
| params        | <code>object</code>  | <p>optional params</p> |
| [params.host] | <code>string</code>  | <p>server host</p>     |
| [params.port] | <code>integer</code> | <p>server port</p>     |

<a name="Client+send"></a>

#### client.send(msg) ⇒ <code>Promise</code>

<p>Like [send_raw](send_raw), but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Fullfil**: <code>Object</code> - message from server

| Param | Type               | Description                         |
| ----- | ------------------ | ----------------------------------- |
| msg   | <code>Array</code> | <p>this is an array of Object's</p> |

<a name="Client+send_raw"></a>

#### client.send_raw(msg) ⇒ <code>Promise</code>

<p>Send json-compatible Object to server. Receive json-compatible Object from server.</p>
<p>Note that this method will not modify your message and expects you to add the name and session yourself. See the [finalize](#finalize) function.</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Fullfil**: <code>Object</code> - message from server

| Param | Type                | Description                          |
| ----- | ------------------- | ------------------------------------ |
| msg   | <code>Object</code> | <p>message to send to the server</p> |

<a name="finalize"></a>

### finalize(msg_dict, session_id, name, error, opts, msg_id) ⇒ <code>ServerMsg</code> \| <code>string</code> \| <code>Buffer</code>

<p>A helper function that will wrap your message up like this:</p>
<pre class="prettyprint source"><code>msg = {
     'session': session_id,
     'name': name,
     'data': data, # &lt;--- your message is put here
  }
</code></pre>

**Kind**: global function

| Param | Type | Description |
PS D:\Code\happypandax\js-client> yarn docs
yarn run v1.22.10
$ jsdoc2md --configure ./jsdoc2md.json --heading-depth 4 ./src/index.ts

#### Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd><p>A class representing a HappyPanda X client</p></dd>
</dl>

#### Functions

<dl>
<dt><a href="#finalize">finalize(msg_dict, session_id, name, error, opts, msg_id)</a> ⇒ <code>ServerMsg</code> | <code>string</code> | <code>Buffer</code></dt>
<dd><p>A helper function that will wrap your message up like this:</p>
<pre class="prettyprint source"><code>msg = {
     'session': session_id,
     'name': name,
     'data': data, # &lt;--- your message is put here
  }
</code></pre></dd>
</dl>

<a name="Client"></a>

#### Client

<p>A class representing a HappyPanda X client</p>

**Kind**: global class

- [Client](#Client)
  - [new Client(params)](#new_Client_new)
  - [.alive()](#Client+alive) ⇒ <code>boolean</code>
  - [.ready()](#Client+ready) ⇒ <code>boolean</code>
  - [.set_server(host, port)](#Client+set_server)
  - [.is_connected()](#Client+is_connected) ⇒ <code>boolean</code>
  - [.close()](#Client+close) ⇒ <code>Promise</code>
  - _async_
    - [.handshake(params)](#Client+handshake) ⇒ <code>Promise</code>
    - [.request_auth(ignore_err)](#Client+request_auth) ⇒ <code>Promise</code>
    - [.connect(params)](#Client+connect) ⇒ <code>Promise</code>
    - [.send(msg)](#Client+send) ⇒ <code>Promise</code>
    - [.send_raw(msg)](#Client+send_raw) ⇒ <code>Promise</code>

<a name="new_Client_new"></a>

##### new Client(params)

| Param               | Type                 | Default                            | Description                |
| ------------------- | -------------------- | ---------------------------------- | -------------------------- |
| params              | <code>Object</code>  |                                    | <p>optional params</p>     |
| [params.name]       | <code>string</code>  | <code>&quot;js-client&quot;</code> | <p>name of client</p>      |
| [params.host]       | <code>string</code>  |                                    | <p>server host</p>         |
| [params.port]       | <code>integer</code> |                                    | <p>server port</p>         |
| [params.user]       | <code>string</code>  |                                    | <p>username</p>            |
| [params.password]   | <code>string</code>  |                                    | <p>password</p>            |
| [params.session_id] | <code>string</code>  |                                    | <p>a server session id</p> |
| [params.timeout]    | <code>integer</code> |                                    | <p>connection timeout</p>  |

<a name="Client+alive"></a>

##### client.alive() ⇒ <code>boolean</code>

<p>Check if server is still alive</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+ready"></a>

##### client.ready() ⇒ <code>boolean</code>

<p>Check if client is ready to exchange messages with server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+set_server"></a>

##### client.set_server(host, port)

<p>Set server address</p>

**Kind**: instance method of [<code>Client</code>](#Client)

| Param | Type                 | Description        |
| ----- | -------------------- | ------------------ |
| host  | <code>string</code>  | <p>server host</p> |
| port  | <code>integer</code> | <p>server port</p> |

<a name="Client+is_connected"></a>

##### client.is_connected() ⇒ <code>boolean</code>

<p>Check if the client is still connected to the server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+close"></a>

##### client.close() ⇒ <code>Promise</code>

<p>Close the connection</p>

**Kind**: instance method of [<code>Client</code>](#Client)
<a name="Client+handshake"></a>

##### client.handshake(params) ⇒ <code>Promise</code>

<p>Perfom a handshake with the HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Throws**:

- <code>AuthError</code>

| Param               | Type                 | Description           |
| ------------------- | -------------------- | --------------------- |
| params              | <code>object</code>  | <p>optinal params</p> |
| [params.user]       | <code>string</code>  | <p>username</p>       |
| [params.password]   | <code>integer</code> | <p>password</p>       |
| [params.ignore_err] | <code>boolean</code> | <p>ignore error</p>   |

<a name="Client+request_auth"></a>

##### client.request_auth(ignore_err) ⇒ <code>Promise</code>

<p>Basically a re-login</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async

| Param      | Type                 | Description         |
| ---------- | -------------------- | ------------------- |
| ignore_err | <code>boolean</code> | <p>ignore error</p> |

<a name="Client+connect"></a>

##### client.connect(params) ⇒ <code>Promise</code>

<p>Connect to HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async

| Param         | Type                 | Description            |
| ------------- | -------------------- | ---------------------- |
| params        | <code>object</code>  | <p>optional params</p> |
| [params.host] | <code>string</code>  | <p>server host</p>     |
| [params.port] | <code>integer</code> | <p>server port</p>     |

<a name="Client+send"></a>

##### client.send(msg) ⇒ <code>Promise</code>

<p>Like [send_raw](send_raw), but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Fullfil**: <code>Object</code> - message from server

| Param | Type               | Description                         |
| ----- | ------------------ | ----------------------------------- |
| msg   | <code>Array</code> | <p>this is an array of Object's</p> |

<a name="Client+send_raw"></a>

##### client.send_raw(msg) ⇒ <code>Promise</code>

<p>Send json-compatible Object to server. Receive json-compatible Object from server.</p>
<p>Note that this method will not modify your message and expects you to add the name and session yourself. See the [finalize](#finalize) function.</p>

**Kind**: instance method of [<code>Client</code>](#Client)
**Category**: async
**Fullfil**: <code>Object</code> - message from server

| Param | Type                | Description                          |
| ----- | ------------------- | ------------------------------------ |
| msg   | <code>Object</code> | <p>message to send to the server</p> |

<a name="finalize"></a>

#### finalize(msg_dict, session_id, name, error, opts, msg_id) ⇒ <code>ServerMsg</code> \| <code>string</code> \| <code>Buffer</code>

<p>A helper function that will wrap your message up like this:</p>
<pre class="prettyprint source"><code>msg = {
     'session': session_id,
     'name': name,
     'data': data, # &lt;--- your message is put here
  }
</code></pre>

**Kind**: global function

| Param           | Type                     | Description                                                 |
| --------------- | ------------------------ | ----------------------------------------------------------- |
| msg_dict        | <code>AnyJson</code>     | <p>message to wrap</p>                                      |
| session_id      | <code>string</code>      | <p>optional, session id</p>                                 |
| name            | <code>string</code>      | <p>name of client</p>                                       |
| error           | <code>ServerError</code> | <p>error message object to include in the final message</p> |
| opts            | <code>Object</code>      | <p>optional options</p>                                     |
| [opts.to_json]  | <code>boolean</code>     | <p>convert the final message to json string</p>             |
| [opts.to_bytes] | <code>boolean</code>     | <p>convert the final message to bytes buffer</p>            |
| msg_id          | <code>AnyJson</code>     | <p>optional message id</p>                                  |

**These are all the exceptions that can be raised by the client:**

#### ServerError(Error)

Base server error

#### AuthError(ServerError)

Base authentication error

#### AuthWrongCredentialsError(AuthError)

#### AuthRequiredError(AuthError)

#### AuthMissingCredentials(AuthError)

#### ClientError(ServerError)

Errors originating from the client

#### ConnectionError(ClientError)

#### ServerDisconnectError(ConnectionError)
