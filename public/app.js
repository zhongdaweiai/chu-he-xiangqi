const socket = io({ transports: ["websocket", "polling"] });

const elements = {
  boardWrap: document.querySelector("#boardWrap"),
  boardPoints: document.querySelector("#boardPoints"),
  pieces: document.querySelector("#pieces"),
  boardWaiting: document.querySelector("#boardWaiting"),
  createRoomButton: document.querySelector("#createRoomButton"),
  newRoomButton: document.querySelector("#newRoomButton"),
  copyInviteButton: document.querySelector("#copyInviteButton"),
  restartButton: document.querySelector("#restartButton"),
  soundToggle: document.querySelector("#soundToggle"),
  connectionStatus: document.querySelector("#connectionStatus"),
  roomCode: document.querySelector("#roomCode"),
  blackPlayer: document.querySelector("#blackPlayer"),
  redPlayer: document.querySelector("#redPlayer"),
  turnBanner: document.querySelector("#turnBanner"),
  moveList: document.querySelector("#moveList"),
  moveCount: document.querySelector("#moveCount"),
  toast: document.querySelector("#toast"),
};

const PIECES = {
  r: { role: "rook", text: "車" },
  n: { role: "knight", text: "馬" },
  b: { role: "bishop", text: "象" },
  a: { role: "advisor", text: "士" },
  k: { role: "king", text: "將" },
  c: { role: "cannon", text: "砲" },
  p: { role: "pawn", text: "卒" },
  R: { role: "rook", text: "俥" },
  N: { role: "knight", text: "傌" },
  B: { role: "bishop", text: "相" },
  A: { role: "advisor", text: "仕" },
  K: { role: "king", text: "帥" },
  C: { role: "cannon", text: "炮" },
  P: { role: "pawn", text: "兵" },
};

const ROLE_NAMES = {
  red: { rook: "俥", knight: "傌", bishop: "相", advisor: "仕", king: "帥", cannon: "炮", pawn: "兵" },
  black: { rook: "車", knight: "馬", bishop: "象", advisor: "士", king: "將", cannon: "砲", pawn: "卒" },
};

const state = {
  roomId: new URLSearchParams(location.search).get("room")?.toUpperCase() || null,
  side: "spectator",
  room: null,
  selected: null,
  sound: localStorage.getItem("xiangqi-sound") !== "off",
  audioContext: null,
  renderedSequence: -1,
  toastTimer: null,
};

function storageKey(roomId) {
  return `xiangqi-room-${roomId}`;
}

function playerToken(roomId) {
  return roomId ? localStorage.getItem(storageKey(roomId)) : null;
}

