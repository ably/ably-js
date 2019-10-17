var BufferUtils = (function() {
	var WordArray = CryptoJS.lib.WordArray;
	var ArrayBuffer = Platform.ArrayBuffer;
	var atob = Platform.atob;
	var TextEncoder = Platform.TextEncoder;
	var TextDecoder = Platform.TextDecoder;
	var base64CharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var hexCharSet = '0123456789abcdef';

	function isWordArray(ob) { return ob !== null && ob !== undefined && ob.sigBytes !== undefined; }
	function isArrayBuffer(ob) { return ob !== null && ob !== undefined && ob.constructor === ArrayBuffer; }
	function isTypedArray(ob) { return ArrayBuffer && ArrayBuffer.isView && ArrayBuffer.isView(ob); }

	// https://gist.githubusercontent.com/jonleighton/958841/raw/f200e30dfe95212c0165ccf1ae000ca51e9de803/gistfile1.js
	function uint8ViewToBase64(bytes) {
		var base64    = ''
		var encodings = base64CharSet;

		var byteLength    = bytes.byteLength
		var byteRemainder = byteLength % 3
		var mainLength    = byteLength - byteRemainder

		var a, b, c, d
		var chunk

		// Main loop deals with bytes in chunks of 3
		for (var i = 0; i < mainLength; i = i + 3) {
			// Combine the three bytes into a single integer
			chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

			// Use bitmasks to extract 6-bit segments from the triplet
			a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
			b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
			c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
			d = chunk & 63               // 63       = 2^6 - 1

			// Convert the raw binary segments to the appropriate ASCII encoding
			base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
		}

		// Deal with the remaining bytes and padding
		if (byteRemainder == 1) {
			chunk = bytes[mainLength]

			a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

			// Set the 4 least significant bits to zero
			b = (chunk & 3)   << 4 // 3   = 2^2 - 1

			base64 += encodings[a] + encodings[b] + '=='
		} else if (byteRemainder == 2) {
			chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

			a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
			b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

			// Set the 2 least significant bits to zero
			c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

			base64 += encodings[a] + encodings[b] + encodings[c] + '='
		}

		return base64
	}

	function base64ToArrayBuffer(base64) {
		var binary_string =  atob(base64);
		var len = binary_string.length;
		var bytes = new Uint8Array( len );
		for (var i = 0; i < len; i++)        {
			var ascii = binary_string.charCodeAt(i);
			bytes[i] = ascii;
		}
		return bytes.buffer;
	}

	/* Most BufferUtils methods that return a binary object return an ArrayBuffer
	 * if supported, else a CryptoJS WordArray. The exception is toBuffer, which
	 * returns a Uint8Array (and won't work on browsers too old to support it) */
	function BufferUtils() {}

	BufferUtils.base64CharSet = base64CharSet;
	BufferUtils.hexCharSet = hexCharSet;

	var isBuffer = BufferUtils.isBuffer = function(buf) { return isArrayBuffer(buf) || isWordArray(buf) || isTypedArray(buf); };

	/* In browsers, returns a Uint8Array */
	var toBuffer = BufferUtils.toBuffer = function(buf) {
		if(!ArrayBuffer) {
			throw new Error("Can't convert to Buffer: browser does not support the necessary types");
		}

		if(isArrayBuffer(buf)) {
			return new Uint8Array(buf);
		}

		if(isTypedArray(buf)) {
			return new Uint8Array(buf.buffer);
		}

		if(isWordArray(buf)) {
			/* Backported from unreleased CryptoJS
			* https://code.google.com/p/crypto-js/source/browse/branches/3.x/src/lib-typedarrays.js?r=661 */
			var arrayBuffer = new ArrayBuffer(buf.sigBytes);
			var uint8View = new Uint8Array(arrayBuffer);

			for (var i = 0; i < buf.sigBytes; i++) {
				uint8View[i] = (buf.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
			}

			return uint8View;
		};

		throw new Error("BufferUtils.toBuffer expected an arraybuffer, typed array, or CryptoJS wordarray");
	};

	BufferUtils.toArrayBuffer = function(buf) {
		if(isArrayBuffer(buf)) {
			return buf;
		}
		return toBuffer(buf).buffer;
	};

	BufferUtils.toWordArray = function(buf) {
		if(isTypedArray(buf)) {
			buf = buf.buffer;
		}
		return isWordArray(buf) ? buf : WordArray.create(buf);
	};

	BufferUtils.base64Encode = function(buf) {
		if(isWordArray(buf)) {
			return CryptoJS.enc.Base64.stringify(buf);
		}
		return uint8ViewToBase64(toBuffer(buf));
	};

	BufferUtils.base64Decode = function(str) {
		if(ArrayBuffer && atob) {
			return base64ToArrayBuffer(str);
		}
		return CryptoJS.enc.Base64.parse(str);
	};

	BufferUtils.hexEncode = function(buf) {
		buf = BufferUtils.toWordArray(buf);
		return CryptoJS.enc.Hex.stringify(buf);
	};

	BufferUtils.hexDecode = function(string) {
		var wordArray = CryptoJS.enc.Hex.parse(string);
		return ArrayBuffer ? BufferUtils.toArrayBuffer(wordArray) : wordArray;
	};

	BufferUtils.utf8Encode = function(string) {
		if(TextEncoder) {
			return (new TextEncoder()).encode(string).buffer;
		}
		return CryptoJS.enc.Utf8.parse(string);
	};

	/* For utf8 decoding we apply slightly stricter input validation than to
	 * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
	 * can take (in particular allowing strings, which are just interpreted as
	 * binary); here we ensure that the input is actually a buffer since trying
	 * to utf8-decode a string to another string is almost certainly a mistake */
	BufferUtils.utf8Decode = function(buf) {
		if(!isBuffer(buf)) {
			throw new Error("Expected input of utf8decode to be an arraybuffer, typed array, or CryptoJS wordarray");
		}
		if(TextDecoder && !isWordArray(buf)) {
			return (new TextDecoder()).decode(buf);
		}
		buf = BufferUtils.toWordArray(buf);
		return CryptoJS.enc.Utf8.stringify(buf);
	};

	BufferUtils.bufferCompare = function(buf1, buf2) {
		if(!buf1) return -1;
		if(!buf2) return 1;
		buf1 = BufferUtils.toWordArray(buf1);
		buf2 = BufferUtils.toWordArray(buf2);
		buf1.clamp(); buf2.clamp();

		var cmp = buf1.sigBytes - buf2.sigBytes;
		if(cmp != 0) return cmp;
		buf1 = buf1.words; buf2 = buf2.words;
		for(var i = 0; i < buf1.length; i++) {
			cmp = buf1[i] - buf2[i];
			if(cmp != 0) return cmp;
		}
		return 0;
	};

	BufferUtils.byteLength = function(buf) {
		if(isArrayBuffer(buf) || isTypedArray(buf)) {
			return buf.byteLength
		} else if(isWordArray(buf)) {
			return buf.sigBytes;
		}
	};

	return BufferUtils;
})();
