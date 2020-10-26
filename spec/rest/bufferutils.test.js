"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('rest/bufferutils', function (expect, counter) {
		var exports = {};
		var BufferUtils = Ably.Realtime.BufferUtils;
		var testString = 'test';
		var testBase64 = 'dGVzdA==';
		var testHex = '74657374';
		function isWordArray(ob) { return ob !== null && ob !== undefined && ob.sigBytes !== undefined; }

		it('bufferutils_encodedecode', function(done) {
			/* base64 */
			expect(BufferUtils.base64Encode(BufferUtils.utf8Encode(testString))).to.equal(testBase64);
			expect(BufferUtils.utf8Decode(BufferUtils.base64Decode(testBase64))).to.equal(testString);

			/* hex */
			expect(BufferUtils.hexEncode(BufferUtils.utf8Encode(testString))).to.equal(testHex);
			expect(BufferUtils.utf8Decode(BufferUtils.hexDecode(testHex))).to.equal(testString);

			/* compare */
			expect(0).to.equal(BufferUtils.bufferCompare(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode(testString)));
			expect(0).to.not.equal(BufferUtils.bufferCompare(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode('other')));

			done();
		});

			/* In node it's idiomatic for most methods dealing with binary data to
			* return Buffers. In the browser it's more idiomatic to return
			* ArrayBuffers (or in browser too old to support ArrayBuffer, wordarrays). */
		it('bufferutils_resulttype', function(done) {
			if(typeof Buffer !== 'undefined') {
				/* node */
				expect(BufferUtils.utf8Encode(testString).constructor).to.equal(Buffer);
				expect(BufferUtils.hexDecode(testHex).constructor).to.equal(Buffer);
				expect(BufferUtils.base64Decode(testBase64).constructor).to.equal(Buffer);
				expect(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(Buffer);
				expect(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(ArrayBuffer);
			} else if(typeof ArrayBuffer !== 'undefined') {
				/* modern browsers */
				if(typeof TextDecoder !== 'undefined') {
					expect(BufferUtils.utf8Encode(testString).constructor).to.equal(ArrayBuffer);
				} else {
					expect(isWordArray(BufferUtils.utf8Encode(testString)));
				}
				expect(BufferUtils.hexDecode(testHex).constructor).to.equal(ArrayBuffer);
				expect(BufferUtils.base64Decode(testBase64).constructor).to.equal(ArrayBuffer);
				expect(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(Uint8Array);
				expect(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor).to.equal(ArrayBuffer);
			} else {
				/* legacy browsers */
				expect(isWordArray(BufferUtils.utf8Encode(testString)));
				expect(isWordArray(BufferUtils.hexDecode(testHex)));
				expect(isWordArray(BufferUtils.base64Decode(testBase64)));
				expect(isWordArray(BufferUtils.toWordArray(BufferUtils.utf8Encode(testString))));
			}
			done();
		});
	});
});
