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
