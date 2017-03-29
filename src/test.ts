import assert = require('assert')
import Int64 from './index'
import {Test} from 'nodeunit'

export function setUp(done: Function) {
  done()
}

export function testBufferToString(test: Test) {
  let int = new Int64(0xfffaffff, 0xfffff700)
  test.equal(
    int.toBuffer().toString('hex'),
    'fffafffffffff700',
    'Buffer to string conversion',
  )
  test.done()
}

export function testBufferCopy(test: Test) {
  let src = new Int64(0xfffaffff, 0xfffff700)
  let dst = Buffer.alloc(8)

  src.copy(dst)

  test.deepEqual(
    dst,
    Buffer.from([0xff, 0xfa, 0xff, 0xff, 0xff, 0xff, 0xf7, 0x00]),
    'Copy to buffer',
  )

  test.done()
}

export function testValueRepresentation(test: Test) {
  let args = [
    [0],                     '0000000000000000', 0,
    [1],                     '0000000000000001', 1,
    [-1],                    'ffffffffffffffff', -1,
    [1e18],                  '0de0b6b3a7640000', 1e18,
    ['0001234500654321'],    '0001234500654321',     0x1234500654321,
    ['0ff1234500654321'],    '0ff1234500654321',   0xff1234500654300, // Imprecise!
    [0xff12345, 0x654321],   '0ff1234500654321',   0xff1234500654300, // Imprecise!
    [0xfffaffff, 0xfffff700], 'fffafffffffff700',    -0x5000000000900,
    [0xafffffff, 0xfffff700], 'affffffffffff700', -0x5000000000000800, // Imprecise!
    ['0x0000123450654321'],  '0000123450654321',      0x123450654321,
    ['0xFFFFFFFFFFFFFFFF'],  'ffffffffffffffff', -1,
  ]

  // Test constructor argments

  for (let i = 0; i < args.length; i += 3) {
    let a = args[i]
    const octets = args[i + 1]
    const num = args[i + 2]

    // Create instance

    let x: Int64
    if (a instanceof Array) {
      if (a.length === 1) {
        x = new Int64(a[0])
      } else if (a.length === 2) {
        a = a as number[]
        x = new Int64(a[0], a[1])
      } else {
        throw new Error("Invalid arg count")
      }
    } else {
      x = new Int64(a)
    }

    test.equal(x.toOctetString(), octets, 'Constuctor with ' + args.join(', '))
    test.equal(x.toNumber(true), num)
  }

  test.done()
}

export function testBufferOffsets(test: Test) {
  let sourceBuffer = Buffer.alloc(16)
  sourceBuffer.writeUInt32BE(0xfffaffff, 2)
  sourceBuffer.writeUInt32BE(0xfffff700, 6)

  let int = new Int64(sourceBuffer, 2)
  assert.equal(
    int.toBuffer().toString('hex'), 'fffafffffffff700',
    'Construct from offset',
  )

  let targetBuffer = Buffer.alloc(16)
  int.copy(targetBuffer, 4)
  assert.equal(
    targetBuffer.slice(4, 12).toString('hex'), 'fffafffffffff700',
    'Copy to offset',
  )

  test.done()
}

export function testInstanceOf(test: Test) {
  let x = new Int64()
  assert(x instanceof Int64, 'Variable is not instance of Int64')
  let y = {}
  assert(!(y instanceof Int64), 'Object is an instance of Int64')
  test.done()
}

export function testCompare(test: Test) {
  let intMin = new Int64(2147483648, 0)
  let intMinPlusOne = new Int64(2147483648, 1)
  let zero = new Int64(0, 0)
  let intMaxMinusOne = new Int64(2147483647, 4294967294)
  let intMax = new Int64(2147483647, 4294967295)
  assert(intMin.compare(intMinPlusOne) < 0, "INT64_MIN is not less than INT64_MIN+1")
  assert(intMin.compare(zero) < 0, "INT64_MIN is not less than 0")
  assert(intMax.compare(new Int64(intMin.compare(zero))) > 0, "INT64_MIN is not less than INT64_MAX")
  assert(intMax.compare(intMaxMinusOne) > 0, "INT64_MAX is not greater than INT64_MAX-1")
  assert(intMax.compare(zero) > 0, "INT64_MAX is not greater than 0")
  assert(intMax.compare(intMin) > 0, "INT64_MAX is not greater than INT_MIN")
  test.done()
}

export function testEquals(test: Test) {
  let intMin = new Int64(2147483648, 0)
  let zero = new Int64(0, 0)
  let intMax = new Int64(2147483647, 4294967295)
  assert(intMin.equals(intMin), "INT64_MIN !== INT64_MIN")
  assert(intMax.equals(intMax), "INT64_MAX !== INT64_MAX")
  assert(zero.equals(zero), "0 !== 0")
  assert(!intMin.equals(zero), "INT64_MIN === 0")
  assert(!intMin.equals(intMax), "INT64_MIN === INT64_MAX")
  assert(!intMax.equals(zero), "INT64_MAX === 0")
  assert(!intMax.equals(intMin), "INT64_MAX === INT64_MIN")
  test.done()
}
