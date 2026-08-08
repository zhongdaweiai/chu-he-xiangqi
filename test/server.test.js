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

function waitForRoomState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("room-state", listener);
      reject(new Error("Timed out waiting for room state"));
    }, 2_000);
    const listener = (room) => {
      if (!predicate(room)) return;
      clearTimeout(timeout);
      socket.off("room-state", listener);
      resolve(room);
    };
    socket.on("room-state", listener);
  });
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
  assert.match(created.roomId, /^\d{4}$/);

  const joined = await emitAck(black, "join-room", { roomId: created.roomId });
  assert.equal(joined.ok, true);
  assert.equal(joined.side, "black");

  const moved = await emitAck(red, "move", { from: "a3", to: "a4" });
  assert.equal(moved.ok, true);

  const rejected = await emitAck(red, "move", { from: "c3", to: "c4" });
  assert.equal(rejected.ok, false);

  const restartedState = new Promise((resolve) => {
    black.on("room-state", (room) => {
      if (room.id === created.roomId && room.game.sequence === 0) resolve(room);
    });
  });
  const restarted = await emitAck(red, "restart");
  assert.equal(restarted.ok, true);
  assert.equal((await restartedState).game.turn, "red");

  await new Promise((resolve) => setTimeout(resolve, 130));
  assert.equal((await emitAck(red, "move", { from: "a3", to: "a4" })).ok, true);
  assert.equal((await emitAck(black, "move", { from: "a6", to: "a5" })).ok, true);

  const undoOfferedState = waitForRoomState(black, (room) => room.pendingRequest?.type === "undo");
  assert.equal((await emitAck(red, "request-undo")).ok, true);
  assert.equal((await undoOfferedState).pendingRequest.from, "red");

  const undoAcceptedState = waitForRoomState(red, (room) => room.game.lastAction === "undo");
  const undoAccepted = await emitAck(black, "respond-request", { accept: true });
  assert.equal(undoAccepted.ok, true);
  assert.equal(undoAccepted.undoneMoves, 2);
  const undoneRoom = await undoAcceptedState;
  assert.equal(undoneRoom.game.sequence, 0);
  assert.equal(undoneRoom.game.turn, "red");

  const drawOfferedState = waitForRoomState(black, (room) => room.pendingRequest?.type === "draw");
  assert.equal((await emitAck(red, "offer-draw")).ok, true);
  await drawOfferedState;
  const drawCancelledState = waitForRoomState(black, (room) => room.pendingRequest === null);
  assert.equal((await emitAck(red, "cancel-request")).ok, true);
  assert.equal((await drawCancelledState).game.gameOver, false);

  const drawOfferedAgain = waitForRoomState(black, (room) => room.pendingRequest?.type === "draw");
  assert.equal((await emitAck(red, "offer-draw")).ok, true);
  await drawOfferedAgain;
  const drawDeclinedState = waitForRoomState(red, (room) => room.pendingRequest === null);
  const declined = await emitAck(black, "respond-request", { accept: false });
  assert.equal(declined.ok, true);
  assert.equal((await drawDeclinedState).game.gameOver, false);

  const finalDrawOffer = waitForRoomState(black, (room) => room.pendingRequest?.type === "draw");
  assert.equal((await emitAck(red, "offer-draw")).ok, true);
  await finalDrawOffer;
  const drawnState = waitForRoomState(red, (room) => room.game.endReason === "draw");
  assert.equal((await emitAck(black, "respond-request", { accept: true })).ok, true);
  const drawnRoom = await drawnState;
  assert.equal(drawnRoom.game.gameOver, true);
  assert.equal(drawnRoom.game.winner, null);

  const secondRestartState = waitForRoomState(black, (room) => room.game.gameOver === false && room.game.revision === 0);
  assert.equal((await emitAck(red, "restart")).ok, true);
  await secondRestartState;

  const resignedState = waitForRoomState(red, (room) => room.game.endReason === "resign");
  assert.equal((await emitAck(black, "resign")).ok, true);
  const resignedRoom = await resignedState;
  assert.equal(resignedRoom.game.gameOver, true);
  assert.equal(resignedRoom.game.winner, "red");
});
