yarn run v1.22.17
$ jsdoc2md --separators --configure ./jsdoc2md.json --heading-depth 3 ./src/index.ts
### Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd><p>A class representing a HappyPanda X client</p></dd>
<dt><a href="#ServerError">ServerError</a> ⇐ <code>Error</code></dt>
<dd><p>Base class for all server errors</p></dd>
</dl>

### Members

<dl>
<dt><a href="#ServerError">ServerError</a> ⇐ <code><a href="#ServerError">ServerError</a></code></dt>
<dd><p>Base class for all authentication errors</p></dd>
<dt><a href="#AuthError">AuthError</a> ⇐ <code><a href="#AuthError">AuthError</a></code></dt>
<dd><p>Wrong credentials error</p></dd>
<dt><a href="#AuthWrongCredentialsError">AuthWrongCredentialsError</a> ⇐ <code><a href="#AuthError">AuthError</a></code></dt>
<dd><p>Authentication required error</p></dd>
<dt><a href="#AuthRequiredError">AuthRequiredError</a> ⇐ <code><a href="#AuthError">AuthError</a></code></dt>
<dd><p>Missing credentials error</p></dd>
<dt><a href="#AuthMissingCredentials">AuthMissingCredentials</a> ⇐ <code><a href="#ServerError">ServerError</a></code></dt>
<dd><p>Base class for all client errors</p></dd>
<dt><a href="#ClientError">ClientError</a> ⇐ <code><a href="#ClientError">ClientError</a></code></dt>
<dd><p>Timeout error</p></dd>
<dt><a href="#TimoutError">TimoutError</a> ⇐ <code><a href="#ClientError">ClientError</a></code></dt>
<dd><p>Base class for all connection errors</p></dd>
<dt><a href="#ConnectionError">ConnectionError</a> ⇐ <code><a href="#ConnectionError">ConnectionError</a></code></dt>
<dd><p>Server disconnect error</p></dd>
</dl>

### Constants

<dl>
<dt><a href="#log">log</a></dt>
<dd><p>The logger</p></dd>
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

