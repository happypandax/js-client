import Client from '../dist';

let c = new Client({ name: "my-client" });

async function main() {
  const d = await c.connect({ host: "localhost", port: 7007 });

  console.log(d);

  await c.handshake({ user: null, password: null });

  let data = await c.send([{ fname: "get_version" }]);
  console.log(data);
  await c.close();
}

main().catch((e) => console.log("Test ended with error: " + e.toString()));
