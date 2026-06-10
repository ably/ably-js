'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;
  var BufferUtils = Ably.Realtime.Platform.BufferUtils;
  var testString = 'test';
  var testBase64 = 'dGVzdA==';
  var testHex = '74657374';

  describe('rest/bufferutils', function () {
    // ========================================================
    // Existing tests (preserved as-is)
    // ========================================================

    /** @nospec */
    it('Basic encoding and decoding', function () {
      /* base64 */
      expect(BufferUtils.base64Encode(BufferUtils.utf8Encode(testString))).to.equal(testBase64);
      expect(BufferUtils.utf8Decode(BufferUtils.base64Decode(testBase64))).to.equal(testString);

      /* hex */
      expect(BufferUtils.hexEncode(BufferUtils.utf8Encode(testString))).to.equal(testHex);
      expect(BufferUtils.utf8Decode(BufferUtils.hexDecode(testHex))).to.equal(testString);

      /* compare */
      expect(
        BufferUtils.areBuffersEqual(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode(testString)),
      ).to.equal(true);
      expect(
        BufferUtils.areBuffersEqual(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode('other')),
      ).to.not.equal(true);
    });

    /**
     * In node it's idiomatic for most methods dealing with binary data to
     * return Buffers. In the browser it's more idiomatic to return ArrayBuffers.
     *
     * @nospec
     */
    it('BufferUtils return correct types', function () {
      if (typeof Buffer !== 'undefined') {
        /* node */
        expect(BufferUtils.utf8Encode(testString).constructor).to.equal(Buffer);
        expect(BufferUtils.hexDecode(testHex).constructor).to.equal(Buffer);
        expect(BufferUtils.base64Decode(testBase64).constructor).to.equal(Buffer);
        expect(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(Buffer);
        expect(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(ArrayBuffer);
      } else {
        /* modern browsers */
        expect(BufferUtils.utf8Encode(testString).constructor).to.equal(ArrayBuffer);
        expect(BufferUtils.hexDecode(testHex).constructor).to.equal(ArrayBuffer);
        expect(BufferUtils.base64Decode(testBase64).constructor).to.equal(ArrayBuffer);
        expect(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(Uint8Array);
        expect(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(ArrayBuffer);
      }
    });

    // ========================================================
    // New comprehensive tests
    // ========================================================

    describe('base64 encode/decode', function () {
      // RFC 4648 test vectors
      it('should encode empty input', function () {
        var buf = BufferUtils.utf8Encode('');
        expect(BufferUtils.base64Encode(buf)).to.equal('');
      });

      it('should encode "f" (1 byte, 2 padding chars)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('f'))).to.equal('Zg==');
      });

      it('should encode "fo" (2 bytes, 1 padding char)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('fo'))).to.equal('Zm8=');
      });

      it('should encode "foo" (3 bytes, no padding)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('foo'))).to.equal('Zm9v');
      });

      it('should encode "foob" (4 bytes)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('foob'))).to.equal('Zm9vYg==');
      });

      it('should encode "fooba" (5 bytes)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('fooba'))).to.equal('Zm9vYmE=');
      });

      it('should encode "foobar" (6 bytes)', function () {
        expect(BufferUtils.base64Encode(BufferUtils.utf8Encode('foobar'))).to.equal('Zm9vYmFy');
      });

      it('should decode RFC 4648 test vectors back to original', function () {
        var vectors = [
          ['', ''],
          ['Zg==', 'f'],
          ['Zm8=', 'fo'],
          ['Zm9v', 'foo'],
          ['Zm9vYg==', 'foob'],
          ['Zm9vYmE=', 'fooba'],
          ['Zm9vYmFy', 'foobar'],
        ];
        vectors.forEach(function (pair) {
          if (pair[0] === '') return; // skip empty decode
          expect(BufferUtils.utf8Decode(BufferUtils.base64Decode(pair[0]))).to.equal(pair[1]);
        });
      });

      it('should roundtrip binary data with all byte values (0x00-0xff)', function () {
        var bytes = new Uint8Array(256);
        for (var i = 0; i < 256; i++) bytes[i] = i;
        var buf = bytes.buffer;
        var encoded = BufferUtils.base64Encode(buf);
        var decoded = BufferUtils.base64Decode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(bytes);
      });

      it('should handle single null byte', function () {
        var buf = new Uint8Array([0]).buffer;
        var encoded = BufferUtils.base64Encode(buf);
        expect(encoded).to.equal('AA==');
        var decoded = BufferUtils.base64Decode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(new Uint8Array([0]));
      });

      it('should handle buffer with 0xff bytes', function () {
        var buf = new Uint8Array([0xff, 0xff, 0xff]).buffer;
        var encoded = BufferUtils.base64Encode(buf);
        expect(encoded).to.equal('////');
        var decoded = BufferUtils.base64Decode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(new Uint8Array([0xff, 0xff, 0xff]));
      });
    });

    describe('base64 URL-safe encode', function () {
      it('should replace + with - and / with _', function () {
        // 0xff 0xff 0xff encodes to //// in standard base64
        var buf = new Uint8Array([0xff, 0xff, 0xff]).buffer;
        var encoded = BufferUtils.base64UrlEncode(buf);
        expect(encoded).to.equal('____');
        expect(encoded).to.not.contain('+');
        expect(encoded).to.not.contain('/');
      });

      it('should strip trailing = padding', function () {
        var buf = BufferUtils.utf8Encode('f');
        var encoded = BufferUtils.base64UrlEncode(buf);
        expect(encoded).to.not.contain('=');
        expect(encoded).to.equal('Zg');
      });

      it('should strip single = padding', function () {
        var buf = BufferUtils.utf8Encode('fo');
        var encoded = BufferUtils.base64UrlEncode(buf);
        expect(encoded).to.not.contain('=');
        expect(encoded).to.equal('Zm8');
      });

      it('should not modify encoding when no special chars present', function () {
        var buf = BufferUtils.utf8Encode('foo');
        // 'foo' -> 'Zm9v' (no +, /, or = in standard base64)
        expect(BufferUtils.base64UrlEncode(buf)).to.equal('Zm9v');
      });

      it('should replace + with -', function () {
        // Find bytes that produce + in base64: 0x3e -> '>' after base64 has +
        // bytes [0xfb, 0xef] -> standard base64 contains '+'
        var buf = new Uint8Array([0xfb, 0xef, 0xbe]).buffer;
        var standard = BufferUtils.base64Encode(buf);
        var urlSafe = BufferUtils.base64UrlEncode(buf);
        if (standard.indexOf('+') !== -1) {
          expect(urlSafe.indexOf('-')).to.not.equal(-1);
          expect(urlSafe.indexOf('+')).to.equal(-1);
        }
      });
    });

    describe('hex encode/decode', function () {
      it('should encode empty buffer', function () {
        var buf = new ArrayBuffer(0);
        expect(BufferUtils.hexEncode(buf)).to.equal('');
      });

      it('should encode single byte', function () {
        var buf = new Uint8Array([0xab]).buffer;
        expect(BufferUtils.hexEncode(buf)).to.equal('ab');
      });

      it('should encode bytes with leading zeros', function () {
        var buf = new Uint8Array([0x01, 0x02, 0x0a]).buffer;
        expect(BufferUtils.hexEncode(buf)).to.equal('01020a');
      });

      it('should encode all hex digits', function () {
        var buf = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]).buffer;
        expect(BufferUtils.hexEncode(buf)).to.equal('0123456789abcdef');
      });

      it('should decode empty hex string', function () {
        var decoded = BufferUtils.hexDecode('');
        expect(BufferUtils.toArrayBuffer(decoded).byteLength).to.equal(0);
      });

      it('should decode single byte hex', function () {
        var decoded = BufferUtils.hexDecode('ff');
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(new Uint8Array([0xff]));
      });

      it('should decode multi-byte hex', function () {
        var decoded = BufferUtils.hexDecode('0123456789abcdef');
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(
          new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]),
        );
      });

      it('should roundtrip all byte values', function () {
        var bytes = new Uint8Array(256);
        for (var i = 0; i < 256; i++) bytes[i] = i;
        var hex = BufferUtils.hexEncode(bytes.buffer);
        var decoded = BufferUtils.hexDecode(hex);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(bytes);
      });

      it('should handle uppercase hex input', function () {
        var decoded = BufferUtils.hexDecode('ABCDEF');
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(
          new Uint8Array([0xab, 0xcd, 0xef]),
        );
      });

      // The browser implementation throws on odd-length hex; Node's Buffer.from silently truncates
      if (typeof Buffer === 'undefined') {
        it('should throw on odd-length hex string', function () {
          expect(function () {
            BufferUtils.hexDecode('abc');
          }).to.throw();
        });
      }
    });

    describe('UTF-8 encode/decode', function () {
      it('should encode and decode empty string', function () {
        var encoded = BufferUtils.utf8Encode('');
        expect(BufferUtils.toArrayBuffer(encoded).byteLength).to.equal(0);
        expect(BufferUtils.utf8Decode(encoded)).to.equal('');
      });

      it('should encode and decode ASCII string', function () {
        var val = 'Hello, World!';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode and decode accented characters (multibyte)', function () {
        var val = 'café résumé naïve';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode and decode emoji', function () {
        var val = '😀🎉🚀💯';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode and decode CJK characters', function () {
        var val = '你好世界こんにちは세계';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode and decode mixed content', function () {
        var val = 'Hello 世界 café 🎉 naïve';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode and decode string with null bytes', function () {
        var val = 'hello\0world';
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });

      it('should encode ASCII as single bytes', function () {
        var encoded = BufferUtils.utf8Encode('A');
        expect(BufferUtils.toArrayBuffer(encoded).byteLength).to.equal(1);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(encoded))[0]).to.equal(65);
      });

      it('should encode accented char as multibyte', function () {
        var encoded = BufferUtils.utf8Encode('é');
        // é is U+00E9, encoded as 0xC3 0xA9 in UTF-8
        expect(BufferUtils.toArrayBuffer(encoded).byteLength).to.equal(2);
      });

      it('should encode emoji as 4 bytes', function () {
        var encoded = BufferUtils.utf8Encode('😀');
        // U+1F600 is 4 bytes in UTF-8
        expect(BufferUtils.toArrayBuffer(encoded).byteLength).to.equal(4);
      });
    });

    describe('ArrayBuffer utilities', function () {
      it('toArrayBuffer should return ArrayBuffer from ArrayBuffer', function () {
        var buf = new ArrayBuffer(4);
        var result = BufferUtils.toArrayBuffer(buf);
        expect(result).to.be.an.instanceOf(ArrayBuffer);
        expect(result.byteLength).to.equal(4);
      });

      it('toArrayBuffer should return ArrayBuffer from Uint8Array', function () {
        var u8 = new Uint8Array([1, 2, 3]);
        var result = BufferUtils.toArrayBuffer(u8);
        expect(result).to.be.an.instanceOf(ArrayBuffer);
        expect(new Uint8Array(result)).to.deep.equal(new Uint8Array([1, 2, 3]));
      });

      it('toBuffer should return Uint8Array from ArrayBuffer', function () {
        var buf = new Uint8Array([10, 20, 30]).buffer;
        var result = BufferUtils.toBuffer(buf);
        expect(result).to.be.an.instanceOf(Uint8Array);
        expect(result).to.deep.equal(new Uint8Array([10, 20, 30]));
      });

      it('toBuffer should return Uint8Array from Uint8Array', function () {
        var u8 = new Uint8Array([1, 2, 3]);
        var result = BufferUtils.toBuffer(u8);
        expect(result).to.be.an.instanceOf(Uint8Array);
      });

      it('isBuffer should return true for ArrayBuffer', function () {
        expect(BufferUtils.isBuffer(new ArrayBuffer(4))).to.equal(true);
      });

      it('isBuffer should return true for Uint8Array', function () {
        expect(BufferUtils.isBuffer(new Uint8Array(4))).to.equal(true);
      });

      it('isBuffer should return true for DataView', function () {
        expect(BufferUtils.isBuffer(new DataView(new ArrayBuffer(4)))).to.equal(true);
      });

      it('isBuffer should return false for non-buffer types', function () {
        expect(BufferUtils.isBuffer('string')).to.equal(false);
        expect(BufferUtils.isBuffer(42)).to.equal(false);
        expect(BufferUtils.isBuffer(null)).to.equal(false);
        expect(BufferUtils.isBuffer(undefined)).to.equal(false);
        expect(BufferUtils.isBuffer({})).to.equal(false);
        expect(BufferUtils.isBuffer([])).to.equal(false);
      });
    });

    describe('areBuffersEqual', function () {
      it('should return true for identical buffers', function () {
        var a = new Uint8Array([1, 2, 3]).buffer;
        var b = new Uint8Array([1, 2, 3]).buffer;
        expect(BufferUtils.areBuffersEqual(a, b)).to.equal(true);
      });

      it('should return false for different content', function () {
        var a = new Uint8Array([1, 2, 3]).buffer;
        var b = new Uint8Array([1, 2, 4]).buffer;
        expect(BufferUtils.areBuffersEqual(a, b)).to.equal(false);
      });

      it('should return false for different lengths', function () {
        var a = new Uint8Array([1, 2]).buffer;
        var b = new Uint8Array([1, 2, 3]).buffer;
        expect(BufferUtils.areBuffersEqual(a, b)).to.equal(false);
      });

      it('should return true for two empty buffers', function () {
        var a = new ArrayBuffer(0);
        var b = new ArrayBuffer(0);
        expect(BufferUtils.areBuffersEqual(a, b)).to.equal(true);
      });

      it('should return false when first buffer is null/undefined', function () {
        var b = new ArrayBuffer(0);
        expect(BufferUtils.areBuffersEqual(null, b)).to.equal(false);
        expect(BufferUtils.areBuffersEqual(undefined, b)).to.equal(false);
      });

      it('should return false when second buffer is null/undefined', function () {
        var a = new ArrayBuffer(0);
        expect(BufferUtils.areBuffersEqual(a, null)).to.equal(false);
        expect(BufferUtils.areBuffersEqual(a, undefined)).to.equal(false);
      });

      it('should handle Uint8Array inputs', function () {
        var a = new Uint8Array([0xff, 0x00, 0xab]);
        var b = new Uint8Array([0xff, 0x00, 0xab]);
        expect(BufferUtils.areBuffersEqual(a, b)).to.equal(true);
      });
    });

    describe('byteLength', function () {
      it('should return correct length for ArrayBuffer', function () {
        expect(BufferUtils.byteLength(new ArrayBuffer(10))).to.equal(10);
      });

      it('should return correct length for Uint8Array', function () {
        expect(BufferUtils.byteLength(new Uint8Array(5))).to.equal(5);
      });

      it('should return 0 for empty ArrayBuffer', function () {
        expect(BufferUtils.byteLength(new ArrayBuffer(0))).to.equal(0);
      });
    });

    describe('concat', function () {
      it('should concatenate two buffers', function () {
        var a = new Uint8Array([1, 2, 3]).buffer;
        var b = new Uint8Array([4, 5, 6]).buffer;
        var result = BufferUtils.concat([a, b]);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(result))).to.deep.equal(
          new Uint8Array([1, 2, 3, 4, 5, 6]),
        );
      });

      it('should concatenate empty array', function () {
        var result = BufferUtils.concat([]);
        expect(BufferUtils.toArrayBuffer(result).byteLength).to.equal(0);
      });

      it('should concatenate single buffer', function () {
        var a = new Uint8Array([1, 2]).buffer;
        var result = BufferUtils.concat([a]);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(result))).to.deep.equal(new Uint8Array([1, 2]));
      });

      it('should concatenate multiple buffers including empty ones', function () {
        var a = new Uint8Array([1]).buffer;
        var b = new ArrayBuffer(0);
        var c = new Uint8Array([2, 3]).buffer;
        var result = BufferUtils.concat([a, b, c]);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(result))).to.deep.equal(new Uint8Array([1, 2, 3]));
      });
    });

    describe('roundtrip: utf8 -> base64 -> back', function () {
      it('should roundtrip ASCII string via base64', function () {
        var val = 'Hello, World!';
        var encoded = BufferUtils.base64Encode(BufferUtils.utf8Encode(val));
        var decoded = BufferUtils.utf8Decode(BufferUtils.base64Decode(encoded));
        expect(decoded).to.equal(val);
      });

      it('should roundtrip multibyte string via base64', function () {
        var val = 'café 你好 🎉';
        var encoded = BufferUtils.base64Encode(BufferUtils.utf8Encode(val));
        var decoded = BufferUtils.utf8Decode(BufferUtils.base64Decode(encoded));
        expect(decoded).to.equal(val);
      });

      it('should roundtrip empty string via base64', function () {
        var val = '';
        var encoded = BufferUtils.base64Encode(BufferUtils.utf8Encode(val));
        // empty input -> empty base64
        var decoded = BufferUtils.utf8Decode(BufferUtils.base64Decode(encoded));
        expect(decoded).to.equal(val);
      });
    });

    describe('roundtrip: utf8 -> hex -> back', function () {
      it('should roundtrip ASCII string via hex', function () {
        var val = 'Hello, World!';
        var encoded = BufferUtils.hexEncode(BufferUtils.utf8Encode(val));
        var decoded = BufferUtils.utf8Decode(BufferUtils.hexDecode(encoded));
        expect(decoded).to.equal(val);
      });

      it('should roundtrip multibyte string via hex', function () {
        var val = 'café 你好 🎉';
        var encoded = BufferUtils.hexEncode(BufferUtils.utf8Encode(val));
        var decoded = BufferUtils.utf8Decode(BufferUtils.hexDecode(encoded));
        expect(decoded).to.equal(val);
      });

      it('should roundtrip empty string via hex', function () {
        var val = '';
        var encoded = BufferUtils.hexEncode(BufferUtils.utf8Encode(val));
        var decoded = BufferUtils.utf8Decode(BufferUtils.hexDecode(encoded));
        expect(decoded).to.equal(val);
      });
    });

    describe('edge cases', function () {
      it('should handle large payload roundtrip via base64', function () {
        var bytes = new Uint8Array(10000);
        for (var i = 0; i < bytes.length; i++) bytes[i] = i % 256;
        var encoded = BufferUtils.base64Encode(bytes.buffer);
        var decoded = BufferUtils.base64Decode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(bytes);
      });

      it('should handle large payload roundtrip via hex', function () {
        var bytes = new Uint8Array(10000);
        for (var i = 0; i < bytes.length; i++) bytes[i] = i % 256;
        var encoded = BufferUtils.hexEncode(bytes.buffer);
        var decoded = BufferUtils.hexDecode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(bytes);
      });

      it('should handle buffer with only null bytes', function () {
        var bytes = new Uint8Array(10);
        var encoded = BufferUtils.base64Encode(bytes.buffer);
        var decoded = BufferUtils.base64Decode(encoded);
        expect(new Uint8Array(BufferUtils.toArrayBuffer(decoded))).to.deep.equal(bytes);
      });

      it('should handle long string via utf8', function () {
        var val = 'a'.repeat(100000);
        expect(BufferUtils.utf8Decode(BufferUtils.utf8Encode(val))).to.equal(val);
      });
    });
  });
});
