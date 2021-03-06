//     Copyright (c) 2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

/**
 * Support for handling 64-bit int numbers in Javascript (node.js)
 *
 * JS Numbers are IEEE-754 binary double-precision floats, which limits the
 * range of values that can be represented with integer precision to:
 *
 * 2^^53 <= N <= 2^53
 *
 * Int64 objects wrap a node Buffer that holds the 8-bytes of int64 data.  These
 * objects operate directly on the buffer which means that if they are created
 * using an existing buffer then setting the value will modify the Buffer, and
 * vice-versa.
 *
 * Internal Representation
 *
 * The internal buffer format is Big Endian.  I.e. the most-significant byte is
 * at buffer[0], the least-significant at buffer[7].  For the purposes of
 * converting to/from JS native numbers, the value is assumed to be a signed
 * integer stored in 2's complement form.
 *
 * For details about IEEE-754 see:
 * http://en.wikipedia.org/wiki/Double_precision_floating-point_format
 */

// For to/from DecimalString
const POW2_24 = Math.pow(2, 24)
const POW2_31 = Math.pow(2, 31)
const POW2_32 = Math.pow(2, 32)
const POW10_11 = Math.pow(10, 11)

// Useful masks and values for bit twiddling
// const MASK31 =  0x7fffffff
// const VAL31 = 0x80000000
// const MASK32 =  0xffffffff
const VAL32 = 0x100000000

// Map for converting hex octets to strings
const _HEX: string[] = []
for (let i = 0; i < 256; i++) {
  _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16)
}

//
// Int64
//

/**
 * Constructor accepts any of the following argument types, it no longer supports Browserify:
 *
 * new Int64(buffer[, offset=0]) - Existing Buffer with byte offset
 * new Int64(Uint8Array[, offset=0]) - Existing Uint8Array with a byte offset
 * new Int64(string)             - Hex string (throws if n is outside int64 range)
 * new Int64(number)             - Number (throws if n is outside int64 range)
 * new Int64(hi, lo)             - Raw bits as two 32-bit values
 */
export default class Int64 {
  // Max integer value that JS can accurately represent
  static MAX_INT = Math.pow(2, 53)
  // Min integer value that JS can accurately represent
  static MIN_INT = -Math.pow(2, 53)

  public buffer: Buffer
  public offset: number

  constructor()
  constructor(a1: string|number)
  constructor(a1: number, a2?: number)
  constructor(a1: Buffer, offset?: number)
  constructor(a1?: Buffer|string|number, a2: number = 0) {
    if (a1 instanceof Buffer) {
      this.buffer = a1
      this.offset = a2
    } else {
      this.buffer = this.buffer || Buffer.alloc(8)
      this.offset = 0
      this.setValue.apply(this, arguments)
    }
  }

  /**
   * Do in-place 2's compliment.  See
   * http://en.wikipedia.org/wiki/Two's_complement
   */
  private _2scomp(): void {
    const b = this.buffer
    const o = this.offset
    let carry = 1
    for (let i = o + 7; i >= o; i--) {
      let v = (b[i] ^ 0xff) + carry
      b[i] = v & 0xff
      carry = v >> 8
    }
  }

  /**
   * Set the value. Takes any of the following arguments:
   *
   * setValue(string) - A hexidecimal string
   * setValue(number) - Number (throws if n is outside int64 range)
   * setValue(hi, lo) - Raw bits as two 32-bit values
   */
  setValue(hi: string): void
  setValue(hi: number): void
  setValue(hi: number, lo: number): void
  setValue(hi: string|number, lo?: number): void {
    let negate = false
    if (arguments.length === 1) {
      if (typeof hi === 'number') {
        // Simplify bitfield retrieval by using abs() value.  We restore sign
        // later
        negate = hi < 0
        hi = Math.abs(hi)
        lo = hi % VAL32
        hi = hi / VAL32
        if (hi > VAL32) { throw new RangeError(hi  + ' is outside Int64 range') }
        hi = hi | 0
      } else if (typeof hi === 'string') {
        hi = (hi + '').replace(/^0x/, '')
        const loStr = hi.substr(-8)
        hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : ''
        hi = parseInt(hi, 16) as number
        lo = parseInt(loStr, 16)
      } else {
        throw new Error(hi + ' must be a Number or String')
      }
    }
    // Tell ts that we've converted hi and lo to nums
    lo = lo as number
    hi = hi as number

    // Technically we should throw if hi or lo is outside int32 range here, but
    // it's not worth the effort. Anything past the 32'nd bit is ignored.

    // Copy bytes to buffer
    const b = this.buffer
    const o = this.offset
    for (let i = 7; i >= 0; i--) {
      b[o + i] = lo & 0xff
      lo = i === 4 ? hi : lo >>> 8
    }

    // Restore sign of passed argument
    if (negate) { this._2scomp() }
  }

  /**
   * Convert to a native JS number.
   *
   * WARNING: Do not expect this value to be accurate to integer precision for
   * large (positive or negative) numbers!
   *
   * @param allowImprecise If true, no check is performed to verify the
   * returned value is accurate to integer precision.  If false, imprecise
   * numbers (very large positive or negative numbers) will be forced to +/-
   * Infinity.
   */
  toNumber(allowImprecise: boolean = false): number {
    const b = this.buffer
    const o = this.offset

    // Running sum of octets, doing a 2's complement
    const negate = b[o] & 0x80
    let x = 0
    let carry = 1
    for (let i = 7, m = 1; i >= 0; i--, m *= 256) {
      let v = b[o + i]

      // 2's complement for negative numbers
      if (negate) {
        v = (v ^ 0xff) + carry
        carry = v >> 8
        v = v & 0xff
      }

      x += v * m
    }

    // Return Infinity if we've lost integer precision
    if (!allowImprecise && x >= Int64.MAX_INT) {
      return negate ? -Infinity : Infinity
    }

    return negate ? -x : x
  }

