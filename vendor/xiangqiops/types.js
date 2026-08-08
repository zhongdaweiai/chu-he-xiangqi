"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULES = exports.isNormal = exports.ROLES = exports.COLORS = void 0;
exports.COLORS = ["white", "black"];
exports.ROLES = [
    "pawn",
    "advisor",
    "bishop",
    "knight",
    "cannon",
    "rook",
    "king",
];
// export function isDrop(v: Move): v is DropMove {
//   return "role" in v;
// }
function isNormal(v) {
    return "from" in v;
}
exports.isNormal = isNormal;
exports.RULES = ["chess"];
//# sourceMappingURL=types.js.map