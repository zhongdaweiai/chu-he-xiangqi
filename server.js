const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const express = require("express");
const { Server } = require("socket.io");
const { XiangqiGame } = require("./game");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: 20_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 100_000,
});

const PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL = 24 * 60 * 60 * 1000;
const rooms = new Map();

app.disable("x-powered-by");
app.get("/health", (_request, response) => {
  response.json({ ok: true, rooms: rooms.size });
});
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
  setHeaders(response, filePath) {
    if (path.basename(filePath) === "index.html") {
      response.setHeader("Cache-Control", "no-cache");
    }
  },
}));

function makeRoomId() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let id = "";
    for (let index = 0; index < 6; index += 1) {
      id += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
    }
    if (!rooms.has(id)) return id;
  }
  throw new Error("Could not allocate a room id");
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function cleanRoomId(value) {
  const id = String(value || "").trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(id) ? id : null;
}

function createRoom() {
  const id = makeRoomId();
  const room = {
    id,
    game: new XiangqiGame(),
    players: { red: null, black: null },
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

function publicRoom(room) {
  return {
    id: room.id,
    players: {
      red: room.players.red ? { connected: room.players.red.connected } : null,
      black: room.players.black ? { connected: room.players.black.connected } : null,
    },
    game: room.game.snapshot(),
  };
}

function broadcast(room) {
  room.lastActiveAt = Date.now();
  io.to(room.id).emit("room-state", publicRoom(room));
}

function seatForToken(room, token) {
  for (const side of ["red", "black"]) {
    if (room.players[side] && room.players[side].token === token) return side;
  }
  return null;
}

function occupySeat(room, socket, requestedToken) {
  const existingSide = requestedToken ? seatForToken(room, requestedToken) : null;
  if (existingSide) {
    const player = room.players[existingSide];
    player.socketId = socket.id;
    player.connected = true;
    return { side: existingSide, token: player.token };
  }

  const openSide = ["red", "black"].find((side) => !room.players[side]);
  if (!openSide) return { side: "spectator", token: null };

  const token = makeToken();
  room.players[openSide] = { token, socketId: socket.id, connected: true };
  return { side: openSide, token };
}

function attachSocket(socket, room, seat) {
  socket.join(room.id);
  socket.data.roomId = room.id;
  socket.data.side = seat.side;
  socket.data.token = seat.token;
  room.lastActiveAt = Date.now();
}

function leaveCurrentRoom(socket) {
  const previousRoom = rooms.get(socket.data.roomId);
  const previousSide = socket.data.side;
  if (!previousRoom) return;

  if (["red", "black"].includes(previousSide)) {
    const player = previousRoom.players[previousSide];
    if (player && player.socketId === socket.id) {
      player.connected = false;
      player.socketId = null;
    }
  }
  socket.leave(previousRoom.id);
  broadcast(previousRoom);
}

io.on("connection", (socket) => {
  socket.on("create-room", (_payload, acknowledge = () => {}) => {
    try {
      leaveCurrentRoom(socket);
      const room = createRoom();
      const seat = occupySeat(room, socket, null);
      attachSocket(socket, room, seat);
      acknowledge({ ok: true, roomId: room.id, side: seat.side, token: seat.token, room: publicRoom(room) });
      broadcast(room);
    } catch (error) {
      console.error("create-room", error);
      acknowledge({ ok: false, error: "暂时无法创建棋局，请重试" });
    }
  });

  socket.on("join-room", (payload = {}, acknowledge = () => {}) => {
    const roomId = cleanRoomId(payload.roomId);
    const room = roomId ? rooms.get(roomId) : null;
    if (!room) {
      acknowledge({ ok: false, error: "这个棋局不存在或已经结束" });
      return;
    }

    leaveCurrentRoom(socket);
    const seat = occupySeat(room, socket, typeof payload.token === "string" ? payload.token : null);
    attachSocket(socket, room, seat);
    acknowledge({ ok: true, roomId, side: seat.side, token: seat.token, room: publicRoom(room) });
    broadcast(room);
  });

  socket.on("move", (payload = {}, acknowledge = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !["red", "black"].includes(socket.data.side)) {
      acknowledge({ ok: false, error: "你还没有加入棋局" });
      return;
    }
    if (!room.players.red || !room.players.black || !room.players.red.connected || !room.players.black.connected) {
      acknowledge({ ok: false, error: "请等对手上线后再走棋" });
      return;
    }

    const now = Date.now();
    if (socket.data.lastMoveAt && now - socket.data.lastMoveAt < 120) {
      acknowledge({ ok: false, error: "走得太快了，请稍等一下" });
      return;
    }
    socket.data.lastMoveAt = now;

    const result = room.game.move(socket.data.side, String(payload.from || ""), String(payload.to || ""));
    acknowledge(result.ok ? { ok: true } : result);
    if (result.ok) broadcast(room);
  });

  socket.on("restart", (_payload, acknowledge = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !["red", "black"].includes(socket.data.side)) {
      acknowledge({ ok: false, error: "只有对局双方可以重新开局" });
      return;
    }
    room.game = new XiangqiGame();
    acknowledge({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomId);
    const side = socket.data.side;
    if (!room || !["red", "black"].includes(side)) return;

    const player = room.players[side];
    if (player && player.socketId === socket.id) {
      player.connected = false;
      player.socketId = null;
      broadcast(room);
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL;
  for (const [roomId, room] of rooms) {
    const nobodyConnected = ["red", "black"].every((side) => !room.players[side] || !room.players[side].connected);
    if (nobodyConnected && room.lastActiveAt < cutoff) rooms.delete(roomId);
  }
}, 15 * 60 * 1000).unref();

server.listen(PORT, "0.0.0.0", () => {
  const address = server.address();
  console.log(`Xiangqi server listening on ${typeof address === "object" ? address.port : PORT}`);
});

module.exports = { app, server, rooms };
