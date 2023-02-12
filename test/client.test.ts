import inspector from 'inspector';

import Client, {
  ClientError,
  ServerError,
  ServerMsg,
  TimeoutError,
} from '../src/index';

const connect_info = { host: "localhost", port: 7007 };

test("client is able to connect and disconnect", async () => {
  let c = new Client({ name: "my-test-client" });
  const d = await c.connect(connect_info);
  expect(d).toMatchObject({ data: {}, session: "" });
  expect(c.is_connected()).toBe(true);
  await c.close();
  expect(c.is_connected()).toBe(false);
});

test("client is able to perform a handshake", async () => {
  let c = new Client({ name: "my-test-client" });
  const d = await c.connect(connect_info).then((d) => {
    return c.handshake({ user: null, password: null });
  });
  expect(d).toBe(true);
  await c.close();
});

test("client is able to send and receive data", async () => {
  let c = new Client({ name: "my-test-client" });
  await c.connect(connect_info).then((d) => {
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
    await c.connect(connect_info).then((d) => {
      return c.handshake({ user: null, password: null });
    });
    const ps: Promise<ServerMsg<'call'>>[] = [];
    for (let i = 0; i < 100; i++) {
      ps.push(c.send([{ fname: "get_version" }]));
    }
    const d = await c.send([{ fname: "get_version" }]);
    expect(d).toMatchObject({ data: [{ fname: "get_version", data: {} }] });
    await c.close();
  },
  inspector.url() ? 1000 * 60 * 60 : 1000 * 20 //  60 mins if debugging, else 20 secs
);

test(
  "client times out if it can't connect",
  async () => {

    let c = new Client({ name: "my-test-client" });
    c.timeout = 1000;

    let now = Date.now();
    await expect(c.connect({ host: "localhost", port: 54321 })).rejects.toThrow("timeout");
    expect(Date.now() - now).toBeGreaterThan(500);
    expect(Date.now() - now).toBeLessThan(1500);
    expect(c.is_connected()).toBe(false);

    c.timeout = 2000
    now = Date.now();


    await expect(c.connect({ host: "localhost", port: 54321 })).rejects.toThrow("timeout");
    expect(Date.now() - now).toBeGreaterThan(1500);
    expect(Date.now() - now).toBeLessThan(2500);
    expect(c.is_connected()).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(c.connect(connect_info)).resolves.toBeTruthy();
    await expect(c.handshake({ user: null, password: null })).resolves.toEqual(true);

    const d = await c.send([{ fname: "get_version" }]);
    expect(d).toMatchObject({ data: [{ fname: "get_version", data: {} }] });
    await c.close();
  },
  inspector.url() ? 1000 * 60 * 60 : 1000 * 20 //  60 mins if debugging, else 20 secs
);

test(
  "client can reconnect to server",
  async () => {

    let c = new Client({ name: "my-test-client" });
    await expect(c.connect(connect_info).then((d) => {
      return c.handshake({ user: null, password: null });
    })).resolves.toBeTruthy();
    const s1 = c.session;
    expect(s1).toBeTruthy();

    await c.close();

    await expect(c.connect(connect_info).then((d) => {
      return c.handshake({ user: null, password: null });
    })).resolves.toBeTruthy();
    const s2 = c.session;
    expect(s2).toBeTruthy();

    expect(s2).not.toEqual(s1);

    await c.close();
  },
  inspector.url() ? 1000 * 60 * 60 : 1000 * 20 //  60 mins if debugging, else 20 secs
);


test(
  "Error instanceof works",
  async () => {

    const e = new ServerError("test");
    expect(e instanceof Error).toBe(true);
    expect(e instanceof ServerError).toBe(true);
    expect(e instanceof ClientError).toBe(false);

    const e2 = new ClientError("test");
    expect(e2 instanceof Error).toBe(true);
    expect(e2 instanceof ClientError).toBe(true);
    expect(e2 instanceof ServerError).toBe(true);
    expect(e2 instanceof TimeoutError).toBe(false);

  },
);


