import { TypedArray } from '../../../common/types/IPlatform';

module BufferUtils {
	function isArrayBuffer(ob: unknown) { return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer; }

	/* In node, BufferUtils methods that return binary objects return a Buffer
	 * for historical reasons; the browser equivalents return ArrayBuffers */
	export const isBuffer = function(buf: Buffer) { return Buffer.isBuffer(buf) || isArrayBuffer(buf) || ArrayBuffer.isView(buf); };

    export const toBuffer = function(buf: Buffer) {
		if(Buffer.isBuffer(buf)) {
			return buf;
		}
		return Buffer.from(buf);
	};

	export const toArrayBuffer = function(buf: Buffer) { return toBuffer(buf).buffer; };

	export const base64Encode = function(buf: Buffer) { return toBuffer(buf).toString('base64'); };

	export const base64Decode = function(string: string) { return Buffer.from(string, 'base64'); };

	export const hexEncode = function(buf: Buffer) { return toBuffer(buf).toString('hex'); };

	export const hexDecode = function(string: string) { return Buffer.from(string, 'hex'); };

	export const utf8Encode = function(string: string) { return Buffer.from(string, 'utf8'); };

	/* For utf8 decoding we apply slightly stricter input validation than to
	 * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
	 * can take (in particular allowing strings, which are just interpreted as
	 * binary); here we ensure that the input is actually a buffer since trying
	 * to utf8-decode a string to another string is almost certainly a mistake */
	export const utf8Decode = function(buf: Buffer) {
		if(!isBuffer(buf)) {
			throw new Error("Expected input of utf8Decode to be a buffer, arraybuffer, or view");
		}
		return toBuffer(buf).toString('utf8');
	};

	export const bufferCompare = function(buf1: Buffer, buf2: Buffer) {
		if(!buf1) return -1;
		if(!buf2) return 1;
		return buf1.compare(buf2);
	};

	export const byteLength = function(buffer: Buffer) {
		return buffer.byteLength;
	};

	/* Returns ArrayBuffer on browser and Buffer on Node.js */
	export const typedArrayToBuffer = function(typedArray: TypedArray) {
		return toBuffer(typedArray.buffer as Buffer);
	};
};

export default BufferUtils;
