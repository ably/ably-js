var BufferUtils = (function() {
	var WordArray = CryptoJS.lib.WordArray;
	var ArrayBuffer = window.ArrayBuffer;
	var TextDecoder = window.TextDecoder;

	function isWordArray(ob) { return ob !== null && ob !== undefined && ob.sigBytes !== undefined; }
	function isArrayBuffer(ob) { return ob !== null && ob !== undefined && ob.constructor === ArrayBuffer; }

	// https://gist.githubusercontent.com/jonleighton/958841/raw/f200e30dfe95212c0165ccf1ae000ca51e9de803/gistfile1.js
	function arrayBufferToBase64(ArrayBuffer) {
		var base64    = ''
		var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

		var bytes         = new Uint8Array(ArrayBuffer)
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
		var binary_string =  window.atob(base64);
		var len = binary_string.length;
		var bytes = new Uint8Array( len );
		for (var i = 0; i < len; i++)        {
			var ascii = binary_string.charCodeAt(i);
			bytes[i] = ascii;
		}
		return bytes.buffer;
	}

	function BufferUtils() {}

	BufferUtils.supportsBinary = !!TextDecoder;

	BufferUtils.isBuffer = function(buf) { return isArrayBuffer(buf) || isWordArray(buf); };

	BufferUtils.toWordArray = function(buf) {
		return isWordArray(buf) ? buf : WordArray.create(buf);
	};

	BufferUtils.base64Encode = function(buf) {
		if(isArrayBuffer(buf))
			return arrayBufferToBase64(buf);
		if(isWordArray(buf))
			return CryptoJS.enc.Base64.stringify(buf);
	};

	BufferUtils.base64Decode = function(str) {
		if(ArrayBuffer)
			return base64ToArrayBuffer(str);

		if(CryptoJS)
			return CryptoJS.enc.Base64.parse(str);
	};

	BufferUtils.utf8Encode = function(string) {
		if(CryptoJS)
			return CryptoJS.enc.Utf8.parse(string);
	};

	BufferUtils.utf8Decode = function(buf) {
		if(CryptoJS)
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

	return BufferUtils;
})();