  /**
   * Alias toNumber()
   * Convert to a JS Number. Returns +/-Infinity for values that can't be
   * represented to integer precision.
   */
  valueOf(): number {
    return this.toNumber(false)
  }

  /**
   * Return string value
   *
   * @param radix Just like Number#toString()'s radix
   */
  toString(radix: number = 10) {
    return this.valueOf().toString(radix)
  }

  /**
   * Return a string showing the buffer octets, with MSB on the left.
   *
   * @param sep separator string. default is '' (empty string)
   */
  toOctetString(sep: string = '') {
    const out = new Array(8)
    const b = this.buffer
    const o = this.offset
    for (let i = 0; i < 8; i++) {
      out[i] = _HEX[b[o + i]]
    }
    return out.join(sep)
  }

  /**
   * Returns the int64's 8 bytes in a buffer.
   *
   * @param {bool} [rawBuffer=false]  If no offset and this is true, return the internal buffer.  Should only be used if
   *                                  you're discarding the Int64 afterwards, as it breaks encapsulation.
   */
  toBuffer(rawBuffer: boolean = false) {
    if (rawBuffer && this.offset === 0) { return this.buffer }

    let out = Buffer.alloc(8)
    this.buffer.copy(out, 0, this.offset, this.offset + 8)
    return out
  }

  /**
   * Copy 8 bytes of int64 into target buffer at target offset.
   *
   * @param {Buffer} targetBuffer       Buffer to copy into.
   * @param {number} [targetOffset=0]   Offset into target buffer.
   */
  copy(targetBuffer: Buffer, targetOffset: number = 0) {
    this.buffer.copy(targetBuffer, targetOffset, this.offset, this.offset + 8)
  }

  /**
   * Returns a number indicating whether this comes before or after or is the
   * same as the other in sort order.
   *
   * @param {Int64} other  Other Int64 to compare.
   */
  compare(other: Int64): number {

    // If sign bits differ ...
    // tslint:disable-next-line
    if ((this.buffer[this.offset] & 0x80) != (other.buffer[other.offset] & 0x80)) {
      return other.buffer[other.offset] - this.buffer[this.offset]
    }

    // otherwise, compare bytes lexicographically
    for (let i = 0; i < 8; i++) {
      if (this.buffer[this.offset + i] !== other.buffer[other.offset + i]) {
        return this.buffer[this.offset + i] - other.buffer[other.offset + i]
      }
    }
    return 0
  }

  /**
   * Returns a boolean indicating if this integer is equal to other.
   *
   * @param {Int64} other  Other Int64 to compare.
   */
  equals(other: Int64) {
    return this.compare(other) === 0
  }

  /**
   * Pretty output in console.log
   */
  inspect(): string {
    return `[Int64 value: ${this} octets: ${this.toOctetString(' ')}]`
  }

  // TODO: Test
  // Factored in from node-thrift
  toDecimalString(): string {
    let b = this.buffer
    let o = this.offset
    if ((!b[o] && !(b[o + 1] & 0xe0)) ||
        (!~b[o] && !~(b[o + 1] & 0xe0))) {
      // The magnitude is small enough.
      return this.toString()
    } else {
      let negative = b[o] & 0x80
      if (negative) {
        // 2's complement
        let incremented = false
        let buffer = Buffer.alloc(8)
        for (let i = 7; i >= 0; --i) {
          buffer[i] = (~b[o + i] + (incremented ? 0 : 1)) & 0xff
          incremented =  incremented || !!b[o + i]
        }
        b = buffer
      }
      let high2 = b[o + 1] + (b[o] << 8)
      // Lesser 11 digits with exceeding values but is under 53 bits capacity.
      let low = b[o + 7] + (b[o + 6] << 8) + (b[o + 5] << 16)
          + b[o + 4] * POW2_24  // Bit shift renders 32th bit as sign, so use multiplication
          + (b[o + 3] + (b[o + 2] << 8)) * POW2_32 + high2 * 74976710656  // The literal is 2^48 % 10^11
      // 12th digit and greater.
      let high = Math.floor(low / POW10_11) + high2 * 2814  // The literal is 2^48 / 10^11
      // Make it exactly 11 with leading zeros.
      const lowStr = ('00000000000' + String(low % POW10_11)).slice(-11)
      return (negative ? '-' : '') + String(high) + lowStr
    }
  }
  // TODO: Test
  static fromDecimalString(text: string): Int64 {
    let negative = text.charAt(0) === '-'
    if (text.length < (negative ? 17 : 16)) {
      // The magnitude is smaller than 2^53.
      return new Int64(+text)
    } else if (text.length > (negative ? 20 : 19)) {
      throw new RangeError('Too many digits for Int64: ' + text)
    } else {
      // Most significant (up to 5) digits
      let high5 = +text.slice(negative ? 1 : 0, -15)
      let low = +text.slice(-15) + high5 * 2764472320  // The literal is 10^15 % 2^32
      let high = Math.floor(low / POW2_32) + high5 * 232830  // The literal is 10^15 / 2^&32
      low = low % POW2_32
      if (high >= POW2_31 &&
          !(negative && high === POW2_31 && low === 0)  // Allow minimum Int64
         ) {
        throw new RangeError('The magnitude is too large for Int64.')
      }
      if (negative) {
        // 2's complement
        high = ~high
        if (low === 0) {
          high = (high + 1) & 0xffffffff
        } else {
          low = ~low + 1
        }
        high = 0x80000000 | high
      }
      return new Int64(high, low)
    }
  }
}
