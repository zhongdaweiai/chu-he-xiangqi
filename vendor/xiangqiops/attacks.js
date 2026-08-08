"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.between = exports.blockerCannon = exports.blockerBishop = exports.blockerRook = exports.blockerKnight = exports.ray = exports.attacks = exports.advisorAttacks = exports.cannonAttacksAndMoves = exports.cannonAttacks = exports.rookAttacks = exports.pawnAttacks = exports.bishopAttacks = exports.knightAttacks = exports.kingAttacks = void 0;
const util_1 = require("./util");
const squareSet_1 = require("./squareSet");
const kingZone = squareSet_1.SquareSet.empty()
    .set(3, true)
    .set(4, true)
    .set(5, true)
    .set(12, true)
    .set(13, true)
    .set(14, true)
    .set(21, true)
    .set(22, true)
    .set(23, true)
    .set(86, true)
    .set(85, true)
    .set(84, true)
    .set(77, true)
    .set(76, true)
    .set(75, true)
    .set(68, true)
    .set(67, true)
    .set(66, true);
function computeRange(square, deltas) {
    let range = squareSet_1.SquareSet.empty();
    for (const delta of deltas) {
        const sq = square + delta;
        if (0 <= sq &&
            sq < 90 &&
            Math.abs((0, util_1.squareFile)(square) - (0, util_1.squareFile)(sq)) <= 2) {
            range = range.with(sq);
        }
    }
    return range;
}
function computeKnightAndBishop(square, objs, opcupid) {
    // console.log("Occupid: ", opcupid)
    let range = squareSet_1.SquareSet.empty();
    for (const ob of objs) {
        if (!opcupid.has(square + ob.barrierSquare)) {
            for (const delta of ob.range) {
                const sq = square + delta;
                if (0 <= sq &&
                    sq < 90 &&
                    Math.abs((0, util_1.squareFile)(square) - (0, util_1.squareFile)(sq)) <= 2) {
                    range = range.with(sq);
                }
            }
        }
    }
    return range;
}
function tabulate(f) {
    const table = [];
    for (let square = 0; square < 90; square++)
        table[square] = f(square);
    return table;
}
function tabulateWithOccupid(opcupidInit, f) {
    const table = [];
    for (let square = 0; square < 90; square++)
        table[square] = f(square, opcupidInit);
    return table;
}
const KING_ATTACKS = tabulate((sq) => computeRange(sq, [9, -9, -1, 1, 9]));
// const BISHOP_ATTACKS = tabulate(sq => computeRange(sq, [-20, -16, 16, 20]));
const ADVISOR_ATTACKS = tabulate((sq) => computeRange(sq, [-10, -8, 8, 10]));
// const KNIGHT_ATTACKS = tabulate(sq => computeKnight(sq, [{barrierSquare: -9, range: [-19, -17]}, {barrierSquare: -1, range: [7, -11]}, {barrierSquare: 1, range: [11, -7]}, {barrierSquare: 9, range: [19, 17]}  ]));
const PAWN_ATTACKS = {
    white: tabulate((sq) => computeRange(sq, [-1, 9, 1])),
    black: tabulate((sq) => computeRange(sq, [-1, -9, 1])),
};
const PAWN_ATTACKS_HOME = {
    white: tabulate((sq) => computeRange(sq, [9])),
    black: tabulate((sq) => computeRange(sq, [-9])),
};
function kingAttacks(square) {
    // console.log(square)
    return KING_ATTACKS[square].intersect(kingZone);
}
exports.kingAttacks = kingAttacks;
function knightAttacks(square, occupied) {
    return tabulateWithOccupid(occupied, (sq, opcupid) => computeKnightAndBishop(sq, [
        { barrierSquare: -9, range: [-19, -17] },
        { barrierSquare: -1, range: [7, -11] },
        { barrierSquare: 1, range: [11, -7] },
        { barrierSquare: 9, range: [19, 17] },
    ], opcupid))[square];
}
exports.knightAttacks = knightAttacks;
function bishopAttacks(square, occupied) {
    return tabulateWithOccupid(occupied, (sq, opcupid) => computeKnightAndBishop(sq, [
        { barrierSquare: -10, range: [-20] },
        { barrierSquare: -8, range: [-16] },
        { barrierSquare: 10, range: [20] },
        { barrierSquare: 8, range: [16] },
    ], opcupid))[square];
}
exports.bishopAttacks = bishopAttacks;
function pawnAttacks(color, square) {
    if (((0, util_1.squareRank)(square) <= 4 && color === "white") ||
        ((0, util_1.squareRank)(square) >= 5 && color === "black")) {
        return PAWN_ATTACKS_HOME[color][square];
    }
    return PAWN_ATTACKS[color][square];
}
exports.pawnAttacks = pawnAttacks;
const FILE_RANGE = tabulate((sq) => squareSet_1.SquareSet.fromFile((0, util_1.squareFile)(sq)).without(sq));
const RANK_RANGE = tabulate((sq) => squareSet_1.SquareSet.fromRank((0, util_1.squareRank)(sq)).without(sq));
// console.log(FILE_RANGE)
// console.log(RANK_RANGE)
const DIAG_RANGE = tabulate((sq) => {
    const diag = new squareSet_1.SquareSet(134480385, 2151686160, 2151686160);
    const shift = 9 * ((0, util_1.squareRank)(sq) - (0, util_1.squareFile)(sq));
    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});
