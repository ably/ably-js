"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};
	var BufferUtils = Ably.Realtime.BufferUtils;
	var testString = 'test';
	var testBase64 = 'dGVzdA==';
	var testHex = '74657374';
	function isWordArray(ob) { return ob !== null && ob !== undefined && ob.sigBytes !== undefined; }

	exports.bufferutils_encodedecode = function(test) {
		/* base64 */
		test.equal(BufferUtils.base64Encode(BufferUtils.utf8Encode(testString)), testBase64);
		test.equal(BufferUtils.utf8Decode(BufferUtils.base64Decode(testBase64)), testString);

		/* hex */
		test.equal(BufferUtils.hexEncode(BufferUtils.utf8Encode(testString)), testHex);
		test.equal(BufferUtils.utf8Decode(BufferUtils.hexDecode(testHex)), testString);

		/* compare */
		test.equal(0, BufferUtils.bufferCompare(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode(testString)));
		test.notEqual(0, BufferUtils.bufferCompare(BufferUtils.utf8Encode(testString), BufferUtils.utf8Encode('other')));

		test.done();
	};

		/* In node it's idiomatic for most methods dealing with binary data to
		 * return Buffers. In the browser it's more idiomatic to return
		 * ArrayBuffers (or in browser too old to support ArrayBuffer, wordarrays). */
	exports.bufferutils_resulttype = function(test) {
		if(typeof Buffer !== 'undefined') {
			/* node */
			test.equal(BufferUtils.utf8Encode(testString).constructor, Buffer);
			test.equal(BufferUtils.hexDecode(testHex).constructor, Buffer);
			test.equal(BufferUtils.base64Decode(testBase64).constructor, Buffer);
			test.equal(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor, Buffer);
			test.equal(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor, ArrayBuffer);
		} else if(typeof ArrayBuffer !== 'undefined') {
			/* modern browsers */
			if(typeof TextDecoder !== 'undefined') {
				test.equal(BufferUtils.utf8Encode(testString).constructor, ArrayBuffer);
			} else {
				test.ok(isWordArray(BufferUtils.utf8Encode(testString)));
			}
			test.equal(BufferUtils.hexDecode(testHex).constructor, ArrayBuffer);
			test.equal(BufferUtils.base64Decode(testBase64).constructor, ArrayBuffer);
			test.equal(BufferUtils.toBuffer(BufferUtils.utf8Encode(testString)).constructor, Uint8Array);
			test.equal(BufferUtils.toArrayBuffer(BufferUtils.utf8Encode(testString)).constructor, ArrayBuffer);
		} else {
			/* legacy browsers */
			test.ok(isWordArray(BufferUtils.utf8Encode(testString)));
			test.ok(isWordArray(BufferUtils.hexDecode(testHex)));
			test.ok(isWordArray(BufferUtils.base64Decode(testBase64)));
			test.ok(isWordArray(BufferUtils.toWordArray(BufferUtils.utf8Encode(testString))));
		}
		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});

