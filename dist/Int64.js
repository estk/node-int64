var MASK31 = 0x7fffffff, VAL31 = 0x80000000;
var MASK32 = 0xffffffff, VAL32 = 0x100000000;
var _HEX = [];
for (var i = 0; i < 256; i++) {
    _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16);
}
var Int64 = module.exports = function (a1, a2) {
    if (a1 instanceof Buffer) {
        this.buffer = a1;
        this.offset = a2 || 0;
    }
    else if (Object.prototype.toString.call(a1) == '[object Uint8Array]') {
        this.buffer = new Buffer(a1);
        this.offset = a2 || 0;
    }
    else {
        this.buffer = this.buffer || new Buffer(8);
        this.offset = 0;
        this.setValue.apply(this, arguments);
    }
};
Int64.MAX_INT = Math.pow(2, 53);
Int64.MIN_INT = -Math.pow(2, 53);
Int64.prototype = {
    constructor: Int64,
    _2scomp: function () {
        var b = this.buffer, o = this.offset, carry = 1;
        for (var i = o + 7; i >= o; i--) {
            var v = (b[i] ^ 0xff) + carry;
            b[i] = v & 0xff;
            carry = v >> 8;
        }
    },
    setValue: function (hi, lo) {
        var negate = false;
        if (arguments.length == 1) {
            if (typeof (hi) == 'number') {
                negate = hi < 0;
                hi = Math.abs(hi);
                lo = hi % VAL32;
                hi = hi / VAL32;
                if (hi > VAL32)
                    throw new RangeError(hi + ' is outside Int64 range');
                hi = hi | 0;
            }
            else if (typeof (hi) == 'string') {
                hi = (hi + '').replace(/^0x/, '');
                lo = hi.substr(-8);
                hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
                hi = parseInt(hi, 16);
                lo = parseInt(lo, 16);
            }
            else {
                throw new Error(hi + ' must be a Number or String');
            }
        }
        var b = this.buffer, o = this.offset;
        for (var i = 7; i >= 0; i--) {
            b[o + i] = lo & 0xff;
            lo = i == 4 ? hi : lo >>> 8;
        }
        if (negate)
            this._2scomp();
    },
    toNumber: function (allowImprecise) {
        var b = this.buffer, o = this.offset;
        var negate = b[o] & 0x80, x = 0, carry = 1;
        for (var i = 7, m = 1; i >= 0; i--, m *= 256) {
            var v = b[o + i];
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
    },
    valueOf: function () {
        return this.toNumber(false);
    },
    toString: function (radix) {
        return this.valueOf().toString(radix || 10);
    },
    toOctetString: function (sep) {
        var out = new Array(8);
        var b = this.buffer, o = this.offset;
        for (var i = 0; i < 8; i++) {
            out[i] = _HEX[b[o + i]];
        }
        return out.join(sep || '');
    },
    toBuffer: function (rawBuffer) {
        if (rawBuffer && this.offset === 0)
            return this.buffer;
        var out = new Buffer(8);
        this.buffer.copy(out, 0, this.offset, this.offset + 8);
        return out;
    },
    copy: function (targetBuffer, targetOffset) {
        this.buffer.copy(targetBuffer, targetOffset || 0, this.offset, this.offset + 8);
    },
    compare: function (other) {
        if ((this.buffer[this.offset] & 0x80) != (other.buffer[other.offset] & 0x80)) {
            return other.buffer[other.offset] - this.buffer[this.offset];
        }
        for (var i = 0; i < 8; i++) {
            if (this.buffer[this.offset + i] !== other.buffer[other.offset + i]) {
                return this.buffer[this.offset + i] - other.buffer[other.offset + i];
            }
        }
        return 0;
    },
    equals: function (other) {
        return this.compare(other) === 0;
    },
    inspect: function () {
        return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
    }
};
//# sourceMappingURL=Int64.js.map