const ANTI_DIAG_RANGE = tabulate((sq) => {
    const diag = new squareSet_1.SquareSet(270549120, 16909320, 16909320);
    const shift = 8 * ((0, util_1.squareRank)(sq) + (0, util_1.squareFile)(sq) - 7);
    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});
function hyperbola(bit, range, occupied) {
    let forward = occupied.intersect(range);
    let reverse = forward.bswap64(); // Assumes no more than 1 bit per rank
    forward = forward.minus64(bit);
    reverse = reverse.minus64(bit.bswap64());
    forward = forward.xor(reverse.bswap64());
    return forward.intersect(range);
}
//     1000
// 00000100
// 00000010
// 00000001
function fileAttacks(square, occupied) {
    return hyperbola(squareSet_1.SquareSet.fromSquare(square), FILE_RANGE[square], occupied);
}
function rankAttacks(square, occupied) {
    const range = RANK_RANGE[square];
    let forward = occupied.intersect(range);
    let reverse = forward.rbit64();
    forward = forward.minus64(squareSet_1.SquareSet.fromSquare(square));
    // forward.showBoard()
    reverse = reverse.minus64(squareSet_1.SquareSet.fromSquare(89 - square));
    // reverse.showBoard()
    forward = forward.xor(reverse.rbit64());
    // console.log(forward)
    // forward.showBoard()
    return forward.intersect(range);
}
// export function bishopAttacks(square: Square, occupied: SquareSet): SquareSet {
//   const bit = SquareSet.fromSquare(square);
//   return hyperbola(bit, DIAG_RANGE[square], occupied).xor(hyperbola(bit, ANTI_DIAG_RANGE[square], occupied));
// }
function rookAttacks(square, occupied) {
    // console.log("fileAttac: ")
    // fileAttacks(square, occupied).showBoard()
    return fileAttacks(square, occupied).xor(rankAttacks(square, occupied));
}
exports.rookAttacks = rookAttacks;
function cannonAttacks(square, occupied) {
    let initSquare = squareSet_1.SquareSet.empty();
    const topSquare = [];
    for (let i = square; i < 90; i = i + 9) {
        if (occupied.has(i)) {
            topSquare.push(i);
        }
    }
    if (topSquare.length > 2) {
        initSquare = initSquare.set(topSquare[2], true);
    }
    const botSquare = [];
    for (let i = square; i >= 0; i = i - 9) {
        if (occupied.has(i)) {
            botSquare.push(i);
        }
    }
    if (botSquare.length > 2) {
        initSquare = initSquare.set(botSquare[2], true);
    }
    const leftSquare = [];
    for (let i = square; (0, util_1.squareRank)(i) === (0, util_1.squareRank)(square); i = i - 1) {
        if (occupied.has(i)) {
            leftSquare.push(i);
        }
    }
    if (leftSquare.length > 2) {
        initSquare = initSquare.set(leftSquare[2], true);
    }
    const rightSquare = [];
    for (let i = square; (0, util_1.squareRank)(i) === (0, util_1.squareRank)(square); i = i + 1) {
        if (occupied.has(i)) {
            rightSquare.push(i);
        }
    }
    if (rightSquare.length > 2) {
        initSquare = initSquare.set(rightSquare[2], true);
    }
    // console.log(leftSquare)
    // console.log(rightSquare)
    // console.log(topSquare)
    // console.log(botSquare)
    // initSquare.set(rightSquare[1], true).showBoard()
    // console.log(initSquare)
    return initSquare;
}
exports.cannonAttacks = cannonAttacks;
function cannonAttacksAndMoves(square, occupied) {
    const movesOnly = rookAttacks(square, occupied).diff(occupied);
    const attackOnly = cannonAttacks(square, occupied);
    return movesOnly.union(attackOnly);
}
exports.cannonAttacksAndMoves = cannonAttacksAndMoves;
function advisorAttacks(square, occupied) {
    return ADVISOR_ATTACKS[square].intersect(kingZone);
}
exports.advisorAttacks = advisorAttacks;
function attacks(piece, square, occupied) {
    switch (piece.role) {
        case "pawn":
            return pawnAttacks(piece.color, square);
        case "knight":
            return knightAttacks(square, occupied);
        case "bishop":
            return bishopAttacks(square, occupied);
        case "rook":
            return rookAttacks(square, occupied);
        case "advisor":
            return advisorAttacks(square, occupied);
        case "cannon":
            return cannonAttacks(square, occupied);
        case "king":
            return kingAttacks(square);
    }
}
exports.attacks = attacks;
function ray(a, b) {
    const other = squareSet_1.SquareSet.fromSquare(b);
    if (RANK_RANGE[a].intersects(other))
        return RANK_RANGE[a].with(a);
    if (ANTI_DIAG_RANGE[a].intersects(other))
        return ANTI_DIAG_RANGE[a].with(a);
    if (DIAG_RANGE[a].intersects(other))
        return DIAG_RANGE[a].with(a);
    if (FILE_RANGE[a].intersects(other))
        return FILE_RANGE[a].with(a);
    return squareSet_1.SquareSet.empty();
}
exports.ray = ray;
function blockerKnight(knight, target) {
    if (knight - target === -19 || knight - target === -17)
        return squareSet_1.SquareSet.fromSquare(knight + 9);
    if (knight - target === 7 || knight - target === -11)
        return squareSet_1.SquareSet.fromSquare(knight + 1);
    if (knight - target === 11 || knight - target === -7)
        return squareSet_1.SquareSet.fromSquare(knight - 1);
    if (knight - target === 19 || knight - target === 17)
        return squareSet_1.SquareSet.fromSquare(knight - 9);
    return squareSet_1.SquareSet.empty();
}
exports.blockerKnight = blockerKnight;
function blockerRook(rook, target) {
    return rookAttacks(rook, squareSet_1.SquareSet.empty())
        .intersect(rookAttacks(target, squareSet_1.SquareSet.empty()))
        .without(rook)
        .without(target);
}
exports.blockerRook = blockerRook;
function blockerBishop(bishop, target) {
    if (bishop - target === 20)
        return squareSet_1.SquareSet.fromSquare(bishop - 10);
    if (bishop - target === 16)
        return squareSet_1.SquareSet.fromSquare(bishop - 8);
    if (bishop - target === -20)
        return squareSet_1.SquareSet.fromSquare(bishop + 10);
    if (bishop - target === -16)
        return squareSet_1.SquareSet.fromSquare(bishop + 8);
    return squareSet_1.SquareSet.empty();
}
exports.blockerBishop = blockerBishop;
function blockerCannon(cannon, target) {
    return blockerRook(cannon, target);
}
exports.blockerCannon = blockerCannon;
function between(a, b) {
    return ray(a, b)
        .intersect(squareSet_1.SquareSet.full().shl64(a).xor(squareSet_1.SquareSet.full().shl64(b)))
        .withoutFirst();
}
exports.between = between;
//# sourceMappingURL=attacks.js.map