function rememberPlayer(roomId, token) {
  if (roomId && token) localStorage.setItem(storageKey(roomId), token);
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function setConnection(status) {
  elements.connectionStatus.className = `connection ${status}`;
  elements.connectionStatus.lastChild.textContent = status === "online" ? "已连接" : status === "offline" ? "连接中断" : "连接中";
}

function ensureAudio() {
  if (!state.sound) return null;
  if (!state.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) state.audioContext = new AudioContext();
  }
  if (state.audioContext?.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}

function playClack(capture = false) {
  const context = ensureAudio();
  if (!context) return;

  const now = context.currentTime;
  const duration = capture ? .095 : .07;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    const envelope = Math.pow(1 - index / channel.length, 3.4);
    channel[index] = (Math.random() * 2 - 1) * envelope;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(capture ? 1180 : 920, now);
  filter.Q.value = 1.25;
  gain.gain.setValueAtTime(capture ? .62 : .48, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(now);

  const knock = context.createOscillator();
  const knockGain = context.createGain();
  knock.type = "triangle";
  knock.frequency.setValueAtTime(capture ? 175 : 145, now);
  knock.frequency.exponentialRampToValueAtTime(78, now + .055);
  knockGain.gain.setValueAtTime(.28, now);
  knockGain.gain.exponentialRampToValueAtTime(.001, now + .06);
  knock.connect(knockGain).connect(context.destination);
  knock.start(now);
  knock.stop(now + .065);
}

function parseFen(boardFen) {
  const rows = boardFen.split(" ")[0].split("/");
  const result = new Map();
  rows.forEach((row, rowIndex) => {
    let file = 0;
    for (const character of row) {
      if (/\d/.test(character)) {
        file += Number(character);
      } else {
        const side = character === character.toUpperCase() ? "red" : "black";
        const square = `${String.fromCharCode(97 + file)}${9 - rowIndex}`;
        result.set(square, { ...PIECES[character], side, square });
        file += 1;
      }
    }
  });
  return result;
}

function squareToPosition(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const canonicalRow = 9 - rank;
  const displayFile = state.side === "black" ? 8 - file : file;
  const displayRow = state.side === "black" ? 9 - canonicalRow : canonicalRow;
  return {
    left: 5.555 + displayFile * 11.111,
    top: 5 + displayRow * 10,
  };
}

function pointToSquare(clientX, clientY) {
  const rect = elements.boardWrap.getBoundingClientRect();
  let file = Math.round(((clientX - rect.left) / rect.width * 100 - 5.555) / 11.111);
  let row = Math.round(((clientY - rect.top) / rect.height * 100 - 5) / 10);
  if (file < 0 || file > 8 || row < 0 || row > 9) return null;
  if (state.side === "black") {
    file = 8 - file;
    row = 9 - row;
  }
  return `${String.fromCharCode(97 + file)}${9 - row}`;
}

function canMoveNow() {
  if (!state.room || !["red", "black"].includes(state.side)) return false;
  const players = state.room.players;
  return Boolean(players.red?.connected && players.black?.connected && state.room.game.turn === state.side && !state.room.game.gameOver);
}

function chooseSquare(square) {
  ensureAudio();
  if (!state.room) return;
  const pieces = parseFen(state.room.game.fen);
  const piece = pieces.get(square);
  const legal = state.room.game.legalMoves;

  if (state.selected && legal[state.selected]?.includes(square)) {
    sendMove(state.selected, square);
    return;
  }
  if (piece && piece.side === state.side && canMoveNow() && legal[square]?.length) {
    state.selected = state.selected === square ? null : square;
    renderBoard();
    return;
  }
  if (piece && piece.side === state.side && state.room.game.turn !== state.side) showToast("还没轮到你");
  state.selected = null;
  renderBoard();
}

function sendMove(from, to) {
  state.selected = null;
  socket.emit("move", { from, to }, (result) => {
    if (!result?.ok) {
      showToast(result?.error || "这一步没有走成");
      renderBoard();
    }
  });
}

function addDrag(pieceElement, fromSquare) {
  let origin = null;
  let dragged = false;

  pieceElement.addEventListener("pointerdown", (event) => {
    ensureAudio();
    if (!canMoveNow()) return;
    origin = { x: event.clientX, y: event.clientY };
    dragged = false;
    pieceElement.setPointerCapture(event.pointerId);
  });

  pieceElement.addEventListener("pointermove", (event) => {
    if (!origin || !pieceElement.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.hypot(dx, dy) > 7) dragged = true;
    if (!dragged) return;
    pieceElement.classList.add("dragging");
    pieceElement.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.06)`;
  });

  pieceElement.addEventListener("pointerup", (event) => {
    if (!origin) return;
    const wasDragged = dragged;
    origin = null;
    pieceElement.classList.remove("dragging");
    pieceElement.style.transform = "";
    if (wasDragged) {
      const target = pointToSquare(event.clientX, event.clientY);
      const legal = state.room?.game.legalMoves[fromSquare] || [];
      if (target && legal.includes(target)) sendMove(fromSquare, target);
      else showToast("这个位置不能落子");
    } else {
      chooseSquare(fromSquare);
    }
  });

  pieceElement.addEventListener("pointercancel", () => {
    origin = null;
    pieceElement.classList.remove("dragging");
    pieceElement.style.transform = "";
  });
}

function animateLastMove(pieceElement, square) {
  const move = state.room?.game.lastMove;
  if (!move || move.to !== square || move.sequence === state.renderedSequence || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = squareToPosition(move.from);
  const to = squareToPosition(move.to);
  pieceElement.animate([
    { left: `${from.left}%`, top: `${from.top}%`, transform: "translate(-50%, -50%) scale(1.05)" },
    { left: `${to.left}%`, top: `${to.top}%`, transform: "translate(-50%, -50%) scale(1)" },
  ], { duration: 250, easing: "cubic-bezier(.2,.85,.3,1)" });
}

function renderBoard() {
  elements.boardPoints.replaceChildren();
  elements.pieces.replaceChildren();
  const game = state.room?.game;
  if (!game) return;

  const boardPieces = parseFen(game.fen);
  const selectedMoves = state.selected ? game.legalMoves[state.selected] || [] : [];

  for (let rank = 0; rank <= 9; rank += 1) {
    for (let file = 0; file <= 8; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${rank}`;
      const position = squareToPosition(square);
      const point = document.createElement("button");
      point.type = "button";
      point.className = "point-hit";
      point.style.left = `${position.left}%`;
      point.style.top = `${position.top}%`;
      point.setAttribute("aria-label", `棋盘位置 ${square}`);
      if (selectedMoves.includes(square)) point.classList.add(boardPieces.has(square) ? "capture" : "legal");
      if (game.lastMove && (game.lastMove.from === square || game.lastMove.to === square)) point.classList.add("last");
      point.addEventListener("click", () => chooseSquare(square));
      elements.boardPoints.append(point);
    }
  }

  for (const [square, piece] of boardPieces) {
    const position = squareToPosition(square);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `piece ${piece.side}`;
    if (state.selected === square) button.classList.add("selected");
    if (!canMoveNow() || piece.side !== state.side) button.classList.add("disabled");
    button.style.left = `${position.left}%`;
    button.style.top = `${position.top}%`;
    button.textContent = piece.text;
    button.setAttribute("aria-label", `${piece.side === "red" ? "红" : "黑"}${piece.text}，${square}`);
    addDrag(button, square);
    elements.pieces.append(button);
    animateLastMove(button, square);
  }

  if (game.lastMove && game.lastMove.sequence !== state.renderedSequence) {
    playClack(game.lastMove.capture);
    state.renderedSequence = game.lastMove.sequence;
  }
}

function updatePlayer(element, side) {
  const player = state.room?.players[side];
  const detail = element.querySelector("small");
  element.classList.toggle("online", Boolean(player?.connected));
  element.classList.toggle("me", state.side === side);
  detail.textContent = !player ? "等待加入" : player.connected ? "在线" : "暂时离线";
}

function renderStatus() {
  const room = state.room;
  elements.boardWaiting.classList.toggle("hidden", Boolean(room));
  elements.roomCode.textContent = room ? room.id : "尚未开局";
  elements.copyInviteButton.disabled = !room;
  elements.restartButton.disabled = !room || !["red", "black"].includes(state.side);
  updatePlayer(elements.redPlayer, "red");
  updatePlayer(elements.blackPlayer, "black");

  if (!room) {
    elements.turnBanner.className = "turn-banner";
    elements.turnBanner.innerHTML = "<span>棋局未开始</span><b>请先创建房间</b>";
    return;
  }

  const game = room.game;
  const bothReady = room.players.red?.connected && room.players.black?.connected;
  let label = state.side === "spectator" ? "观战中" : `你执${state.side === "red" ? "红" : "黑"}`;
  let message = "等待对手上线";
  if (game.gameOver) message = game.winner ? `${game.winner === "red" ? "红方" : "黑方"}胜` : "本局和棋";
  else if (bothReady) message = game.turn === state.side ? "轮到你走" : `轮到${game.turn === "red" ? "红方" : "黑方"}`;
  if (game.inCheck && !game.gameOver) message += " · 将军";
  elements.turnBanner.className = `turn-banner${game.inCheck ? " check" : ""}`;
  elements.turnBanner.innerHTML = `<span>${label}</span><b>${message}</b>`;
}

function renderMoves() {
  const history = state.room?.game.history || [];
  elements.moveCount.textContent = `${state.room?.game.sequence || 0} 手`;
  elements.moveList.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("li");
    empty.className = "empty-moves";
    empty.textContent = "静候第一步";
    elements.moveList.append(empty);
    return;
  }

  history.forEach((move) => {
    const item = document.createElement("li");
    if (move.side === "black") item.className = "black-move";
    const name = document.createElement("em");
    name.textContent = `${move.side === "red" ? "红" : "黑"}${ROLE_NAMES[move.side][move.role]}`;
    const squares = document.createElement("span");
    squares.textContent = `${move.from} → ${move.to}`;
    const action = document.createElement("small");
    action.textContent = move.capture ? "吃" : "走";
    item.append(name, squares, action);
    elements.moveList.append(item);
  });
  elements.moveList.scrollTop = elements.moveList.scrollHeight;
}

