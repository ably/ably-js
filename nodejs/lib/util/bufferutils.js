this.BufferUtils = (function() {
	function BufferUtils() {}

	function isArrayBuffer(ob) { return ob !== null && ob !== undefined && ob.constructor === ArrayBuffer; }

	/* In node, BufferUtils methods that return binary objects return a Buffer
	 * for historical reasons; the browser equivalents return ArrayBuffers */
	var isBuffer = BufferUtils.isBuffer = function(buf) { return Buffer.isBuffer(buf) || isArrayBuffer(buf) || ArrayBuffer.isView(buf); };

	BufferUtils.toBuffer = function(buf) { return Buffer.from(buf); };

	BufferUtils.toArrayBuffer = function(buf) { return Buffer.from(buf).buffer; };

	BufferUtils.base64Encode = function(buf) { return Buffer.from(buf).toString('base64'); };

	BufferUtils.base64Decode = function(string) { return new Buffer(string, 'base64'); };

	BufferUtils.hexEncode = function(buf) { return Buffer.from(buf).toString('hex'); };

	BufferUtils.hexDecode = function(string) { return new Buffer(string, 'hex'); };

	BufferUtils.utf8Encode = function(string) { return new Buffer(string, 'utf8'); };

	/* For utf8 decoding we apply slightly stricter input validation than to
	 * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
	 * can take (in particular allowing strings, which are just interpreted as
	 * binary); here we ensure that the input is actually a buffer since trying
	 * to utf8-decode a string to another string is almost certainly a mistake */
	BufferUtils.utf8Decode = function(buf) {
		if(!isBuffer(buf)) {
			throw new Error("Expected input of utf8Decode to be a buffer, arraybuffer, or view");
		}
		return Buffer.from(buf).toString('utf8');
	};

	BufferUtils.bufferCompare = function(buf1, buf2) {
		if(!buf1) return -1;
		if(!buf2) return 1;
		return buf1.compare(buf2);
	};

	BufferUtils.byteLength = function(buffer) {
		return buffer.byteLength;
	};

	return BufferUtils;
})();
