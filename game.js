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

class XiangqiGame {
  constructor(initialFen) {
    if (initialFen) {
      const setup = fen.parseFen(initialFen).unwrap();
      this.position = Chess.fromSetup(setup).unwrap();
    } else {
      this.position = Chess.default();
    }

    this.history = [];
    this.sequence = 0;
    this.lastMove = null;
  }

  get turn() {
    return COLORS[this.position.turn];
  }

  legalMoves() {
    const moves = {};
    for (const [from, destinations] of this.position.allDests()) {
      moves[makeSquare(from)] = Array.from(destinations, (to) => makeSquare(to));
    }
    return moves;
  }

  snapshot() {
    const outcome = this.position.outcome();
    return {
      fen: this.position.fen(),
      turn: this.turn,
      legalMoves: this.legalMoves(),
      inCheck: this.position.isCheck(),
      gameOver: this.position.isEnd(),
      winner: outcome && outcome.winner ? COLORS[outcome.winner] : null,
      history: this.history.slice(-12),
      lastMove: this.lastMove,
      sequence: this.sequence,
    };
  }

  move(side, fromName, toName) {
    if (!(side in SIDES)) {
      return { ok: false, error: "你现在是观战者" };
    }
    if (this.position.isEnd()) {
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
    this.position.play(move);
    this.sequence += 1;
    this.lastMove = {
      from: fromName,
      to: toName,
      side,
      role: piece.role,
      capture: Boolean(captured),
      sequence: this.sequence,
    };
    this.history.push(this.lastMove);

    return { ok: true, move: this.lastMove, state: this.snapshot() };
  }
}

module.exports = { XiangqiGame };
