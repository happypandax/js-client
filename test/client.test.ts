import inspector from 'inspector';

import Client from '../src/index';

test("client is able to connect and disconnect", async () => {
  let c = new Client({ name: "my-test-client" });
  const d = await c.connect({ host: "localhost", port: 7007 });
  expect(d).toMatchObject({ data: {}, session: "" });
  expect(c.is_connected()).toBe(true);
  await c.close();
  expect(c.is_connected()).toBe(false);
});

test("client is able to perform a handshake", async () => {
  let c = new Client({ name: "my-test-client" });
  const d = await c.connect({ host: "localhost", port: 7007 }).then((d) => {
    return c.handshake({ user: null, password: null });
  });
  expect(d).toBe(true);
  await c.close();
});

test("client is able to send and receive data", async () => {
  let c = new Client({ name: "my-test-client" });
  await c.connect({ host: "localhost", port: 7007 }).then((d) => {
    return c.handshake({ user: null, password: null });
  });
  const d = await c.send([{ fname: "get_version" }]);
  expect(d).toMatchObject({ data: [{ fname: "get_version", data: {} }] });
  await c.close();
});

test(
  "client is able to send and receive data without going out of sync",
  async () => {
    let c = new Client({ name: "my-test-client" });
    await c.connect({ host: "localhost", port: 7007 }).then((d) => {
      return c.handshake({ user: null, password: null });
    });
    const ps = [];
    for (let i = 0; i < 100; i++) {
      ps.push(c.send([{ fname: "get_version" }]));
    }
    const d = await c.send([{ fname: "get_version" }]);
    expect(d).toMatchObject({ data: [{ fname: "get_version", data: {} }] });
    await c.close();
  },
  inspector.url() ? 1000 * 60 * 60 : 1000 * 20 //  60 mins if debugging, else 20 secs
);
