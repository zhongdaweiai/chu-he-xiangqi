"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chess = exports.Position = exports.PositionError = exports.IllegalSetup = void 0;
const result_1 = require("@badrap/result");
const compat_1 = require("./compat");
const fen_1 = require("./fen");
const squareSet_1 = require("./squareSet");
const board_1 = require("./board");
const attacks_1 = require("./attacks");
const util_1 = require("./util");
var IllegalSetup;
(function (IllegalSetup) {
    IllegalSetup["Empty"] = "ERR_EMPTY";
    IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
    IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
    IllegalSetup["Kings"] = "ERR_KINGS";
    IllegalSetup["Variant"] = "ERR_VARIANT";
})(IllegalSetup = exports.IllegalSetup || (exports.IllegalSetup = {}));
class PositionError extends Error {
}
exports.PositionError = PositionError;
function attacksTo(square, attacker, board, occupied) {
    let knightAttackerBoard = squareSet_1.SquareSet.empty();
    for (const knightSquare of board.knight.intersect(board[attacker])) {
        if ((0, attacks_1.knightAttacks)(knightSquare, occupied).has(square)) {
            knightAttackerBoard = knightAttackerBoard.set(knightSquare, true);
        }
    }
    let pawnAttackerBoard = squareSet_1.SquareSet.empty();
    for (const pawnSquare of board.pawn.intersect(board[attacker])) {
        if ((0, attacks_1.pawnAttacks)(attacker, pawnSquare).has(square))
            pawnAttackerBoard = pawnAttackerBoard.set(pawnSquare, true);
    }
    let bishopAttackerBoard = squareSet_1.SquareSet.empty();
    for (const bishopSquare of board.pawn.intersect(board[attacker])) {
        if ((0, attacks_1.bishopAttacks)(bishopSquare, occupied).has(square))
            bishopAttackerBoard = bishopAttackerBoard.set(bishopSquare, true);
    }
    let advisorAttackerBoard = squareSet_1.SquareSet.empty();
    for (const advisorSquare of board.pawn.intersect(board[attacker])) {
        if ((0, attacks_1.advisorAttacks)(advisorSquare, occupied).has(square))
            advisorAttackerBoard = advisorAttackerBoard.set(advisorSquare, true);
    }
    const rookAttackerBoard = (0, attacks_1.rookAttacks)(square, occupied).intersect(board.rook);
    const cannonAttackerBoard = (0, attacks_1.cannonAttacks)(square, occupied).intersect(board.cannon);
    // let kingFaceKingBoard = board.kingFaceKing() ? board.king : SquareSet.empty()
    return board[attacker].intersect(rookAttackerBoard
        .union(cannonAttackerBoard)
        .union(knightAttackerBoard)
        .union(pawnAttackerBoard)
        .union(bishopAttackerBoard)
        .union(advisorAttackerBoard)
    // .union(kingFaceKingBoard)
    );
}
class Position {
    constructor(rules) {
        this.rules = rules;
    }
    // abstract hasInsufficientMaterial(color: Color): boolean;
    kingAttackers(square, attacker, occupied) {
        // attacksTo(square, attacker, this.board, occupied).showBoard()
        return attacksTo(square, attacker, this.board, occupied);
    }
    dropDests(_ctx) {
        return squareSet_1.SquareSet.empty();
    }
    playCaptureAt(square, captured) {
        this.halfmoves = 0;
        if (this.pockets)
            this.pockets[(0, util_1.opposite)(captured.color)][captured.role]++;
    }
    ctx() {
        const variantEnd = this.isVariantEnd();
        const king = this.board.kingOf(this.turn);
        if (!(0, util_1.defined)(king))
            return {
                king,
                blockers: squareSet_1.SquareSet.empty(),
                checkers: squareSet_1.SquareSet.empty(),
                variantEnd,
            };
        // console.log("CANNON & KING")
        // this.board.occupied.showBoard()
        // cannonAttacks(king, this.board.occupied).showBoard()
        // this.board.cannon.showBoard()
        const snipers = (0, attacks_1.rookAttacks)(king, squareSet_1.SquareSet.empty())
            .intersect(this.board.rook)
            .union((0, attacks_1.cannonAttacks)(king, this.board.occupied).intersect(this.board.cannon))
            .union((0, attacks_1.knightAttacks)(king, squareSet_1.SquareSet.empty()).intersect(this.board.knight))
            .intersect(this.board[(0, util_1.opposite)(this.turn)]);
        // console.log("Snipers")
        // snipers.showBoard()
        let blockers = squareSet_1.SquareSet.empty();
        for (const sniper of snipers) {
            const b = (0, attacks_1.between)(king, sniper).intersect(this.board.occupied);
            if (!b.moreThanOne())
                blockers = blockers.union(b);
        }
        const checkers = this.kingAttackers(king, (0, util_1.opposite)(this.turn), this.board.occupied);
        return {
            king,
            blockers,
            checkers,
            variantEnd,
        };
    }
    // The following should be identical in all subclasses
    clone() {
        var _a, _b;
        const pos = new this.constructor();
        pos.board = this.board.clone();
        pos.pockets = (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone();
        pos.turn = this.turn;
        pos.remainingChecks = (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone();
        pos.halfmoves = this.halfmoves;
        pos.fullmoves = this.fullmoves;
        return pos;
    }
    toSetup() {
        var _a, _b;
        return {
            board: this.board.clone(),
            pockets: (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone(),
            turn: this.turn,
            remainingChecks: (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone(),
            halfmoves: Math.min(this.halfmoves, 150),
            fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
        };
    }
    // isInsufficientMaterial(): boolean {
    //   return COLORS.every(color => this.hasInsufficientMaterial(color));
    // }
    hasDests(ctx) {
        ctx = ctx || this.ctx();
        for (const square of this.board[this.turn]) {
            // console.log("from square: ", square)
            if (this.dests(square, ctx).nonEmpty())
                return true;
        }
        return this.dropDests(ctx).nonEmpty();
    }
    isLegal(move, ctx) {
        const dests = this.dests(move.from, ctx);
        return dests.has(move.to) || dests.has(this.normalizeMove(move).to);
    }
    isCheck() {
        const king = this.board.kingOf(this.turn);
        return ((0, util_1.defined)(king) &&
            (this.kingAttackers(king, (0, util_1.opposite)(this.turn), this.board.occupied).nonEmpty() ||
                this.board.kingFaceKing(this.board.occupied)));
    }
    checking() {
        const king = this.board.kingOf((0, util_1.opposite)(this.turn));
        return ((0, util_1.defined)(king) &&
            (this.kingAttackers(king, this.turn, this.board.occupied).nonEmpty() ||
                this.board.kingFaceKing(this.board.occupied)));
    }
    isEnd(ctx) {
        if (ctx ? ctx.variantEnd : this.isVariantEnd())
            return true;
        return !this.hasDests(ctx);
    }
    isCheckmate(ctx) {
        ctx = ctx || this.ctx();
        // console.log(this.hasDests(ctx))
        return !ctx.variantEnd && !this.hasDests(ctx);
    }
    isStalemate(ctx) {
        ctx = ctx || this.ctx();
        return !ctx.variantEnd && ctx.checkers.isEmpty() && !this.hasDests(ctx);
    }
    outcome(ctx) {
        const variantOutcome = this.variantOutcome(ctx);
        if (variantOutcome)
            return variantOutcome;
        ctx = ctx || this.ctx();
        if (this.isCheckmate(ctx))
            return { winner: (0, util_1.opposite)(this.turn) };
        else if (this.isStalemate(ctx))
            return { winner: undefined };
        else
            return;
    }
    allDests(ctx) {
        ctx = ctx || this.ctx();
        const d = new Map();
        if (ctx.variantEnd) {
            return d;
        }
        for (const square of this.board[this.turn]) {
            d.set(square, this.dests(square, ctx));
        }
        return d;
    }
    normalizeMove(move) {
        return move;
    }
    play(move) {
        // console.log("Play move: ", move)
        const turn = this.turn;
        this.halfmoves += 1;
        if (turn === "black")
            this.fullmoves += 1;
        this.turn = (0, util_1.opposite)(turn);
        const piece = this.board.take(move.from);
        if (!piece)
            return;
        const capture = this.board.set(move.to, piece);
        if (capture)
            this.playCaptureAt(move.to, capture);
    }
}
exports.Position = Position;
class Chess extends Position {
    constructor(rules) {
        super(rules || "chess");
    }
    static default() {
        const pos = new this();
        pos.board = board_1.Board.default();
        pos.pockets = undefined;
        pos.turn = "white";
        pos.remainingChecks = undefined;
        pos.halfmoves = 0;
        pos.fullmoves = 1;
        return pos;
    }
    static fromSetup(setup, validate = true) {
        const pos = new this();
        pos.board = setup.board.clone();
        pos.pockets = undefined;
        pos.turn = setup.turn;
        pos.remainingChecks = undefined;
        pos.halfmoves = setup.halfmoves;
        pos.fullmoves = setup.fullmoves;
        return pos.validate(validate).map((_) => pos);
    }
    clone() {
        return super.clone();
    }
    validate(check = true) {
        if (check) {
            // console.log(this.turn)
            if (this.board.occupied.isEmpty())
                return result_1.Result.err(new PositionError(IllegalSetup.Empty));
            if (this.board.king.size() !== 2)
                return result_1.Result.err(new PositionError(IllegalSetup.Kings));
            // if (!defined(this.board.kingOf(this.turn))) return Result.err(new PositionError(IllegalSetup.Kings));
            const otherKing = this.board.kingOf((0, util_1.opposite)(this.turn));
            if (!(0, util_1.defined)(otherKing))
                return result_1.Result.err(new PositionError(IllegalSetup.Kings));
            // if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            //   return Result.err(new PositionError(IllegalSetup.OppositeCheck));
            // }
            // if (SquareSet.backranks().intersects(this.board.pawn)) {
            //   return Result.err(new PositionError(IllegalSetup.PawnsOnBackrank));
            // }
        }
        return result_1.Result.ok(undefined);
    }
    pseudoDests(square, ctx) {
        if (ctx.variantEnd)
            return squareSet_1.SquareSet.empty();
        const piece = this.board.get(square);
        if (!piece || piece.color !== this.turn)
            return squareSet_1.SquareSet.empty();
        let pseudo = (0, attacks_1.attacks)(piece, square, this.board.occupied);
        if (piece.role === "pawn") {
            const captureTargets = this.board[(0, util_1.opposite)(this.turn)];
            pseudo = pseudo.intersect(captureTargets);
            const delta = this.turn === "white" ? 8 : -8;
            const step = square + delta;
            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
                pseudo = pseudo.with(step);
                const canDoubleStep = this.turn === "white" ? square < 16 : square >= 64 - 16;
                const doubleStep = step + delta;
                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
                    pseudo = pseudo.with(doubleStep);
                }
            }
            return pseudo;
        }
        else {
            pseudo = pseudo.diff(this.board[this.turn]);
        }
        return pseudo;
    }
    dests(square, ctx) {
        ctx = ctx || this.ctx();
        if (ctx.variantEnd)
            return squareSet_1.SquareSet.empty();
        const piece = this.board.get(square);
        if (!piece || piece.color !== this.turn)
            return squareSet_1.SquareSet.empty();
        let pseudo;
        if (piece.role === "pawn")
            pseudo = (0, attacks_1.pawnAttacks)(this.turn, square);
        else if (piece.role === "bishop")
            pseudo = (0, attacks_1.bishopAttacks)(square, this.board.occupied);
        else if (piece.role === "knight")
            pseudo = (0, attacks_1.knightAttacks)(square, this.board.occupied);
        else if (piece.role === "rook")
            pseudo = (0, attacks_1.rookAttacks)(square, this.board.occupied);
        else if (piece.role === "advisor")
            pseudo = (0, attacks_1.advisorAttacks)(square, this.board.occupied);
        else if (piece.role === "cannon")
            pseudo = (0, attacks_1.cannonAttacksAndMoves)(square, this.board.occupied);
        else
            pseudo = (0, attacks_1.kingAttacks)(square);
        pseudo = pseudo.diff(this.board[this.turn]);
        if ((0, util_1.defined)(ctx.king)) {
            // console.log(this)
            for (const to of pseudo) {
                const nextChess = this.clone();
                nextChess.play({ from: square, to: to });
                if (nextChess.checking()) {
                    pseudo = pseudo.without(to);
                }
            }
            // console.log("PIECE MOVEABLE: ", piece, square)
            // pseudo.showBoard()
        }
        // if (legal) pseudo = pseudo.union(legal);
        return pseudo;
    }
    toDests() {
        return (0, compat_1.chessgroundDests)(this);
    }
    fen() {
        return (0, fen_1.makeFen)(this.toSetup());
    }
    fen_fix() {
        const parts = (0, fen_1.makeFen)(this.toSetup()).split(" ");
        return parts.slice(0, 2).join(" ");
    }
    isVariantEnd() {
        return false;
    }
    variantOutcome(_ctx) {
        return;
    }
}
exports.Chess = Chess;
//# sourceMappingURL=chess.js.map