* [Client](#Client)
    * [new Client(params)](#new_Client_new)
    * [.alive()](#Client+alive) ⇒ <code>boolean</code>
    * [.ready()](#Client+ready) ⇒ <code>boolean</code>
    * [.set_server(host, port)](#Client+set_server)
    * [.is_connected()](#Client+is_connected) ⇒ <code>boolean</code>
    * [.close()](#Client+close) ⇒ <code>Promise</code>
    * _async_
        * [.handshake(params)](#Client+handshake) ⇒ <code>Promise</code>
        * [.request_auth(ignore_err)](#Client+request_auth) ⇒ <code>Promise</code>
        * [.connect(params)](#Client+connect) ⇒ <code>Promise</code>
        * [.send(msg)](#Client+send) ⇒ <code>Promise</code>
        * [.send_raw(msg)](#Client+send_raw) ⇒ <code>Promise</code>


* * *

<a name="new_Client_new"></a>

#### new Client(params)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| params | <code>Object</code> |  | <p>optional params</p> |
| [params.name] | <code>string</code> | <code>&quot;js-client&quot;</code> | <p>name of client</p> |
| [params.host] | <code>string</code> |  | <p>server host</p> |
| [params.port] | <code>integer</code> |  | <p>server port</p> |
| [params.user] | <code>string</code> |  | <p>username</p> |
| [params.password] | <code>string</code> |  | <p>password</p> |
| [params.session_id] | <code>string</code> |  | <p>a server session id</p> |
| [params.timeout] | <code>integer</code> |  | <p>connection timeout</p> |


* * *

<a name="Client+alive"></a>

#### client.alive() ⇒ <code>boolean</code>
<p>Check if server is still alive</p>

**Kind**: instance method of [<code>Client</code>](#Client)  

* * *

<a name="Client+ready"></a>

#### client.ready() ⇒ <code>boolean</code>
<p>Check if client is ready to exchange messages with server</p>

**Kind**: instance method of [<code>Client</code>](#Client)  

* * *

<a name="Client+set_server"></a>

#### client.set\_server(host, port)
<p>Set server address</p>

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| host | <code>string</code> | <p>server host</p> |
| port | <code>integer</code> | <p>server port</p> |


* * *

<a name="Client+is_connected"></a>

#### client.is\_connected() ⇒ <code>boolean</code>
<p>Check if the client is still connected to the server</p>

**Kind**: instance method of [<code>Client</code>](#Client)  

* * *

<a name="Client+close"></a>

#### client.close() ⇒ <code>Promise</code>
<p>Close the connection</p>

**Kind**: instance method of [<code>Client</code>](#Client)  

* * *

<a name="Client+handshake"></a>

#### client.handshake(params) ⇒ <code>Promise</code>
<p>Perfom a handshake with the HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Throws**:

- [<code>AuthError</code>](#AuthError) 


| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | <p>optinal params</p> |
| [params.user] | <code>string</code> | <p>username</p> |
| [params.password] | <code>integer</code> | <p>password</p> |
| [params.ignore_err] | <code>boolean</code> | <p>ignore error</p> |


* * *

<a name="Client+request_auth"></a>

#### client.request\_auth(ignore_err) ⇒ <code>Promise</code>
<p>Basically a re-login</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  

| Param | Type | Description |
| --- | --- | --- |
| ignore_err | <code>boolean</code> | <p>ignore error</p> |


* * *

<a name="Client+connect"></a>

#### client.connect(params) ⇒ <code>Promise</code>
<p>Connect to HPX server</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | <p>optional params</p> |
| [params.host] | <code>string</code> | <p>server host</p> |
| [params.port] | <code>integer</code> | <p>server port</p> |


* * *

<a name="Client+send"></a>

#### client.send(msg) ⇒ <code>Promise</code>
<p>Like [send_raw](send_raw), but as a convenience, this method will wrap your message into the required message structure HPX expects and automatically sets the session and name</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Fullfil**: <code>Object</code> - message from server  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | <p>this is an array of Object's</p> |


* * *

<a name="Client+send_raw"></a>

#### client.send\_raw(msg) ⇒ <code>Promise</code>
<p>Send json-compatible Object to server. Receive json-compatible Object from server.</p>
<p>Note that this method will not modify your message and expects you to add the name and session yourself. See the [finalize](#finalize) function.</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Category**: async  
**Fullfil**: <code>Object</code> - message from server  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Object</code> | <p>message to send to the server</p> |


* * *

<a name="log"></a>

### log
<p>The logger</p>

**Kind**: global constant  
**Group**: Logging  

* [log](#log)
    * [.enabled](#log.enabled)
    * [.logger](#log.logger)


* * *

<a name="log.enabled"></a>

#### log.enabled
<p>Enable or disable logging</p>

**Kind**: static property of [<code>log</code>](#log)  

* * *

<a name="log.logger"></a>

#### log.logger
<p>Can be set to a custom logger that will be used instead of console</p>

**Kind**: static property of [<code>log</code>](#log)  

* * *

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
| --- | --- | --- |
| msg_dict | <code>AnyJson</code> | <p>message to wrap</p> |
| session_id | <code>string</code> | <p>optional, session id</p> |
| name | <code>string</code> | <p>name of client</p> |
| error | [<code>ServerError</code>](#ServerError) | <p>error message object to include in the final message</p> |
| opts | <code>Object</code> | <p>optional options</p> |
| [opts.to_json] | <code>boolean</code> | <p>convert the final message to json string</p> |
| [opts.to_bytes] | <code>boolean</code> | <p>convert the final message to bytes buffer</p> |
| msg_id | <code>AnyJson</code> | <p>optional message id</p> |


* * *

<a name="ServerError"></a>

### ServerError ⇐ <code>Error</code>
<p>Base class for all server errors</p>

**Kind**: global class  
**Extends**: <code>Error</code>  
**Category**: Errors  

* * *

<a name="ServerError"></a>

### ServerError ⇐ [<code>ServerError</code>](#ServerError)
<p>Base class for all authentication errors</p>

**Kind**: global variable  
**Extends**: [<code>ServerError</code>](#ServerError)  
**Category**: Errors  

* * *

<a name="AuthError"></a>

### AuthError ⇐ [<code>AuthError</code>](#AuthError)
<p>Wrong credentials error</p>

**Kind**: global variable  
**Extends**: [<code>AuthError</code>](#AuthError)  
**Category**: Errors  

* * *

<a name="AuthWrongCredentialsError"></a>

### AuthWrongCredentialsError ⇐ [<code>AuthError</code>](#AuthError)
<p>Authentication required error</p>

**Kind**: global variable  
**Extends**: [<code>AuthError</code>](#AuthError)  
**Category**: Errors  

* * *

<a name="AuthRequiredError"></a>

### AuthRequiredError ⇐ [<code>AuthError</code>](#AuthError)
<p>Missing credentials error</p>

**Kind**: global variable  
**Extends**: [<code>AuthError</code>](#AuthError)  
**Category**: Errors  

* * *

<a name="AuthMissingCredentials"></a>

### AuthMissingCredentials ⇐ [<code>ServerError</code>](#ServerError)
<p>Base class for all client errors</p>

**Kind**: global variable  
**Extends**: [<code>ServerError</code>](#ServerError)  
**Category**: Errors  

* * *

<a name="ClientError"></a>

### ClientError ⇐ [<code>ClientError</code>](#ClientError)
<p>Timeout error</p>

**Kind**: global variable  
**Extends**: [<code>ClientError</code>](#ClientError)  
**Category**: Errors  

* * *

<a name="TimoutError"></a>

### TimoutError ⇐ [<code>ClientError</code>](#ClientError)
<p>Base class for all connection errors</p>

**Kind**: global variable  
**Extends**: [<code>ClientError</code>](#ClientError)  
**Category**: Errors  

* * *

<a name="ConnectionError"></a>

### ConnectionError ⇐ [<code>ConnectionError</code>](#ConnectionError)
<p>Server disconnect error</p>

**Kind**: global variable  
**Extends**: [<code>ConnectionError</code>](#ConnectionError)  
**Category**: Errors  

* * *

Done in 2.83s.
