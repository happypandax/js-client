# happypandax-client for javascript

> A javascript client library for communicating with HappyPanda X servers

> Note: This is a nodejs module and not meant to run in a browser!

> Version`>=3.0.0` of this library only supports HPX version `>=1.0.0`, please use version`<3.0.0` of this library for HPX `<=0.13`

## Installing

Install and update with npm or yarn

```
$ yarn add happypandax-client
```

## Example

Get up and running fast:

```typescript
import Client from "happypandax-client";

const c = new Client({ name: "my-client" });
c.connect({ host: "localhost", port: 7007 }).then(function (msg) {
  c.handshake({ user: null, password: null })
    .then(function (success) {
      if (success) {
        c.send([{ fname: "get_version" }]).then(function (data) {
          console.log(data);
        });
      } else {
        console.error("Handshake failed")
      }
    })
    .finally(() => c.close());
});
```

or, using _Async/Await_ syntax:

```typescript
import Client from "happypandax-client";

let c = new Client({ name: "my-client" });

async function main() {
  const msg = await c.connect({ host: "localhost", port: 7007 });
  const success = await c.handshake({ user: null, password: null });

  if (success) {
    let data = await c.send([{ fname: "get_version" }]);
    console.log(data);
  } else {
    console.error("Handshake failed");
  }

  c.close();
}

main();
```

## API

See [Docs](DOCS.md)

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

Due to a [change](https://github.com/nodejs/node/issues/40702) in NodeJS v17, `localhost` might now return a IPV6 address, however the client will always prefer the IPv4 address.
To restore to NodeJS behaviour, set `Client.resolve_IPV4_localhost = false;`

