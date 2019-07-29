# happypandax-client for javascript
> A javascript client library for communicating with HappyPanda X servers

> Note: This is a nodejs module and is not meant to be able to run in a browser!

## Installing

Install and update npm or yarn

```
$ npm install happypandax-client
```

## Example

Get up and running fast:

```javascript
hpxclient = require('happypandax-client')

let c = new hpxclient.Client("my-client")
c.connect({host:"localhost", port:7007})
    .then(function() { c.handshake({user:null, password:null})
    .then(function() { c.send([{fname:"get_version"}])
    .then(function(data) {
            console.log(data)
            console.log(data.data[0].data)
        })
    })
})
```

or, using *Async/Await* syntax:

```javascript
hpxclient = require('happypandax-client')

let c = new hpxclient.Client("my-client")

async function main() {
    await c.connect({host:"localhost", port:7015})
    await c.handshake({user:null, password:null})

    let data = await c.send([{fname:"get_version"}])
    console.log(data)
    console.log(data.data[0].data)
}

main()
```

## API

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