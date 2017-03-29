"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const index_1 = require("./index");
function setUp(done) {
    done();
}
exports.setUp = setUp;
function testBufferToString(test) {
    let int = new index_1.default(0xfffaffff, 0xfffff700);
    test.equal(int.toBuffer().toString('hex'), 'fffafffffffff700', 'Buffer to string conversion');
    test.done();
}
exports.testBufferToString = testBufferToString;
function testBufferCopy(test) {
    let src = new index_1.default(0xfffaffff, 0xfffff700);
    let dst = new Buffer(8);
    src.copy(dst);
    test.deepEqual(dst, new Buffer([0xff, 0xfa, 0xff, 0xff, 0xff, 0xff, 0xf7, 0x00]), 'Copy to buffer');
    test.done();
}
exports.testBufferCopy = testBufferCopy;
function testValueRepresentation(test) {
    let args = [
        [0], '0000000000000000', 0,
        [1], '0000000000000001', 1,
        [-1], 'ffffffffffffffff', -1,
        [1e18], '0de0b6b3a7640000', 1e18,
        ['0001234500654321'], '0001234500654321', 0x1234500654321,
        ['0ff1234500654321'], '0ff1234500654321', 0xff1234500654300,
        [0xff12345, 0x654321], '0ff1234500654321', 0xff1234500654300,
        [0xfffaffff, 0xfffff700], 'fffafffffffff700', -0x5000000000900,
        [0xafffffff, 0xfffff700], 'affffffffffff700', -0x5000000000000800,
        ['0x0000123450654321'], '0000123450654321', 0x123450654321,
        ['0xFFFFFFFFFFFFFFFF'], 'ffffffffffffffff', -1,
    ];
    for (let i = 0; i < args.length; i += 3) {
        let a = args[i], octets = args[i + 1], number = args[i + 2];
        let x;
        if (a instanceof Array) {
            if (a.length === 1) {
                x = new index_1.default(a[0]);
            }
            else if (a.length === 2) {
                x = new index_1.default(a[0], a[1]);
            }
        }
        else {
            x = new index_1.default(a);
        }
        test.equal(x.toOctetString(), octets, 'Constuctor with ' + args.join(', '));
        test.equal(x.toNumber(true), number);
    }
    test.done();
}
exports.testValueRepresentation = testValueRepresentation;
function testBufferOffsets(test) {
    let sourceBuffer = new Buffer(16);
    sourceBuffer.writeUInt32BE(0xfffaffff, 2);
    sourceBuffer.writeUInt32BE(0xfffff700, 6);
    let int = new index_1.default(sourceBuffer, 2);
    assert.equal(int.toBuffer().toString('hex'), 'fffafffffffff700', 'Construct from offset');
    let targetBuffer = new Buffer(16);
    int.copy(targetBuffer, 4);
    assert.equal(targetBuffer.slice(4, 12).toString('hex'), 'fffafffffffff700', 'Copy to offset');
    test.done();
}
exports.testBufferOffsets = testBufferOffsets;
function testInstanceOf(test) {
    let x = new index_1.default();
    assert(x instanceof index_1.default, 'Variable is not instance of Int64');
    let y = {};
    assert(!(y instanceof index_1.default), 'Object is an instance of Int64');
    test.done();
}
exports.testInstanceOf = testInstanceOf;
function testCompare(test) {
    let intMin = new index_1.default(2147483648, 0);
    let intMinPlusOne = new index_1.default(2147483648, 1);
    let zero = new index_1.default(0, 0);
    let intMaxMinusOne = new index_1.default(2147483647, 4294967294);
    let intMax = new index_1.default(2147483647, 4294967295);
    assert(intMin.compare(intMinPlusOne) < 0, "INT64_MIN is not less than INT64_MIN+1");
    assert(intMin.compare(zero) < 0, "INT64_MIN is not less than 0");
    assert(intMax.compare(new index_1.default(intMin.compare(zero))) > 0, "INT64_MIN is not less than INT64_MAX");
    assert(intMax.compare(intMaxMinusOne) > 0, "INT64_MAX is not greater than INT64_MAX-1");
    assert(intMax.compare(zero) > 0, "INT64_MAX is not greater than 0");
    assert(intMax.compare(intMin) > 0, "INT64_MAX is not greater than INT_MIN");
    test.done();
}
exports.testCompare = testCompare;
function testEquals(test) {
    let intMin = new index_1.default(2147483648, 0);
    let zero = new index_1.default(0, 0);
    let intMax = new index_1.default(2147483647, 4294967295);
    assert(intMin.equals(intMin), "INT64_MIN !== INT64_MIN");
    assert(intMax.equals(intMax), "INT64_MAX !== INT64_MAX");
    assert(zero.equals(zero), "0 !== 0");
    assert(!intMin.equals(zero), "INT64_MIN === 0");
    assert(!intMin.equals(intMax), "INT64_MIN === INT64_MAX");
    assert(!intMax.equals(zero), "INT64_MAX === 0");
    assert(!intMax.equals(intMin), "INT64_MAX === INT64_MIN");
    test.done();
}
exports.testEquals = testEquals;
//# sourceMappingURL=test.js.map