function render() {
  renderStatus();
  renderMoves();
  renderBoard();
}

function enterRoom(result) {
  if (!result?.ok) {
    showToast(result?.error || "无法加入棋局");
    state.room = null;
    state.roomId = null;
    history.replaceState({}, "", location.pathname);
    render();
    return;
  }
  state.roomId = result.roomId;
  state.side = result.side;
  state.room = result.room;
  state.selected = null;
  state.renderedSequence = result.room.game.sequence;
  rememberPlayer(result.roomId, result.token);
  history.replaceState({}, "", `/?room=${result.roomId}`);
  render();
}

function createRoom() {
  ensureAudio();
  elements.createRoomButton.disabled = true;
  socket.emit("create-room", {}, (result) => {
    elements.createRoomButton.disabled = false;
    enterRoom(result);
    if (result?.ok) showToast("棋局已创建，邀请链接可以分享了");
  });
}

function joinCurrentRoom() {
  if (!state.roomId) return;
  socket.emit("join-room", { roomId: state.roomId, token: playerToken(state.roomId) }, enterRoom);
}

elements.createRoomButton.addEventListener("click", createRoom);
elements.newRoomButton.addEventListener("click", createRoom);
elements.copyInviteButton.addEventListener("click", async () => {
  if (!state.roomId) return;
  const url = `${location.origin}/?room=${state.roomId}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("邀请链接已复制");
  } catch {
    window.prompt("复制这个邀请链接", url);
  }
});
elements.restartButton.addEventListener("click", () => {
  ensureAudio();
  socket.emit("restart", {}, (result) => {
    if (!result?.ok) showToast(result?.error || "暂时无法重新开局");
  });
});
elements.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  localStorage.setItem("xiangqi-sound", state.sound ? "on" : "off");
  elements.soundToggle.setAttribute("aria-pressed", String(state.sound));
  elements.soundToggle.querySelector("b").textContent = state.sound ? "开" : "关";
  if (state.sound) {
    ensureAudio();
    playClack(false);
  }
});

socket.on("connect", () => {
  setConnection("online");
  if (state.roomId) joinCurrentRoom();
});
socket.on("disconnect", () => {
  setConnection("offline");
  renderStatus();
});
socket.on("room-state", (room) => {
  if (room.id !== state.roomId) return;
  const previousSequence = state.room?.game.sequence ?? -1;
  state.room = room;
  if (room.game.sequence !== previousSequence) state.selected = null;
  render();
});

elements.soundToggle.setAttribute("aria-pressed", String(state.sound));
elements.soundToggle.querySelector("b").textContent = state.sound ? "开" : "关";
setConnection("connecting");
render();
