# happypandax-client for javascript
> A javascript client library for communicating with HappyPanda X servers

> Note: This is a nodejs module and is not meant to be able to run in a browser!

## Installing

Install and update npm or yarn

```
$ yarn add happypandax-client
```

## Example

Get up and running fast:

```typescript
import Client from 'happypandax-client'

const c = new Client({name: "my-client"})
c.connect({host:"localhost", port:7007})
    .then(function() { c.handshake({user:null, password:null})
    .then(function() { c.send([{fname:"get_version"}])
    .then(function(data) {
            console.log(data)
        })
    })
})
```

or, using *Async/Await* syntax:

```javascript
hpxclient = require('happypandax-client')

let c = new hpxclient.Client("my-client")

async function main() {
    await c.connect({host:"localhost", port:7007})
    await c.handshake({user:null, password:null})

    let data = await c.send([{fname:"get_version"}])
    console.log(data)
    console.log(data.data[0].data)
}

main()
```

## API
### Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd><p>A class representing a HappyPanda X client</p>
</dd>
</dl>

### Functions

<dl>
<dt><a href="#finalize">finalize(msg_dict, session_id, name, error, opts)</a> ⇒ <code>Object</code> | <code>string</code> | <code>Buffer</code></dt>
<dd><p>A helper function that will wrap your message up like this:</p>
<pre><code>msg = {
     &#39;session&#39;: session_id,
     &#39;name&#39;: name,
     &#39;data&#39;: data, # &lt;--- your message is put here
  }</code></pre></dd>
</dl>

<a name="Client"></a>

### Client
A class representing a HappyPanda X client

**Kind**: global class  

* [Client](#Client)
    * [new Client(params)](#new_Client_new)
    * [.alive()](#Client+alive) ⇒ <code>boolean</code>
    * [.ready()](#Client+ready) ⇒ <code>boolean</code>
    * [.set_server(host, port)](#Client+set_server)
    * [.is_connected()](#Client+is_connected) ⇒ <code>boolean</code>
    * [.close()](#Client+close)
    * _async_
        * [.handshake(params)](#Client+handshake) ⇒ <code>Promise</code>
        * [.request_auth(ignore_err)](#Client+request_auth) ⇒ <code>Promise</code>
        * [.connect(params)](#Client+connect) ⇒ <code>Promise</code>
        * [.send(msg)](#Client+send) ⇒ <code>Promise</code>
        * [.send_raw(msg)](#Client+send_raw) ⇒ <code>Promise</code>

<a name="new_Client_new"></a>

#### new Client(params)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| params | <code>Object</code> |  | optional params |
| [params.name] | <code>string</code> | <code>&quot;js-client&quot;</code> | name of client |
| [params.host] | <code>string</code> |  | server host |
| [params.port] | <code>integer</code> |  | server port |
| [params.session_id] | <code>string</code> |  | a server session id |
| [params.timeout] | <code>integer</code> |  | connection timeout |

<a name="Client+alive"></a>

#### client.alive() ⇒ <code>boolean</code>
Check if server is still alive

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+ready"></a>

#### client.ready() ⇒ <code>boolean</code>
Check if client is ready to exchange messages with server

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+set_server"></a>

#### client.set\_server(host, port)
Set server address

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| host | <code>string</code> | server host |
| port | <code>integer</code> | server port |

<a name="Client+is_connected"></a>

#### client.is\_connected() ⇒ <code>boolean</code>
Check if the client is still connected to the server

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+close"></a>

#### client.close()
Close the connection

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+handshake"></a>

#### client.handshake(params) ⇒ <code>Promise</code>
Perfom a handshake with the HPX server

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Throws**:

- <code>AuthError</code> 


| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | optinal params |
| [params.user] | <code>string</code> | username |
| [params.password] | <code>integer</code> | password |
| [params.ignore_err] | <code>boolean</code> | ignore error |

<a name="Client+request_auth"></a>

#### client.request\_auth(ignore_err) ⇒ <code>Promise</code>
Basically a re-login

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  

| Param | Type | Description |
| --- | --- | --- |
| ignore_err | <code>boolean</code> | ignore error |

<a name="Client+connect"></a>

#### client.connect(params) ⇒ <code>Promise</code>
Connect to HPX server

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | optional params |
| [params.host] | <code>string</code> | server host |
| [params.port] | <code>integer</code> | server port |

<a name="Client+send"></a>

#### client.send(msg) ⇒ <code>Promise</code>
Like [send_raw](send_raw), but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Fullfil**: <code>Object</code> - message from server  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | this is an array of Object's |

<a name="Client+send_raw"></a>

#### client.send\_raw(msg) ⇒ <code>Promise</code>
Send json-compatible Object to server. Receive json-compatible Object from server.

Note that this method will not modify your message and expects you to add the name and session yourself. See the [finalize](#finalize) function.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Fullfil**: <code>Object</code> - message from server  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Object</code> | message to send to the server |

<a name="finalize"></a>

### finalize(msg_dict, session_id, name, error, opts) ⇒ <code>Object</code> \| <code>string</code> \| <code>Buffer</code>
A helper function that will wrap your message up like this:
```
msg = {
     'session': session_id,
     'name': name,
     'data': data, # <--- your message is put here
  }
```

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg_dict | <code>Object</code> | message to wrap |
| session_id | <code>string</code> | optional, session id |
| name | <code>string</code> | name of client |
| error | <code>Object</code> | error message object to include in the final message |
| opts | <code>Object</code> | optional options |
| [opts.to_json] | <code>boolean</code> | convert the final message to json string |
| [opts.to_bytes] | <code>boolean</code> | convert the final message to bytes buffer |

---------------------------------------------------------------

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
