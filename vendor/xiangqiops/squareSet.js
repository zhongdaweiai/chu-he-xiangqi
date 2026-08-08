"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareSet = void 0;
function popcnt32(n) {
    n = n - ((n >>> 1) & 1431655765);
    n = (n & 858993459) + ((n >>> 2) & 858993459);
    return Math.imul((n + (n >>> 4)) & 252645135, 16843009) >> 24;
}
function bswap32(n) {
    n = ((n >>> 8) & 16711935) | ((n & 16711935) << 8);
    return ((n >>> 16) & 0xffff) | ((n & 0xffff) << 16);
}
function rbit32(n) {
    n = ((n >>> 1) & 1431655765) | ((n & 1431655765) << 1);
    n = ((n >>> 2) & 858993459) | ((n & 858993459) << 2);
    n = ((n >>> 4) & 252645135) | ((n & 252645135) << 4);
    return bswap32(n);
}
class SquareSet {
    constructor(b1, b2, b3) {
        this.b1 = b1;
        this.b2 = b2;
        this.b3 = b3;
        this.b1 = b1 | 0;
        this.b2 = b2 | 0;
        this.b3 = b3 | 0;
    }
    static fromSquare(square) {
        return square >= 64
            ? new SquareSet(0, 0, 1 << (square - 64))
            : square >= 32
                ? new SquareSet(0, 1 << (square - 32), 0)
                : new SquareSet(1 << square, 0, 0);
    }
    static fromRank(rank) {
        return new SquareSet(511, 0, 0).shl64(9 * rank);
    }
    static fromFile(file) {
        return new SquareSet(134480385, 2151686160, 131328).shl64(file);
    }
    // 000000001
    // 000000001
    // 000000001
    // 000000001
    static empty() {
        return new SquareSet(0, 0, 0);
    }
    static full() {
        return new SquareSet(4294967295, 4294967295, 67108863);
    }
    static corners() {
        return new SquareSet(257, 0, 33685504);
    }
    showBoard() {
        this.print32(this.b1, this.b2, this.b3);
    }
    print32(b1, b2, b3) {
        var _a;
        b1 = (0 | b1) >>> 0;
        b2 = (0 | b2) >>> 0;
        b3 = (0 | b3) >>> 0;
        let b1FillNumber = Math.clz32(b1);
        b1FillNumber === 32 ? (b1FillNumber = 31) : b1FillNumber;
        let b2FillNumber = Math.clz32(b2);
        b2FillNumber === 32 ? (b2FillNumber = 31) : b2FillNumber;
        let b3FillNumber = Math.clz32(b3);
        b3FillNumber === 32 ? (b3FillNumber = 31) : b3FillNumber;
        let b1Text = Array(b1FillNumber).fill(0).join("") + b1.toString(2);
        let b2Text = Array(b2FillNumber).fill(0).join("") + b2.toString(2);
        let b3Text = (Array(b3FillNumber).fill(0).join("") + b3.toString(2)).slice(-26);
        let fullText = b3Text + b2Text + b1Text;
        let board = (_a = fullText
            .match(/.{1,9}/g)) === null || _a === void 0 ? void 0 : _a.map((x) => x.split("").reverse().join("")).join("\n");
        console.log(board);
    }
    complement() {
        return new SquareSet(~this.b1, ~this.b2, ~this.b3);
    } // bổ sung
    xor(other) {
        return new SquareSet(this.b1 ^ other.b1, this.b2 ^ other.b2, this.b3 ^ other.b3);
    } // không bao gồm trùng
    union(other) {
        return new SquareSet(this.b1 | other.b1, this.b2 | other.b2, this.b3 | other.b3);
    } // bao gồm tất cả
    intersect(other) {
        return new SquareSet(this.b1 & other.b1, this.b2 & other.b2, this.b3 & other.b3);
    } // giao nhau
    diff(other) {
        return new SquareSet(this.b1 & ~other.b1, this.b2 & ~other.b2, this.b3 & ~other.b3);
    } // loại trừ
    intersects(other) {
        return this.intersect(other).nonEmpty();
    } //co giao nhau hay không?
    isDisjoint(other) {
        return this.intersect(other).isEmpty();
    }
    supersetOf(other) {
        return other.diff(this).isEmpty();
    }
    subsetOf(other) {
        return this.diff(other).isEmpty();
    }
    shr64(shift) {
        if (shift >= 90)
            return SquareSet.empty();
        if (shift >= 64)
            return new SquareSet(this.b3 >>> (shift - 64), 0, 0);
        if (shift >= 32)
            return new SquareSet((this.b3 << (shift - 32)) ^ (this.b2 >>> (64 - shift)), this.b3 >> (shift - 32), 0);
        if (shift > 0)
            return new SquareSet((this.b1 >>> shift) ^ (this.b2 << (32 - shift)), (this.b2 >>> shift) ^ (this.b3 << (32 - shift)), this.b3 >> shift);
        return this;
    }
    shl64(shift) {
        // console.log(7*9)
        if (shift >= 90)
            return SquareSet.empty();
        if (shift >= 64)
            return new SquareSet(0, 0, this.b1 << (shift - 64));
        if (shift >= 32)
            return new SquareSet(0, this.b1 << (shift - 32), (this.b2 << (shift - 32)) ^ ((this.b1 >>> (64 - shift)) & 67108863));
        if (shift > 0)
            return new SquareSet(this.b1 << shift, (this.b2 << shift) ^ (this.b1 >>> (32 - shift)), ((this.b3 << shift) ^ (this.b2 >>> (32 - shift))) & 67108863);
        return this;
    }
    bswap64() {
        let b1 = (0 | this.b1) >>> 0;
        let b2 = (0 | this.b2) >>> 0;
        let b3 = (0 | this.b3) >>> 0;
        let b1BinaryArray = Array(Math.clz32(b1) === 32 ? 31 : Math.clz32(b1))
            .fill(0)
            .concat(b1.toString(2).split(""));
        let b2BinaryArray = Array(Math.clz32(b2) === 32 ? 31 : Math.clz32(b2))
            .fill(0)
            .concat(b2.toString(2).split(""));
        let b3BinaryArray = Array(Math.clz32(b3) === 32 ? 31 : Math.clz32(b3))
            .fill(0)
            .concat(b3.toString(2).split(""));
        let newB3 = parseInt(b1BinaryArray
            .slice(-9)
            .concat(b1BinaryArray.slice(14, 23))
            .concat(b1BinaryArray.slice(5, 13))
            .join(""), 2);
        let newB2 = parseInt(b1BinaryArray
            .slice(13, 14)
            .concat(b2BinaryArray.slice(-4))
            .concat(b1BinaryArray.slice(0, 5))
            .concat(b2BinaryArray.slice(19, 28))
            .concat(b2BinaryArray.slice(10, 19))
            .concat(b2BinaryArray.slice(1, 5))
            .join(""), 2);
        let newB1 = parseInt(b2BinaryArray
            .slice(5, 10)
            .concat(b3BinaryArray.slice(-8))
            .concat(b2BinaryArray.slice(0, 1))
            .concat(b3BinaryArray.slice(15, 24))
            .concat(b3BinaryArray.slice(6, 15))
            .join(""), 2);
        return new SquareSet(newB1, newB2, newB3);
    }
    rbit64() {
        let b1 = (0 | this.b1) >>> 0;
        let b2 = (0 | this.b2) >>> 0;
        let b3 = (0 | this.b3) >>> 0;
        let b1BinaryArray = Array(Math.clz32(b1) === 32 ? 31 : Math.clz32(b1))
            .fill(0)
            .concat(b1.toString(2).split(""));
        let b2BinaryArray = Array(Math.clz32(b2) === 32 ? 31 : Math.clz32(b2))
            .fill(0)
            .concat(b2.toString(2).split(""));
        let b3BinaryArray = Array(Math.clz32(b3) === 32 ? 31 : Math.clz32(b3))
            .fill(0)
            .concat(b3.toString(2).split(""));
        let newB3 = parseInt(b1BinaryArray.slice(-26).reverse().join(""), 2);
        let newB2 = parseInt(b1BinaryArray
            .slice(0, 6)
            .reverse()
            .concat(b2BinaryArray.slice(-26).reverse())
            .join(""), 2);
        let newB1 = parseInt(b2BinaryArray
            .slice(0, 6)
            .reverse()
            .concat(b3BinaryArray.slice(-26).reverse())
            .join(""), 2);
        return new SquareSet(newB1, newB2, newB3);
    }
    minus64(other) {
        let this_b1u = (this.b1 | 0) >>> 0;
        let other_b1u = (other.b1 | 0) >>> 0;
        let this_b2u = (this.b2 | 0) >>> 0;
        let other_b2u = (other.b2 | 0) >>> 0;
        let this_b3u = (this.b3 | 0) >>> 0;
        let other_b3u = (other.b3 | 0) >>> 0;
        const c = this_b1u < other_b1u ? 1 : 0;
        const d = this_b2u < other_b2u + c ? 1 : 0;
        // const d = ((b2 & other.b2 & 1) + (other.b2 >>> 1) + (b2 >>> 1)) >>> 31;
        // return new SquareSet(lo, this.hi - (other.hi + c));
        // console.log(this.b2 - other.b2)
        return new SquareSet(this_b1u - other_b1u, this_b2u - (other_b2u + c), this_b3u - (other_b3u + d));
    }
    equals(other) {
        return this.b1 === other.b1 && this.b2 === other.b2 && this.b3 === other.b3;
    }
    size() {
        return popcnt32(this.b1) + popcnt32(this.b2) + popcnt32(this.b3);
    }
    isEmpty() {
        return this.b1 === 0 && this.b2 === 0 && this.b3 === 0;
    }
    nonEmpty() {
        return this.b1 !== 0 || this.b2 !== 0 || this.b3 !== 0;
    }
    has(square) {
        return ((square >= 64
            ? this.b3 & (1 << (square - 64))
            : square >= 32
                ? this.b2 & (1 << (square - 32))
                : this.b1 & (1 << square)) !== 0);
    }
    set(square, on) {
        return on ? this.with(square) : this.without(square);
    }
    with(square) {
        return square >= 64
            ? new SquareSet(this.b1, this.b2, this.b3 | (1 << (square - 64)))
            : square >= 32
                ? new SquareSet(this.b1, this.b2 | (1 << (square - 32)), this.b3)
                : new SquareSet(this.b1 | (1 << square), this.b2, this.b3);
    }
    without(square) {
        return square >= 64
            ? new SquareSet(this.b1, this.b2, this.b3 & ~(1 << (square - 64)))
            : square >= 32
                ? new SquareSet(this.b1, this.b2 & ~(1 << (square - 32)), this.b3)
                : new SquareSet(this.b1 & ~(1 << square), this.b2, this.b3);
    }
    toggle(square) {
        return square >= 64
            ? new SquareSet(this.b1, this.b2, this.b3 ^ (1 << (square - 64)))
            : square >= 32
                ? new SquareSet(this.b1, this.b2 ^ (1 << (square - 32)), this.b3)
                : new SquareSet(this.b1 ^ (1 << square), this.b2, this.b3);
    }
    last() {
        // console.log("MATH:", Math.clz32(this.b3))
        if (this.b3 !== 0)
            return 89 - Math.clz32(this.b3) + 6;
        if (this.b2 !== 0)
            return 63 - Math.clz32(this.b2);
        if (this.b1 !== 0)
            return 31 - Math.clz32(this.b1);
        return;
    }
    first() {
        if (this.b1 !== 0)
            return 31 - Math.clz32(this.b1 & -this.b1);
        if (this.b2 !== 0)
            return 63 - Math.clz32(this.b2 & -this.b2);
        if (this.b3 !== 0)
            return 89 - Math.clz32(this.b3 & -this.b3) + 6;
        return;
    }
    withoutFirst() {
        if (this.b1 !== 0)
            return new SquareSet(this.b1 & (this.b1 - 1), this.b2, this.b3);
        if (this.b2 !== 0)
            return new SquareSet(0, this.b2 & (this.b1 - 1), this.b3);
        return new SquareSet(0, 0, this.b3 & (this.b3 - 1));
    }
    moreThanOne() {
        return ((this.b2 !== 0 && this.b1 !== 0) ||
            (this.b1 & (this.b1 - 1)) !== 0 ||
            (this.b2 & (this.b2 - 1)) !== 0);
    }
    singleSquare() {
        return this.moreThanOne() ? undefined : this.last();
    }
    isSingleSquare() {
        return this.nonEmpty() && !this.moreThanOne();
    }
    *[Symbol.iterator]() {
        let b1 = this.b1;
        let b2 = this.b2;
        let b3 = this.b3;
        while (b1 !== 0) {
            const idx = 31 - Math.clz32(b1 & -b1);
            b1 ^= 1 << idx;
            yield idx;
        }
        while (b2 !== 0) {
            const idx = 31 - Math.clz32(b2 & -b2);
            b2 ^= 1 << idx;
            yield 32 + idx;
        }
        while (b3 !== 0) {
            const idx = 31 - Math.clz32(b3 & -b3);
            b3 ^= 1 << idx;
            yield 64 + idx;
        }
    }
    *reversed() {
        let b1 = this.b1;
        let b2 = this.b2;
        let b3 = this.b3;
        while (b3 !== 0) {
            const idx = 31 - Math.clz32(b3);
            b3 ^= 1 << idx;
            yield 64 + idx;
        }
        while (b2 !== 0) {
            const idx = 31 - Math.clz32(b2);
            b2 ^= 1 << idx;
            yield 32 + idx;
        }
        while (b1 !== 0) {
            const idx = 31 - Math.clz32(b1);
            b1 ^= 1 << idx;
            yield idx;
        }
    }
}
exports.SquareSet = SquareSet;
//# sourceMappingURL=squareSet.js.map