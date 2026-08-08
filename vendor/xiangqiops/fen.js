"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFen = exports.makeRemainingChecks = exports.makePockets = exports.makePocket = exports.makeBoardFen = exports.makePiece = exports.parsePiece = exports.parseFen = exports.parseRemainingChecks = exports.parsePockets = exports.parseBoardFen = exports.FenError = exports.InvalidFen = exports.EMPTY_FEN = exports.EMPTY_EPD = exports.EMPTY_BOARD_FEN = exports.INITIAL_FEN = exports.INITIAL_EPD = exports.INITIAL_BOARD_FEN = void 0;
const result_1 = require("@badrap/result");
const types_1 = require("./types");
const board_1 = require("./board");
const setup_1 = require("./setup");
const util_1 = require("./util");
exports.INITIAL_BOARD_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";
exports.INITIAL_EPD = exports.INITIAL_BOARD_FEN + " w";
exports.INITIAL_FEN = exports.INITIAL_EPD + " 0 1";
exports.EMPTY_BOARD_FEN = "9/9/9/9/9/9/9/9/9/9";
exports.EMPTY_EPD = exports.EMPTY_BOARD_FEN + " w - -";
exports.EMPTY_FEN = exports.EMPTY_EPD + " 0 1";
var InvalidFen;
(function (InvalidFen) {
    InvalidFen["Fen"] = "ERR_FEN";
    InvalidFen["Board"] = "ERR_BOARD";
    InvalidFen["Pockets"] = "ERR_POCKETS";
    InvalidFen["Turn"] = "ERR_TURN";
    InvalidFen["Castling"] = "ERR_CASTLING";
    InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
    InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
    InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
})(InvalidFen = exports.InvalidFen || (exports.InvalidFen = {}));
class FenError extends Error {
}
exports.FenError = FenError;
function nthIndexOf(haystack, needle, n) {
    let index = haystack.indexOf(needle);
    while (n-- > 0) {
        if (index === -1)
            break;
        index = haystack.indexOf(needle, index + needle.length);
    }
    return index;
}
function parseSmallUint(str) {
    return /^\d{1,4}$/.test(str) ? parseInt(str, 10) : undefined;
}
function charToPiece(ch) {
    const role = (0, util_1.charToRole)(ch);
    return role && { role, color: ch.toLowerCase() === ch ? "black" : "white" };
}
function parseBoardFen(boardPart) {
    const board = board_1.Board.empty();
    let rank = 9;
    let file = 0;
    // console.log("BoardPart: ", boardPart)
    // console.log("BoardPart length: ", boardPart.length)
    for (let i = 0; i < boardPart.length; i++) {
        const c = boardPart[i];
        if (c === "/") {
            file = 0;
            rank--;
        }
        else {
            const step = parseInt(c, 10);
            // console.log("step:", c,  step)
            if (step > 0)
                file += step;
            else {
                // console.log("File, Rank=", file, rank)
                if (file > 9 || rank < 0)
                    return result_1.Result.err(new FenError(InvalidFen.Board));
                const square = file + rank * 9;
                const piece = charToPiece(c);
                if (!piece)
                    return result_1.Result.err(new FenError(InvalidFen.Board));
                // if (boardPart[i + 1] === '~') {
                //   piece.promoted = true;
                //   i++;
                // }
                // console.log(c)
                // console.log(piece, square)
                board.set(square, piece);
                file++;
            }
        }
    }
    // console.log(board)
    // board.occupied.showBoard()
    if (rank !== 0 || file !== 9)
        return result_1.Result.err(new FenError(InvalidFen.Board));
    return result_1.Result.ok(board);
}
exports.parseBoardFen = parseBoardFen;
function parsePockets(pocketPart) {
    if (pocketPart.length > 64)
        return result_1.Result.err(new FenError(InvalidFen.Pockets));
    const pockets = setup_1.Material.empty();
    for (const c of pocketPart) {
        const piece = charToPiece(c);
        if (!piece)
            return result_1.Result.err(new FenError(InvalidFen.Pockets));
        pockets[piece.color][piece.role]++;
    }
    return result_1.Result.ok(pockets);
}
exports.parsePockets = parsePockets;
function parseRemainingChecks(part) {
    const parts = part.split("+");
    if (parts.length === 3 && parts[0] === "") {
        const white = parseSmallUint(parts[1]);
        const black = parseSmallUint(parts[2]);
        if (!(0, util_1.defined)(white) || white > 3 || !(0, util_1.defined)(black) || black > 3)
            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
        return result_1.Result.ok(new setup_1.RemainingChecks(3 - white, 3 - black));
    }
    else if (parts.length === 2) {
        const white = parseSmallUint(parts[0]);
        const black = parseSmallUint(parts[1]);
        if (!(0, util_1.defined)(white) || white > 3 || !(0, util_1.defined)(black) || black > 3)
            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
        return result_1.Result.ok(new setup_1.RemainingChecks(white, black));
    }
    else
        return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
}
exports.parseRemainingChecks = parseRemainingChecks;
function parseFen(fen, learn = false) {
    const parts = fen.split(" ");
    const boardPart = parts.shift();
    // Board and pockets
    let board, pockets = result_1.Result.ok(undefined);
    if (boardPart.endsWith("]")) {
        const pocketStart = boardPart.indexOf("[");
        if (pocketStart === -1)
            return result_1.Result.err(new FenError(InvalidFen.Fen));
        board = parseBoardFen(boardPart.substr(0, pocketStart));
        pockets = parsePockets(boardPart.substr(pocketStart + 1, boardPart.length - 1 - pocketStart - 1));
    }
    else {
        const pocketStart = nthIndexOf(boardPart, "/", 9);
        if (pocketStart === -1)
            board = parseBoardFen(boardPart);
        else {
            board = parseBoardFen(boardPart.substr(0, pocketStart));
            pockets = parsePockets(boardPart.substr(pocketStart + 1));
        }
    }
    // Turn
    let turn;
    const turnPart = parts.shift();
    if (!(0, util_1.defined)(turnPart) || turnPart === "w")
        turn = "white";
    else if (turnPart === "b")
        turn = "black";
    else
        return result_1.Result.err(new FenError(InvalidFen.Turn));
    return board.chain((board) => {
        // Halfmoves or remaining checks
        let halfmovePart = parts.shift();
        let earlyRemainingChecks;
        if ((0, util_1.defined)(halfmovePart) && halfmovePart.includes("+")) {
            earlyRemainingChecks = parseRemainingChecks(halfmovePart);
            halfmovePart = parts.shift();
        }
        const halfmoves = (0, util_1.defined)(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
        if (!(0, util_1.defined)(halfmoves))
            return result_1.Result.err(new FenError(InvalidFen.Halfmoves));
        const fullmovesPart = parts.shift();
        const fullmoves = (0, util_1.defined)(fullmovesPart)
            ? parseSmallUint(fullmovesPart)
            : 1;
        if (!(0, util_1.defined)(fullmoves))
            return result_1.Result.err(new FenError(InvalidFen.Fullmoves));
        const remainingChecksPart = parts.shift();
        let remainingChecks = result_1.Result.ok(undefined);
        if ((0, util_1.defined)(remainingChecksPart)) {
            if ((0, util_1.defined)(earlyRemainingChecks))
                return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
            remainingChecks = parseRemainingChecks(remainingChecksPart);
        }
        else if ((0, util_1.defined)(earlyRemainingChecks)) {
            remainingChecks = earlyRemainingChecks;
        }
        if (parts.length > 0)
            return result_1.Result.err(new FenError(InvalidFen.Fen));
        return pockets.chain((pockets) => remainingChecks.map((remainingChecks) => {
            return {
                board,
                pockets,
                turn,
                remainingChecks,
                halfmoves,
                fullmoves: Math.max(1, fullmoves),
            };
        }));
    });
}
exports.parseFen = parseFen;
function parsePiece(str) {
    if (!str)
        return;
    const piece = charToPiece(str[0]);
    if (!piece)
        return;
    // if (str.length === 2 && str[1] === '~') piece.promoted = true;
    else if (str.length > 1)
        return;
    return piece;
}
exports.parsePiece = parsePiece;
function makePiece(piece, opts) {
    // console.log("Piece: ", piece)
    let r = (0, util_1.roleToChar)(piece.role);
    // console.log("PIECE ROLE:", piece.role)
    if (piece.color === "white")
        r = r.toUpperCase();
    // if (opts?.promoted && piece.promoted) r += '~';
    return r;
}
exports.makePiece = makePiece;
function makeBoardFen(board, opts) {
    let fen = "";
    let empty = 0;
    // board.pieces("black", "rook").showBoard()
    for (let rank = 9; rank >= 0; rank--) {
        for (let file = 0; file < 9; file++) {
            const square = file + rank * 9;
            const piece = board.get(square);
            if (!piece)
                empty++;
            else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const mPiece = makePiece(piece, opts);
                // console.log(mPiece, rank, file, square)
                fen += mPiece;
            }
            if (file === 8) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                if (rank !== 0)
                    fen += "/";
            }
        }
    }
    return fen;
}
exports.makeBoardFen = makeBoardFen;
function makePocket(material) {
    return types_1.ROLES.map((role) => (0, util_1.roleToChar)(role).repeat(material[role])).join("");
}
exports.makePocket = makePocket;
function makePockets(pocket) {
    return makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
}
exports.makePockets = makePockets;
function makeRemainingChecks(checks) {
    return `${checks.white}+${checks.black}`;
}
exports.makeRemainingChecks = makeRemainingChecks;
function makeFen(setup, opts) {
    return [
        makeBoardFen(setup.board, opts) +
            (setup.pockets ? `[${makePockets(setup.pockets)}]` : ""),
        setup.turn[0],
        ...(setup.remainingChecks
            ? [makeRemainingChecks(setup.remainingChecks)]
            : []),
        ...((opts === null || opts === void 0 ? void 0 : opts.epd)
            ? []
            : [
                Math.max(0, Math.min(setup.halfmoves, 9999)),
                Math.max(1, Math.min(setup.fullmoves, 9999)),
            ]),
    ].join(" ");
}
exports.makeFen = makeFen;
//# sourceMappingURL=fen.js.map