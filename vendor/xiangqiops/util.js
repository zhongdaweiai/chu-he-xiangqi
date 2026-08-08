"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.key2pos = exports.fixXiangqiSan = exports.makeUci = exports.parseUci = exports.makeSquare = exports.parseSquare = exports.charToRole = exports.roleToChar = exports.squareFile = exports.squareRank = exports.opposite = exports.defined = exports.RANKS = exports.FILES = void 0;
exports.FILES = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
];
exports.RANKS = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
];
function defined(v) {
    return v !== undefined;
}
exports.defined = defined;
function opposite(color) {
    return color === "white" ? "black" : "white";
}
exports.opposite = opposite;
function squareRank(square) {
    return Math.floor(square / 9);
}
exports.squareRank = squareRank;
function squareFile(square) {
    return square % 9;
}
exports.squareFile = squareFile;
function roleToChar(role) {
    switch (role) {
        case "pawn":
            return "p";
        case "knight":
            return "n";
        case "bishop":
            return "b";
        case "rook":
            return "r";
        case "advisor":
            return "a";
        case "cannon":
            return "c";
        case "king":
            return "k";
    }
}
exports.roleToChar = roleToChar;
function charToRole(ch) {
    switch (ch) {
        case "P":
        case "p":
            return "pawn";
        case "N":
        case "n":
            return "knight";
        case "B":
        case "b":
            return "bishop";
        case "R":
        case "r":
            return "rook";
        case "A":
        case "a":
            return "advisor";
        case "C":
        case "c":
            return "cannon";
        case "K":
        case "k":
            return "king";
        default:
            return;
    }
}
exports.charToRole = charToRole;
function parseSquare(str) {
    if (str.length !== 2)
        return;
    const file = str.charCodeAt(0) - "a".charCodeAt(0);
    const rank = str.charCodeAt(1) - "0".charCodeAt(0);
    if (file < 0 || file >= 10 || rank < 0 || rank >= 10)
        return;
    return file + 9 * rank;
}
exports.parseSquare = parseSquare;
function makeSquare(square) {
    return (exports.FILES[squareFile(square)] + exports.RANKS[squareRank(square)]);
}
exports.makeSquare = makeSquare;
function parseUci(str) {
    if (str.length === 4 || str.length === 5) {
        const from = parseSquare(str.slice(0, 2));
        const to = parseSquare(str.slice(2, 4));
        if (defined(from) && defined(to))
            return { from, to };
    }
    return;
}
exports.parseUci = parseUci;
function makeUci(move) {
    return makeSquare(move.from) + makeSquare(move.to);
}
exports.makeUci = makeUci;
function fixXiangqiSan(san, color) {
    let isBlack = color == "black";
    let step = san.replace(/x/g, "");
    let piece = step.slice(0, 1);
    switch (piece) {
        case "C":
            piece = "P";
            break;
        case "c":
            piece = "P";
            break;
        case "N":
            piece = "M";
            break;
        case "n":
            piece = "n";
            break;
        case "R":
            piece = "X";
            break;
        case "r":
            piece = "X";
            break;
        case "P":
            piece = "B";
            break;
        case "p":
            piece = "B";
            break;
        case "K":
            piece = "Tg";
            break;
        case "k":
            piece = "Tg";
            break;
        case "A":
            piece = "S";
            break;
        case "a":
            piece = "a";
            break;
        case "B":
            piece = "T";
            break;
        case "b":
            piece = "T";
            break;
        default:
            piece = "?";
    }
    // console.log("Step: ", step)
    let posOrig = key2pos(step.slice(1, 3));
    let posDest = key2pos(step.slice(3, 5));
    if (!isBlack) {
        posOrig = [10 - posOrig[0], 11 - posOrig[1]];
        posDest = [10 - posDest[0], 11 - posDest[1]];
    }
    let viTri = "";
    if (step.slice(-1) === "t" || step.slice(-1) === "s") {
        viTri = step.slice(-1);
    }
    else if (step.slice(-1) === "g") {
        if (step.slice(-2) === "tg" || step.slice(-2) === "sg") {
            viTri = step.slice(-2);
        }
        else {
            viTri = step.slice(-1);
        }
    }
    if (posOrig[1] == posDest[1])
        return piece + viTri + posOrig[0] + "-" + posDest[0];
    else {
        if (piece === "M" || piece === "T" || piece === "S") {
            if (posDest[1] > posOrig[1])
                return piece + viTri + posOrig[0] + "/" + posDest[0];
            else
                return piece + viTri + posOrig[0] + "." + posDest[0];
        }
        else {
            if (posDest[1] < posOrig[1])
                return piece + viTri + posOrig[0] + "." + (posOrig[1] - posDest[1]);
            else
                return piece + viTri + posOrig[0] + "/" + (posDest[1] - posOrig[1]);
        }
    }
}
exports.fixXiangqiSan = fixXiangqiSan;
function key2pos(k) {
    const shift = 1; //first rank is 0
    return [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48 + shift];
}
exports.key2pos = key2pos;
//# sourceMappingURL=util.js.map