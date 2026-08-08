"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSetup = exports.RemainingChecks = exports.Material = exports.MaterialSide = void 0;
const types_1 = require("./types");
const board_1 = require("./board");
class MaterialSide {
    constructor() { }
    static empty() {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = 0;
        return m;
    }
    static fromBoard(board, color) {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = board.pieces(color, role).size();
        return m;
    }
    clone() {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = this[role];
        return m;
    }
    add(other) {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = this[role] + other[role];
        return m;
    }
    nonEmpty() {
        return types_1.ROLES.some(role => this[role] > 0);
    }
    isEmpty() {
        return !this.nonEmpty();
    }
    hasPawns() {
        return this.pawn > 0;
    }
    hasNonPawns() {
        return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.advisor > 0 || this.king > 0;
    }
    count() {
        return this.pawn + this.knight + this.bishop + this.rook + this.advisor + this.cannon + this.king;
    }
}
exports.MaterialSide = MaterialSide;
class Material {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static empty() {
        return new Material(MaterialSide.empty(), MaterialSide.empty());
    }
    static fromBoard(board) {
        return new Material(MaterialSide.fromBoard(board, 'white'), MaterialSide.fromBoard(board, 'black'));
    }
    clone() {
        return new Material(this.white.clone(), this.black.clone());
    }
    add(other) {
        return new Material(this.white.add(other.white), this.black.add(other.black));
    }
    count() {
        return this.white.count() + this.black.count();
    }
    isEmpty() {
        return this.white.isEmpty() && this.black.isEmpty();
    }
    nonEmpty() {
        return !this.isEmpty();
    }
    hasPawns() {
        return this.white.hasPawns() || this.black.hasPawns();
    }
    hasNonPawns() {
        return this.white.hasNonPawns() || this.black.hasNonPawns();
    }
}
exports.Material = Material;
class RemainingChecks {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static default() {
        return new RemainingChecks(3, 3);
    }
    clone() {
        return new RemainingChecks(this.white, this.black);
    }
}
exports.RemainingChecks = RemainingChecks;
function defaultSetup() {
    return {
        board: board_1.Board.default(),
        pockets: undefined,
        turn: 'white',
        remainingChecks: undefined,
        halfmoves: 0,
        fullmoves: 1,
    };
}
exports.defaultSetup = defaultSetup;
//# sourceMappingURL=setup.js.map