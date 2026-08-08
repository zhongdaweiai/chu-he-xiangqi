const { Chess } = require("./vendor/xiangqiops/chess");
const fen = require("./vendor/xiangqiops/fen");
const { makeSquare, parseSquare } = require("./vendor/xiangqiops/util");

const SIDES = {
  red: "white",
  black: "black",
};

const COLORS = {
  white: "red",
  black: "black",
};

const OPPOSITE = {
  red: "black",
  black: "red",
};

class XiangqiGame {
  constructor(initialFen) {
    if (initialFen) {
      const setup = fen.parseFen(initialFen).unwrap();
      this.position = Chess.fromSetup(setup).unwrap();
    } else {
      this.position = Chess.default();
    }

    this.history = [];
    this.statesBefore = [];
    this.sequence = 0;
    this.lastMove = null;
    this.manualOutcome = null;
    this.revision = 0;
    this.lastAction = null;
  }

  get turn() {
    return COLORS[this.position.turn];
  }

  legalMoves() {
    if (this.gameOver) return {};

    const moves = {};
    for (const [from, destinations] of this.position.allDests()) {
      moves[makeSquare(from)] = Array.from(destinations, (to) => makeSquare(to));
    }
    return moves;
  }

  get gameOver() {
    return Boolean(this.manualOutcome) || this.position.isEnd();
  }

  snapshot() {
    const outcome = this.position.outcome();
    const winner = this.manualOutcome
      ? this.manualOutcome.winner
      : outcome && outcome.winner
        ? COLORS[outcome.winner]
        : null;

    return {
      fen: this.position.fen(),
      turn: this.turn,
      legalMoves: this.legalMoves(),
      inCheck: this.position.isCheck(),
      gameOver: this.gameOver,
      winner,
      endReason: this.manualOutcome ? this.manualOutcome.endReason : outcome ? "natural" : null,
      history: this.history.slice(-12),
      lastMove: this.lastMove,
      sequence: this.sequence,
      revision: this.revision,
      lastAction: this.lastAction,
    };
  }

  move(side, fromName, toName) {
    if (!(side in SIDES)) {
      return { ok: false, error: "你现在是观战者" };
    }
    if (this.gameOver) {
      return { ok: false, error: "本局已经结束" };
    }
    if (SIDES[side] !== this.position.turn) {
      return { ok: false, error: "还没轮到你" };
    }

    const from = parseSquare(fromName);
    const to = parseSquare(toName);
    if (from === undefined || to === undefined) {
      return { ok: false, error: "棋盘位置无效" };
    }

    const piece = this.position.board.get(from);
    if (!piece || piece.color !== SIDES[side]) {
      return { ok: false, error: "请选择自己的棋子" };
    }

    const move = { from, to };
    if (!this.position.isLegal(move)) {
      return { ok: false, error: "这一步不符合象棋规则" };
    }

    const captured = this.position.board.get(to);
    this.statesBefore.push(this.position.fen());
    this.position.play(move);
    this.sequence = this.history.length + 1;
    this.lastMove = {
      from: fromName,
      to: toName,
      side,
      role: piece.role,
      capture: Boolean(captured),
      sequence: this.sequence,
    };
    this.history.push(this.lastMove);
    this.revision += 1;
    this.lastAction = "move";

    return { ok: true, move: this.lastMove, state: this.snapshot() };
  }

  canUndo(side) {
    return (side in SIDES) && this.history.some((move) => move.side === side);
  }

  undoLastMoveBy(side) {
    if (!(side in SIDES)) {
      return { ok: false, error: "你现在是观战者" };
    }
    if (this.gameOver) {
      return { ok: false, error: "本局已经结束" };
    }

    let moveIndex = -1;
    for (let index = this.history.length - 1; index >= 0; index -= 1) {
      if (this.history[index].side === side) {
        moveIndex = index;
        break;
      }
    }
    if (moveIndex === -1) {
      return { ok: false, error: "你还没有可悔的棋" };
    }

    const setup = fen.parseFen(this.statesBefore[moveIndex]).unwrap();
    this.position = Chess.fromSetup(setup).unwrap();
    const undoneMoves = this.history.length - moveIndex;
    this.history.splice(moveIndex);
    this.statesBefore.splice(moveIndex);
    this.sequence = this.history.length;
    this.lastMove = this.history.at(-1) || null;
    this.revision += 1;
    this.lastAction = "undo";

    return { ok: true, undoneMoves, state: this.snapshot() };
  }

  resign(side) {
    if (!(side in SIDES)) {
      return { ok: false, error: "你现在是观战者" };
    }
    if (this.gameOver) {
      return { ok: false, error: "本局已经结束" };
    }

    this.manualOutcome = { winner: OPPOSITE[side], endReason: "resign" };
    this.revision += 1;
    this.lastAction = "resign";
    return { ok: true, state: this.snapshot() };
  }

  agreeDraw() {
    if (this.gameOver) {
      return { ok: false, error: "本局已经结束" };
    }

    this.manualOutcome = { winner: null, endReason: "draw" };
    this.revision += 1;
    this.lastAction = "draw";
    return { ok: true, state: this.snapshot() };
  }
}

module.exports = { XiangqiGame };
