this.BufferUtils = (function() {
	function BufferUtils() {}

	BufferUtils.supportsBinary = true;

	BufferUtils.isBuffer = Buffer.isBuffer;

	BufferUtils.toArrayBuffer = function(buf) { return buf; };

	BufferUtils.base64Encode = function(buf) { return buf.toString('base64'); };

	BufferUtils.base64Decode = function(string) { return new Buffer(string, 'base64'); };

	BufferUtils.hexEncode = function(buf) { return buf.toString('hex'); };

	BufferUtils.utf8Encode = function(string) { return new Buffer(string, 'utf8'); };

	BufferUtils.utf8Decode = function(buf) {
		if(BufferUtils.isBuffer(buf))
			return buf.toString('utf8');
		throw new Error("Expected input of utf8Decode to be a buffer or CryptoJS WordArray");
	};

	BufferUtils.bufferCompare = function(buf1, buf2) {
		if(!buf1) return -1;
		if(!buf2) return 1;
		return buf1.compare(buf2);
	};

	return BufferUtils;
})();
