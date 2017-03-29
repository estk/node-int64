"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VAL32 = 0x100000000;
const _HEX = [];
for (let i = 0; i < 256; i++) {
    _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16);
}
class Int64 {
    constructor(a1, a2 = 0) {
        if (a1 instanceof Buffer) {
            this.buffer = a1;
            this.offset = a2;
        }
        else {
            this.buffer = new Buffer(8);
            this.offset = a2;
            this.setValue.apply(this, arguments);
        }
    }
    _2scomp() {
        const b = this.buffer;
        const o = this.offset;
        let carry = 1;
        for (let i = o + 7; i >= o; i--) {
            let v = (b[i] ^ 0xff) + carry;
            b[i] = v & 0xff;
            carry = v >> 8;
        }
    }
    setValue(hi, lo) {
        let negate = false;
        if (arguments.length === 1) {
            if (typeof hi === 'number') {
                negate = hi < 0;
                hi = Math.abs(hi);
                lo = hi % VAL32;
                hi = hi / VAL32;
                if (hi > VAL32) {
                    throw new RangeError(hi + ' is outside Int64 range');
                }
                hi = hi | 0;
            }
            else if (typeof hi === 'string') {
                hi = (hi + '').replace(/^0x/, '');
                const loStr = hi.substr(-8);
                hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
                hi = parseInt(hi, 16);
                lo = parseInt(loStr, 16);
            }
            else {
                throw new Error(hi + ' must be a Number or String');
            }
        }
        lo = lo;
        hi = hi;
        const b = this.buffer;
        const o = this.offset;
        for (let i = 7; i >= 0; i--) {
            b[o + i] = lo & 0xff;
            lo = i === 4 ? hi : lo >>> 8;
        }
        if (negate) {
            this._2scomp();
        }
    }
    toNumber(allowImprecise = false) {
        const b = this.buffer;
        const o = this.offset;
        const negate = b[o] & 0x80;
        let x = 0;
        let carry = 1;
        for (let i = 7, m = 1; i >= 0; i--, m *= 256) {
            let v = b[o + i];
            if (negate) {
                v = (v ^ 0xff) + carry;
                carry = v >> 8;
                v = v & 0xff;
            }
            x += v * m;
        }
        if (!allowImprecise && x >= Int64.MAX_INT) {
            return negate ? -Infinity : Infinity;
        }
        return negate ? -x : x;
    }
    valueOf() {
        return this.toNumber(false);
    }
    toString(radix = 10) {
        return this.valueOf().toString(radix);
    }
    toOctetString(sep = '') {
        const out = new Array(8);
        const b = this.buffer;
        const o = this.offset;
        for (let i = 0; i < 8; i++) {
            out[i] = _HEX[b[o + i]];
        }
        return out.join(sep);
    }
    toBuffer(rawBuffer = false) {
        if (rawBuffer && this.offset === 0) {
            return this.buffer;
        }
        let out = new Buffer(8);
        console.log({ buf: this.buffer, off: this.offset });
        this.buffer.copy(out, 0, this.offset, this.offset + 8);
        return out;
    }
    copy(targetBuffer, targetOffset = 0) {
        this.buffer.copy(targetBuffer, targetOffset, this.offset, this.offset + 8);
    }
    compare(other) {
        if ((this.buffer[this.offset] & 0x80) != (other.buffer[other.offset] & 0x80)) {
            return other.buffer[other.offset] - this.buffer[this.offset];
        }
        for (let i = 0; i < 8; i++) {
            if (this.buffer[this.offset + i] !== other.buffer[other.offset + i]) {
                return this.buffer[this.offset + i] - other.buffer[other.offset + i];
            }
        }
        return 0;
    }
    equals(other) {
        return this.compare(other) === 0;
    }
    inspect() {
        return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
    }
}
Int64.MAX_INT = Math.pow(2, 53);
Int64.MIN_INT = -Math.pow(2, 53);
exports.default = Int64;
//# sourceMappingURL=index.js.map