"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Board = void 0;
const types_1 = require("./types");
const squareSet_1 = require("./squareSet");
const util_1 = require("./util");
const attacks_1 = require("./attacks");
class Board {
    constructor() { }
    static default() {
        const board = new Board();
        board.reset();
        return board;
    }
    reset() {
        this.occupied = new squareSet_1.SquareSet(2852651519, 1430257674, 0x3FE0041);
        this.white = new squareSet_1.SquareSet(2852651519, 10, 0);
        this.black = new squareSet_1.SquareSet(0, 1430257664, 0x3FE0041);
        this.pawn = new squareSet_1.SquareSet(2818572288, 1430257674, 0);
        this.knight = new squareSet_1.SquareSet(130, 0, 17039360);
        this.bishop = new squareSet_1.SquareSet(0x44, 0, 8912896);
        this.rook = new squareSet_1.SquareSet(0x101, 0, 33685504);
        this.advisor = new squareSet_1.SquareSet(0x28, 0x0, 5242880);
        this.cannon = new squareSet_1.SquareSet(34078720, 0x0, 0x41);
        this.king = new squareSet_1.SquareSet(0x10, 0x0, 2097152);
        // this.occupied.showBoard()
    }
    // 100000001
    // 000000000
    // 00000000
    static empty() {
        const board = new Board();
        board.clear();
        return board;
    }
    clear() {
        this.occupied = squareSet_1.SquareSet.empty();
        for (const color of types_1.COLORS)
            this[color] = squareSet_1.SquareSet.empty();
        for (const role of types_1.ROLES)
            this[role] = squareSet_1.SquareSet.empty();
    }
    clone() {
        const board = new Board();
        // console.log("clone")
        board.occupied = this.occupied;
        // board.occupied.showBoard()
        for (const color of types_1.COLORS)
            board[color] = this[color];
        for (const role of types_1.ROLES)
            board[role] = this[role];
        return board;
    }
    getColor(square) {
        if (this.white.has(square))
            return 'white';
        if (this.black.has(square))
            return 'black';
        return;
    }
    getRole(square) {
        for (const role of types_1.ROLES) {
            // console.log(role)
            // console.log(this[role])
            if (this[role].has(square))
                return role;
        }
        return;
    }
    get(square) {
        const color = this.getColor(square);
        if (!color)
            return;
        const role = this.getRole(square);
        return { color, role };
    }
    take(square) {
        const piece = this.get(square);
        if (piece) {
            this.occupied = this.occupied.without(square);
            this[piece.color] = this[piece.color].without(square);
            this[piece.role] = this[piece.role].without(square);
        }
        return piece;
    }
    set(square, piece) {
        const old = this.take(square);
        // console.log(square)
        this.occupied = this.occupied.with(square);
        this[piece.color] = this[piece.color].with(square);
        this[piece.role] = this[piece.role].with(square);
        return old;
    }
    has(square) {
        return this.occupied.has(square);
    }
    *[Symbol.iterator]() {
        for (const square of this.occupied) {
            yield [square, this.get(square)];
        }
    }
    pieces(color, role) {
        return this[color].intersect(this[role]);
    }
    rooksAndQueens() {
        // console.log("Rook And QUeens:, ", this.rook.union(this.advisor))
        return this.rook.union(this.advisor);
    }
    // rooks(): SquareSet {
    //   return this.rook
    // }
    bishopsAndQueens() {
        return this.bishop.union(this.advisor);
    }
    kingOf(color) {
        return this.king.intersect(this[color]).singleSquare();
    }
    kingFaceKing(occupied) {
        let kingWhite = this.kingOf("white");
        let kingBlack = this.kingOf("black");
        if (kingWhite && kingBlack) {
            let fileOfWhiteKing = (0, util_1.squareFile)(kingWhite);
            return squareSet_1.SquareSet.fromFile(fileOfWhiteKing).has(kingBlack) &&
                ((0, attacks_1.rookAttacks)(kingWhite, squareSet_1.SquareSet.fromSquare(kingBlack)).intersect((0, attacks_1.rookAttacks)(kingBlack, squareSet_1.SquareSet.fromSquare(kingWhite))).intersect(occupied).isEmpty());
        }
        return false;
    }
}
exports.Board = Board;
//# sourceMappingURL=board.js.map