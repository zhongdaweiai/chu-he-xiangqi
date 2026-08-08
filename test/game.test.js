const test = require("node:test");
const assert = require("node:assert/strict");
const { XiangqiGame } = require("../game");

test("starts with red to move and standard legal destinations", () => {
  const game = new XiangqiGame();
  const state = game.snapshot();

  assert.equal(state.turn, "red");
  assert.deepEqual(state.legalMoves.a0.sort(), ["a1", "a2"]);
  assert.ok(state.legalMoves.b0.includes("a2"));
  assert.ok(state.legalMoves.b0.includes("c2"));
  assert.ok(state.legalMoves.b2.includes("b9"), "cannon can capture with exactly one screen");
});

test("rejects illegal movement and moving out of turn", () => {
  const game = new XiangqiGame();

  assert.equal(game.move("red", "a0", "b1").ok, false);
  assert.equal(game.move("black", "a9", "a8").ok, false);
  assert.equal(game.snapshot().sequence, 0);
});

test("plays a legal move and passes the turn", () => {
  const game = new XiangqiGame();
  const result = game.move("red", "a3", "a4");

  assert.equal(result.ok, true);
  assert.equal(result.move.capture, false);
  assert.equal(result.state.turn, "black");
  assert.equal(result.state.sequence, 1);
});

test("prevents exposing the two generals face to face", () => {
  const game = new XiangqiGame("4k4/9/9/9/9/9/4R4/9/9/4K4 w 0 1");

  assert.equal(game.move("red", "e3", "d3").ok, false);
  assert.equal(game.move("red", "e3", "e4").ok, true);
});

test("rejects a blocked horse leg", () => {
  const game = new XiangqiGame("3k5/9/9/9/9/9/9/9/1P7/1N2K4 w 0 1");

  assert.equal(game.move("red", "b0", "c2").ok, false);
  assert.equal(game.move("red", "b0", "a2").ok, false);
});

test("does not mistake an advanced pawn for a checking bishop", () => {
  const game = new XiangqiGame("2b1ka2r/N3a4/2P1b4/p7p/9/6p2/P7c/2r1C4/4A4/RNB1KABR1 b 1 16");
  const state = game.snapshot();

  assert.equal(state.inCheck, false);
  assert.ok(state.legalMoves.a6.includes("a5"));
  assert.ok(Object.values(state.legalMoves).flat().length > 2);
});

test("keeps bishops on their own side of the river", () => {
  const game = new XiangqiGame("3k5/9/9/9/9/2B6/9/9/9/4K4 w 0 1");
  const moves = game.snapshot().legalMoves.c4;

  assert.ok(moves.includes("e2"));
  assert.ok(!moves.includes("e6"));
  assert.ok(!moves.includes("a6"));
});
