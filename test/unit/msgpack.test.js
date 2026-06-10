'use strict';

define(['chai', 'ably'], function (chai, Ably) {
  const { expect } = chai;
  const msgpack = Ably.Realtime._MsgPack;

  // Detect if we're running the browser implementation (ArrayBuffer-based) or
  // the Node implementation (Buffer-based). This affects binary data tests and
  // some float edge cases (the Node fork doesn't handle Infinity or very large floats).
  var isBrowserImpl = (typeof Buffer === 'undefined');

  // Helper: convert encoded result to Uint8Array for byte-level comparison
  function toU8(encoded) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(encoded)) return new Uint8Array(encoded);
    return new Uint8Array(encoded);
  }

  // Helper: get byte length regardless of platform
  function getByteLength(encoded) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(encoded)) return encoded.length;
    return encoded.byteLength;
  }

  describe('msgpack', function () {
    // ========================================================
    // Existing tests (preserved as-is)
    // ========================================================
    describe('msgpack.encode() [existing]', function () {
      it('should handle emoji in strings', function () {
        const emoji = '😅🎉🚀';
        const encoded = new Uint8Array(msgpack.encode(emoji));
        expect(encoded).deep.to.equal(new Uint8Array([172, 240, 159, 152, 133, 240, 159, 142, 137, 240, 159, 154, 128]));
      });

      it('should handle special characters in strings', function () {
        const special = 'Hello\n\t\r"World"';
        const encoded = new Uint8Array(msgpack.encode(special));
        expect(encoded).deep.to.equal(
          new Uint8Array([175, 72, 101, 108, 108, 111, 10, 9, 13, 34, 87, 111, 114, 108, 100, 34]),
        );
      });

      it('should encode and then decode emojies in string', function () {
        const emoji = '😅🎉🚀';
        const encoded = msgpack.encode(emoji);
        const decoded = msgpack.decode(encoded);
        expect(emoji).to.equal(decoded);
      });

      it('should handle sparse encoding mode', function () {
        // In sparse mode, undefined and null are omitted from objects
        const obj = { a: 1, b: undefined, c: null, d: 2 };
        const encoded = msgpack.encode(obj, true);
        const decoded = msgpack.decode(encoded);
        // When sparse, undefined/null values are not encoded
        expect(decoded).to.not.have.property('b');
        expect(decoded).to.not.have.property('c');
        expect(decoded).to.have.property('a', 1);
        expect(decoded).to.have.property('d', 2);
      });
    });

    // ========================================================
    // New comprehensive tests
    // ========================================================

    describe('primitives', function () {
      it('should encode and decode true', function () {
        var encoded = msgpack.encode(true);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xc3]));
        expect(msgpack.decode(encoded)).to.equal(true);
      });

      it('should encode and decode false', function () {
        var encoded = msgpack.encode(false);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xc2]));
        expect(msgpack.decode(encoded)).to.equal(false);
      });

      it('should encode and decode null', function () {
        var encoded = msgpack.encode(null);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xc0]));
        expect(msgpack.decode(encoded)).to.equal(null);
      });

      it('should encode undefined as fixext 1 (0xd4 0x00 0x00)', function () {
        var encoded = msgpack.encode(undefined);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xd4, 0x00, 0x00]));
      });

      it('should return undefined when encoding a function', function () {
        expect(msgpack.encode(function () {})).to.equal(undefined);
      });
    });

    describe('positive integers', function () {
      it('should encode 0 as positive fixint', function () {
        var encoded = msgpack.encode(0);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0x00]));
        expect(msgpack.decode(encoded)).to.equal(0);
      });

      it('should encode 1 as positive fixint', function () {
        expect(msgpack.decode(msgpack.encode(1))).to.equal(1);
      });

      it('should encode 127 (0x7f) as positive fixint (max)', function () {
        var encoded = msgpack.encode(127);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0x7f]));
        expect(msgpack.decode(encoded)).to.equal(127);
      });

      it('should encode 128 (0x80) as uint8', function () {
        var encoded = msgpack.encode(128);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xcc, 0x80]));
        expect(msgpack.decode(encoded)).to.equal(128);
      });

      it('should encode 255 (0xff) as uint8 (max)', function () {
        var encoded = msgpack.encode(255);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xcc, 0xff]));
        expect(msgpack.decode(encoded)).to.equal(255);
      });

      it('should encode 256 (0x100) as uint16', function () {
        var encoded = msgpack.encode(256);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xcd, 0x01, 0x00]));
        expect(msgpack.decode(encoded)).to.equal(256);
      });

      it('should encode 0xffff as uint16 (max)', function () {
        var encoded = msgpack.encode(0xffff);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xcd, 0xff, 0xff]));
        expect(msgpack.decode(encoded)).to.equal(0xffff);
      });

      it('should encode 0x10000 as uint32', function () {
        var encoded = msgpack.encode(0x10000);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xce, 0x00, 0x01, 0x00, 0x00]));
        expect(msgpack.decode(encoded)).to.equal(0x10000);
      });

      it('should encode 0xffffffff as uint32 (max)', function () {
        var encoded = msgpack.encode(0xffffffff);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xce, 0xff, 0xff, 0xff, 0xff]));
        expect(msgpack.decode(encoded)).to.equal(0xffffffff);
      });

      it('should encode 0x100000000 as uint64', function () {
        var encoded = msgpack.encode(0x100000000);
        expect(msgpack.decode(encoded)).to.equal(0x100000000);
        // Should use 9 bytes (1 prefix + 8 data)
        expect(getByteLength(encoded)).to.equal(9);
        expect(toU8(encoded)[0]).to.equal(0xcf);
      });

      it('should roundtrip various positive integers from the node fork test suite', function () {
        var values = [0, 1, 2, 4, 6, 0x10, 0x20, 0x40, 0x80, 0x100, 0x200,
          0x1000, 0x10000, 0x20000, 0x40000,
          10, 100, 1000, 10000, 100000, 1000000];
        values.forEach(function (val) {
          expect(msgpack.decode(msgpack.encode(val))).to.equal(val, 'roundtrip failed for ' + val);
        });
      });
    });

    describe('negative integers', function () {
      it('should encode -1 as negative fixint', function () {
        var encoded = msgpack.encode(-1);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xff]));
        expect(msgpack.decode(encoded)).to.equal(-1);
      });

      it('should encode -32 (0xe0) as negative fixint (min)', function () {
        var encoded = msgpack.encode(-32);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xe0]));
        expect(msgpack.decode(encoded)).to.equal(-32);
      });

      it('should encode -33 as int8', function () {
        var encoded = msgpack.encode(-33);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xd0, 0xdf]));
        expect(msgpack.decode(encoded)).to.equal(-33);
      });

      it('should encode -128 (0x80) as int8 (min)', function () {
        var encoded = msgpack.encode(-128);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xd0, 0x80]));
        expect(msgpack.decode(encoded)).to.equal(-128);
      });

      it('should encode -129 as int16', function () {
        var encoded = msgpack.encode(-129);
        expect(toU8(encoded)[0]).to.equal(0xd1);
        expect(msgpack.decode(encoded)).to.equal(-129);
      });

      it('should encode -32768 as int16 (min)', function () {
        var encoded = msgpack.encode(-32768);
        expect(toU8(encoded)[0]).to.equal(0xd1);
        expect(msgpack.decode(encoded)).to.equal(-32768);
      });

      it('should encode -32769 as int32', function () {
        var encoded = msgpack.encode(-32769);
        expect(toU8(encoded)[0]).to.equal(0xd2);
        expect(msgpack.decode(encoded)).to.equal(-32769);
      });

      it('should encode -2147483648 as int32 (min)', function () {
        var encoded = msgpack.encode(-2147483648);
        expect(toU8(encoded)[0]).to.equal(0xd2);
        expect(msgpack.decode(encoded)).to.equal(-2147483648);
      });

      it('should roundtrip various negative integers from the node fork test suite', function () {
        var values = [-1, -2, -4, -6, -0x10, -0x20, -0x40, -0x80, -0x100,
          -0x1000, -0x10000, -0x20000, -0x40000,
          -10, -100, -1000, -10000, -100000, -1000000];
        values.forEach(function (val) {
          expect(msgpack.decode(msgpack.encode(val))).to.equal(val, 'roundtrip failed for ' + val);
        });
      });
    });

    describe('floats', function () {
      it('should encode and decode positive float', function () {
        var val = 1.5;
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should encode and decode negative float', function () {
        var val = -2.5;
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should encode and decode small fraction', function () {
        var val = 0.1;
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      // Large floats and Infinity are only supported by the browser implementation.
      // The Node fork (@ably/msgpack-js) treats these as integers and throws.
      if (isBrowserImpl) {
        it('should encode and decode large float (1.7e+308)', function () {
          var val = 1.7e+308;
          expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
        });

        it('should encode and decode Infinity', function () {
          var val = Infinity;
          expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
        });

        it('should encode and decode -Infinity', function () {
          var val = -Infinity;
          expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
        });
      }

      it('should encode floats with 0xcb prefix (float64)', function () {
        var encoded = msgpack.encode(1.5);
        expect(toU8(encoded)[0]).to.equal(0xcb);
        expect(getByteLength(encoded)).to.equal(9);
      });

      it('should encode and decode NaN', function () {
        var encoded = msgpack.encode(NaN);
        var decoded = msgpack.decode(encoded);
        expect(decoded).to.be.NaN;
      });

      it('should roundtrip zero', function () {
        expect(msgpack.decode(msgpack.encode(0))).to.equal(0);
      });
    });

    describe('strings', function () {
      it('should encode and decode empty string', function () {
        var encoded = msgpack.encode('');
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0xa0]));
        expect(msgpack.decode(encoded)).to.equal('');
      });

      it('should encode short strings as fixstr (length < 32)', function () {
        var val = 'hello';
        var encoded = msgpack.encode(val);
        // fixstr: 0xa0 | length
        expect(toU8(encoded)[0]).to.equal(0xa0 | 5);
        expect(msgpack.decode(encoded)).to.equal(val);
      });

      it('should encode and decode single character', function () {
        expect(msgpack.decode(msgpack.encode('a'))).to.equal('a');
      });

      it('should encode and decode 31-char string as fixstr', function () {
        var val = 'a'.repeat(31);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xa0 | 31);
        expect(msgpack.decode(encoded)).to.equal(val);
      });

      it('should encode 32-byte string as str8 (0xd9)', function () {
        var val = 'a'.repeat(32);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xd9);
        expect(msgpack.decode(encoded)).to.equal(val);
      });

      it('should encode and decode medium string (str8, up to 255 bytes)', function () {
        var val = 'x'.repeat(200);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xd9);
        expect(msgpack.decode(encoded)).to.equal(val);
      });

      it('should encode 256-byte string as str16 (0xda)', function () {
        var val = 'y'.repeat(256);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xda);
        expect(msgpack.decode(encoded)).to.equal(val);
      });

      it('should encode and decode "hello" and "world" (from node fork)', function () {
        expect(msgpack.decode(msgpack.encode('hello'))).to.equal('hello');
        expect(msgpack.decode(msgpack.encode('world'))).to.equal('world');
      });

      it('should encode and decode multibyte UTF-8 characters', function () {
        var val = 'café';
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should encode and decode CJK characters', function () {
        var val = '你好世界';
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should encode and decode mixed ASCII and multibyte', function () {
        var val = 'hello 世界 café 🎉';
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });
    });

    // Binary data (ArrayBuffer/Buffer) tests - behavior differs between browser and Node.
    // The browser implementation encodes ArrayBuffer as msgpack bin format.
    // The Node implementation (@ably/msgpack-js) uses Node Buffer and treats
    // ArrayBuffer as a plain object.
    describe('binary data', function () {
      if (isBrowserImpl) {
        it('should encode and decode empty ArrayBuffer', function () {
          var input = new ArrayBuffer(0);
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(decoded).to.be.an.instanceOf(ArrayBuffer);
          expect(decoded.byteLength).to.equal(0);
        });

        it('should encode small ArrayBuffer as bin8 (0xc4)', function () {
          var input = new Uint8Array([1, 2, 3, 4, 5]).buffer;
          var encoded = msgpack.encode(input);
          expect(toU8(encoded)[0]).to.equal(0xc4);
          var decoded = msgpack.decode(encoded);
          expect(new Uint8Array(decoded)).to.deep.equal(new Uint8Array([1, 2, 3, 4, 5]));
        });

        it('should encode and decode ArrayBuffer with all byte values (0x00-0xff)', function () {
          var bytes = new Uint8Array(256);
          for (var i = 0; i < 256; i++) bytes[i] = i;
          var input = bytes.buffer;
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(new Uint8Array(decoded)).to.deep.equal(bytes);
        });

        it('should encode Uint8Array by converting to ArrayBuffer', function () {
          var input = new Uint8Array([10, 20, 30]);
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(decoded).to.be.an.instanceOf(ArrayBuffer);
          expect(new Uint8Array(decoded)).to.deep.equal(new Uint8Array([10, 20, 30]));
        });

        it('should encode 256-byte ArrayBuffer as bin16 (0xc5)', function () {
          var input = new ArrayBuffer(256);
          var encoded = msgpack.encode(input);
          expect(toU8(encoded)[0]).to.equal(0xc5);
          var decoded = msgpack.decode(encoded);
          expect(decoded.byteLength).to.equal(256);
        });
      } else {
        // Node: Buffer-based binary encoding
        it('should encode and decode Buffer data', function () {
          var input = Buffer.from([1, 2, 3, 4, 5]);
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(Buffer.isBuffer(decoded)).to.equal(true);
          for (var i = 0; i < input.length; i++) {
            expect(decoded[i]).to.equal(input[i]);
          }
        });

        it('should encode and decode empty Buffer', function () {
          var input = Buffer.alloc(0);
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(Buffer.isBuffer(decoded)).to.equal(true);
          expect(decoded.length).to.equal(0);
        });

        it('should encode and decode Buffer with all byte values (0x00-0xff)', function () {
          var input = Buffer.alloc(256);
          for (var i = 0; i < 256; i++) input[i] = i;
          var encoded = msgpack.encode(input);
          var decoded = msgpack.decode(encoded);
          expect(Buffer.isBuffer(decoded)).to.equal(true);
          for (var j = 0; j < 256; j++) {
            expect(decoded[j]).to.equal(j, 'byte mismatch at index ' + j);
          }
        });
      }
    });

    describe('arrays', function () {
      it('should encode and decode empty array', function () {
        var encoded = msgpack.encode([]);
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0x90]));
        expect(msgpack.decode(encoded)).to.deep.equal([]);
      });

      it('should encode small arrays as fixarray (length < 16)', function () {
        var val = [1, 2, 3];
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0x90 | 3);
        expect(msgpack.decode(encoded)).to.deep.equal(val);
      });

      it('should encode array with 15 elements as fixarray', function () {
        var val = [];
        for (var i = 0; i < 15; i++) val.push(i);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0x90 | 15);
        expect(msgpack.decode(encoded)).to.deep.equal(val);
      });

      it('should encode array with 16 elements as array16 (0xdc)', function () {
        var val = [];
        for (var i = 0; i < 16; i++) val.push(i);
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xdc);
        expect(msgpack.decode(encoded)).to.deep.equal(val);
      });

      it('should encode and decode array with mixed types', function () {
        var val = [1, 'hello', true, null, -42, 3.14];
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal(val);
      });

      it('should encode and decode nested arrays', function () {
        var val = [[1, 2], [3, [4, 5]]];
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should preserve undefined in arrays (non-sparse mode)', function () {
        var val = [1, undefined, 3];
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded.length).to.equal(3);
        expect(decoded[0]).to.equal(1);
        expect(decoded[2]).to.equal(3);
      });
    });

    describe('objects / maps', function () {
      it('should encode and decode empty object', function () {
        var encoded = msgpack.encode({});
        expect(toU8(encoded)).to.deep.equal(new Uint8Array([0x80]));
        expect(msgpack.decode(encoded)).to.deep.equal({});
      });

      it('should encode small objects as fixmap (length < 16)', function () {
        var val = { name: 'Tim', age: 29 };
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal(val);
      });

      it('should encode and decode object with various value types', function () {
        var val = { a: 1, b: 'two', c: true, d: null, e: [1, 2] };
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal(val);
      });

      it('should encode and decode nested objects', function () {
        var val = { a: { b: { c: 1 } } };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should encode and decode object from node fork: {a: 1, b: 2, c: [1, 2, 3]}', function () {
        var val = { a: 1, b: 2, c: [1, 2, 3] };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should encode object with 16+ keys as map16 (0xde)', function () {
        var val = {};
        for (var i = 0; i < 16; i++) val['k' + i] = i;
        var encoded = msgpack.encode(val);
        expect(toU8(encoded)[0]).to.equal(0xde);
        expect(msgpack.decode(encoded)).to.deep.equal(val);
      });

      it('should omit function values from objects', function () {
        var val = { fun: function () {}, string: 'hello' };
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal({ string: 'hello' });
      });
    });

    describe('toJSON support', function () {
      it('should use toJSON when available on objects', function () {
        var val = {
          toJSON: function () {
            return { object: true };
          },
        };
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal({ object: true });
      });

      it('should encode Date via toJSON (ISO string)', function () {
        var val = new Date(0);
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.equal(JSON.parse(JSON.stringify(val)));
      });

      it('should encode RegExp same as JSON (empty object)', function () {
        var val = /regexp/;
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal(JSON.parse(JSON.stringify(val)));
      });

      it('should not include prototype properties', function () {
        function Foo() {
          this.instance = true;
        }
        Foo.prototype.blah = 324;
        Foo.prototype.doThing = function () {};
        var val = new Foo();
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal({ instance: true });
      });

      it('should handle function with toJSON', function () {
        function jsonableFunction() {
          console.log("can be json'ed");
        }
        jsonableFunction.toJSON = function () {
          return this.toString();
        };
        var val = { fun: jsonableFunction };
        var decoded = msgpack.decode(msgpack.encode(val));
        expect(decoded).to.deep.equal(JSON.parse(JSON.stringify(val)));
      });
    });

    describe('sparse mode', function () {
      it('should discard undefined values in objects', function () {
        var val = { a: 'b', c: undefined };
        var decoded = msgpack.decode(msgpack.encode(val, true));
        expect(decoded).to.deep.equal({ a: 'b' });
        expect(decoded).to.not.have.property('c');
      });

      it('should discard null values in objects', function () {
        var val = { a: 'b', c: null };
        var decoded = msgpack.decode(msgpack.encode(val, true));
        expect(decoded).to.deep.equal({ a: 'b' });
        expect(decoded).to.not.have.property('c');
      });

      it('should keep undefined in arrays (from node fork)', function () {
        var input = [undefined, { a: 'b', c: undefined }, undefined];
        var output = msgpack.decode(msgpack.encode(input, true));
        expect(output.length).to.equal(3);
        expect(output[1]).to.deep.equal({ a: 'b' });
      });

      it('should preserve non-null/undefined values in sparse mode', function () {
        var val = { a: 1, b: 0, c: false, d: '', e: undefined, f: null };
        var decoded = msgpack.decode(msgpack.encode(val, true));
        expect(decoded).to.have.property('a', 1);
        expect(decoded).to.have.property('b', 0);
        expect(decoded).to.have.property('c', false);
        expect(decoded).to.have.property('d', '');
        expect(decoded).to.not.have.property('e');
        expect(decoded).to.not.have.property('f');
      });
    });

    describe('roundtrip - all types from node fork test suite', function () {
      it('should roundtrip all primitive and simple values', function () {
        var tests = [
          true, false, null,
          0, 1, -1, 2, -2, 4, -4, 6, -6,
          0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
          0x80, -0x80, 0x100, -0x100, 0x200,
          0x1000, -0x1000, 0x10000, -0x10000,
          0x20000, -0x20000, 0x40000, -0x40000,
          10, 100, 1000, 10000, 100000, 1000000,
          -10, -100, -1000, -10000, -100000, -1000000,
          'hello', 'world',
        ];
        tests.forEach(function (input) {
          var output = msgpack.decode(msgpack.encode(input));
          expect(output).to.deep.equal(input, 'roundtrip failed for: ' + JSON.stringify(input));
        });
      });

      it('should roundtrip arrays and objects', function () {
        var tests = [
          [1, 2, 3],
          [],
          { name: 'Tim', age: 29 },
          {},
          { a: 1, b: 2, c: [1, 2, 3] },
        ];
        tests.forEach(function (input) {
          var output = msgpack.decode(msgpack.encode(input));
          expect(output).to.deep.equal(input, 'roundtrip failed for: ' + JSON.stringify(input));
        });
      });

      if (isBrowserImpl) {
        it('should roundtrip ArrayBuffer data', function () {
          var input = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello" bytes
          var output = msgpack.decode(msgpack.encode(input));
          expect(output).to.be.an.instanceOf(ArrayBuffer);
          expect(new Uint8Array(output)).to.deep.equal(new Uint8Array(input));
        });
      } else {
        it('should roundtrip Buffer data', function () {
          var input = Buffer.from([72, 101, 108, 108, 111]); // "Hello" bytes
          var output = msgpack.decode(msgpack.encode(input));
          expect(Buffer.isBuffer(output)).to.equal(true);
          for (var i = 0; i < input.length; i++) {
            expect(output[i]).to.equal(input[i]);
          }
        });
      }
    });

    describe('edge cases', function () {
      it('should handle deeply nested structures', function () {
        var val = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should handle objects with many keys', function () {
        var val = {};
        for (var i = 0; i < 50; i++) val['key_' + i] = i;
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should handle arrays with many elements', function () {
        var val = [];
        for (var i = 0; i < 100; i++) val.push(i);
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should handle complex nested structure', function () {
        var val = {
          users: [
            { name: 'Alice', scores: [100, 95, 88], active: true },
            { name: 'Bob', scores: [72, 81], active: false },
          ],
          metadata: { version: 2, tags: ['test', 'prod'] },
        };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should handle integer boundary: max safe integer', function () {
        // Number.MAX_SAFE_INTEGER = 2^53 - 1 = 9007199254740991
        var val = Number.MAX_SAFE_INTEGER;
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should handle string with null bytes', function () {
        var val = 'hello\0world';
        expect(msgpack.decode(msgpack.encode(val))).to.equal(val);
      });

      it('should handle empty string key in object', function () {
        var val = { '': 'empty key' };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });

      it('should handle object with numeric string keys', function () {
        var val = { '0': 'zero', '1': 'one', '2': 'two' };
        expect(msgpack.decode(msgpack.encode(val))).to.deep.equal(val);
      });
    });

    describe('wire format verification', function () {
      it('should encode positive fixint correctly at boundaries', function () {
        // 0 -> 0x00, 127 -> 0x7f
        expect(toU8(msgpack.encode(0))).to.deep.equal(new Uint8Array([0x00]));
        expect(toU8(msgpack.encode(0x7f))).to.deep.equal(new Uint8Array([0x7f]));
      });

      it('should encode negative fixint correctly at boundaries', function () {
        // -1 -> 0xff, -32 -> 0xe0
        expect(toU8(msgpack.encode(-1))).to.deep.equal(new Uint8Array([0xff]));
        expect(toU8(msgpack.encode(-32))).to.deep.equal(new Uint8Array([0xe0]));
      });

      it('should encode fixstr with correct prefix', function () {
        // empty string: 0xa0, "a": 0xa1 + 0x61
        expect(toU8(msgpack.encode(''))).to.deep.equal(new Uint8Array([0xa0]));
        expect(toU8(msgpack.encode('a'))).to.deep.equal(new Uint8Array([0xa1, 0x61]));
      });

      it('should encode fixarray with correct prefix', function () {
        expect(toU8(msgpack.encode([]))).to.deep.equal(new Uint8Array([0x90]));
        // [1] = 0x91 0x01
        expect(toU8(msgpack.encode([1]))).to.deep.equal(new Uint8Array([0x91, 0x01]));
      });

      it('should encode fixmap with correct prefix', function () {
        expect(toU8(msgpack.encode({}))).to.deep.equal(new Uint8Array([0x80]));
      });
    });
  });
});
