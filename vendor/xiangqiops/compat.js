"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lichessVariantRules = exports.scalachessCharPair = exports.chessgroundMove = exports.chessgroundDests = void 0;
const util_1 = require("./util");
function chessgroundDests(pos, opts) {
    const result = new Map();
    const ctx = pos.ctx();
    for (const [from, squares] of pos.allDests(ctx)) {
        if (squares.isEmpty())
            continue;
        // Chessground needs both types of castling dests and filters based on a
        // rookCastles setting.
        const d = Array.from(squares, util_1.makeSquare);
        if (!(opts === null || opts === void 0 ? void 0 : opts.chess960) && from === ctx.king && (0, util_1.squareFile)(from) === 4) {
            if (squares.has(0))
                d.push("c1");
            else if (squares.has(56))
                d.push("c8");
            if (squares.has(7))
                d.push("g1");
            else if (squares.has(63))
                d.push("g8");
        }
        result.set((0, util_1.makeSquare)(from), d);
    }
    return result;
}
exports.chessgroundDests = chessgroundDests;
function chessgroundMove(move) {
    return [(0, util_1.makeSquare)(move.from), (0, util_1.makeSquare)(move.to)];
}
exports.chessgroundMove = chessgroundMove;
function scalachessCharPair(move) {
    return String.fromCharCode(35 + move.from, 35 + move.to);
}
exports.scalachessCharPair = scalachessCharPair;
function lichessVariantRules(variant) {
    switch (variant) {
        case "standard":
        case "fromPosition":
            return "chess";
        default:
            return variant;
    }
}
exports.lichessVariantRules = lichessVariantRules;
//# sourceMappingURL=compat.js.map