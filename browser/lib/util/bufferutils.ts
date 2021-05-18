import { parse as parseHex, stringify as stringifyHex } from 'crypto-js/build/enc-hex';
import { parse as parseUtf8, stringify as stringifyUtf8 } from 'crypto-js/build/enc-utf8';
import { parse as parseBase64, stringify as stringifyBase64 } from 'crypto-js/build/enc-base64';
import WordArray from 'crypto-js/build/lib-typedarrays';
import Platform from 'platform';
import { TypedArray } from '../../../common/types/IPlatform';

/* Most BufferUtils methods that return a binary object return an ArrayBuffer
 * if supported, else a CryptoJS WordArray. The exception is toBuffer, which
 * returns a Uint8Array (and won't work on browsers too old to support it) */
module BufferUtils {
	const ArrayBuffer = Platform.ArrayBuffer;
	const atob = Platform.atob;
	const TextEncoder = Platform.TextEncoder;
	const TextDecoder = Platform.TextDecoder;
	export const base64CharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	export const hexCharSet = '0123456789abcdef';

	function isWordArray(ob: unknown): ob is WordArray { return ob !== null && ob !== undefined && (ob as WordArray).sigBytes !== undefined; }
	function isArrayBuffer(ob: unknown): ob is ArrayBuffer { return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer; }
	function isTypedArray(ob: unknown): ob is TypedArray { return !!ArrayBuffer && ArrayBuffer.isView && ArrayBuffer.isView(ob); }

	// https://gist.githubusercontent.com/jonleighton/958841/raw/f200e30dfe95212c0165ccf1ae000ca51e9de803/gistfile1.js
	function uint8ViewToBase64(bytes: Uint8Array) {
		let base64      = ''
		const encodings = base64CharSet;

		const byteLength    = bytes.byteLength;
		const byteRemainder = byteLength % 3;
		const mainLength    = byteLength - byteRemainder;

		let a, b, c, d;
		let chunk;

		// Main loop deals with bytes in chunks of 3
		for (let i = 0; i < mainLength; i = i + 3) {
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

	function base64ToArrayBuffer(base64: string) {
		const binary_string =  atob?.(base64) as string; // this will always be defined in browser so it's safe to cast
		const len = binary_string.length;
		const bytes = new Uint8Array( len );
		for (let i = 0; i < len; i++)        {
			const ascii = binary_string.charCodeAt(i);
			bytes[i] = ascii;
		}
		return bytes.buffer;
	}

	function BufferUtils() {}

	export function isBuffer(buf: unknown): buf is (ArrayBuffer | WordArray | TypedArray) { return isArrayBuffer(buf) || isWordArray(buf) || isTypedArray(buf); };

	/* In browsers, returns a Uint8Array */
	export function toBuffer(buf: WordArray | TypedArray | ArrayBuffer) {
		if(!ArrayBuffer) {
			throw new Error("Can't convert to Buffer: browser does not support the necessary types");
		}

		if(isArrayBuffer(buf)) {
			return new Uint8Array(buf as ArrayBuffer);
		}

		if(isTypedArray(buf)) {
			return new Uint8Array((buf as TypedArray).buffer);
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

	export function toArrayBuffer(buf: ArrayBuffer | WordArray) {
		if(isArrayBuffer(buf)) {
			return buf;
		}
		return toBuffer(buf).buffer;
	};

	export function toWordArray(buf: TypedArray | WordArray | number[] | ArrayBuffer) {
		if(isTypedArray(buf)) {
			buf = buf.buffer;
		}
		return isWordArray(buf) ? buf : WordArray.create(buf as number[]);
	};

	export function base64Encode(buf: WordArray | ArrayBuffer) {
		if(isWordArray(buf)) {
			return stringifyBase64(buf);
		}
		return uint8ViewToBase64(toBuffer(buf));
	};

	export function base64Decode(str: string) {
		if(ArrayBuffer && atob) {
			return base64ToArrayBuffer(str);
		}
		return parseBase64(str);
	};

	export function hexEncode(buf: ArrayBuffer) {
		return stringifyHex(toWordArray(buf));
	};

	export function hexDecode(string: string) {
		var wordArray = parseHex(string);
		return ArrayBuffer ? toArrayBuffer(wordArray) : wordArray;
	};

	export function utf8Encode(string: string) {
		if(TextEncoder) {
			return (new TextEncoder()).encode(string).buffer;
		}
		return parseUtf8(string);
	};

	/* For utf8 decoding we apply slightly stricter input validation than to
	 * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
	 * can take (in particular allowing strings, which are just interpreted as
	 * binary); here we ensure that the input is actually a buffer since trying
	 * to utf8-decode a string to another string is almost certainly a mistake */
	export function utf8Decode(buf: ArrayBuffer | WordArray) {
		if(!isBuffer(buf)) {
			throw new Error("Expected input of utf8decode to be an arraybuffer, typed array, or CryptoJS wordarray");
		}
		if(TextDecoder && !isWordArray(buf)) {
			return (new TextDecoder()).decode(buf);
		}
		buf = toWordArray(buf);
		return stringifyUtf8(buf);
	};

	export function bufferCompare(buf1: TypedArray, buf2: TypedArray) {
		if(!buf1) return -1;
		if(!buf2) return 1;
		const wordArray1 = toWordArray(buf1);
		const wordArray2 = toWordArray(buf2);
		wordArray1.clamp(); wordArray2.clamp();

		var cmp = wordArray1.sigBytes - wordArray2.sigBytes;
		if(cmp != 0) return cmp;
		const words1 = wordArray1.words;
        const words2 = wordArray2.words;
		for(var i = 0; i < words1.length; i++) {
			cmp = words1[i] - words2[i];
			if(cmp != 0) return cmp;
		}
		return 0;
	};

	export function byteLength(buf: ArrayBuffer | TypedArray | WordArray) {
		if(isArrayBuffer(buf) || isTypedArray(buf)) {
			return buf.byteLength
		} else if(isWordArray(buf)) {
			return buf.sigBytes;
		}
	};

	/* Returns ArrayBuffer on browser and Buffer on Node.js */
	export function typedArrayToBuffer(typedArray: TypedArray) {
		return typedArray.buffer;
	};
};

export default BufferUtils;
