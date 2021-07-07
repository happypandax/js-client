import Client from "../dist";

let c = new Client({ name: "my-client" });

async function main() {
  await c.connect({ host: "localhost", port: 7008 });
  await c.handshake({ user: null, password: null });

  let data = await c.send([{ fname: "get_version" }]);
  console.log(data);
  c.close();
}

main();
