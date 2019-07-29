hpxclient = require("../client")

let c = new hpxclient.Client("my-client")

async function main() {
    await c.connect({host:"localhost", port:7015})
    await c.handshake({user:null, password:null})

    let data = await c.send([{fname:"get_version"}])
    console.log(data)
    console.log(data.data[0].data)
}

main()