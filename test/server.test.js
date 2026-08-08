const test = require("node:test");
const assert = require("node:assert/strict");
const { io: connect } = require("socket.io-client");

process.env.PORT = "0";
const { server } = require("../server");

let baseUrl;

test.before(async () => {
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  assert.notEqual(address.port, 3000, "test server should use an ephemeral port");
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function emitAck(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

test("creates a room, seats two players, and syncs a legal move", async (context) => {
  const red = connect(baseUrl, { transports: ["websocket"] });
  const black = connect(baseUrl, { transports: ["websocket"] });
  context.after(() => {
    red.close();
    black.close();
  });

  await Promise.all([
    new Promise((resolve) => red.once("connect", resolve)),
    new Promise((resolve) => black.once("connect", resolve)),
  ]);

  const created = await emitAck(red, "create-room");
  assert.equal(created.ok, true);
  assert.equal(created.side, "red");

  const joined = await emitAck(black, "join-room", { roomId: created.roomId });
  assert.equal(joined.ok, true);
  assert.equal(joined.side, "black");

  const moved = await emitAck(red, "move", { from: "a3", to: "a4" });
  assert.equal(moved.ok, true);

  const rejected = await emitAck(red, "move", { from: "c3", to: "c4" });
  assert.equal(rejected.ok, false);
});
