this.BufferUtils = (function() {
	function BufferUtils() {}

	BufferUtils.supportsBuffer = true;

	BufferUtils.supportsBinary = true;

	BufferUtils.isBuffer = Buffer.isBuffer;

	BufferUtils.base64Encode = function(buf) { return buf.toString('base64'); };

	BufferUtils.base64Decode = function(string) { return new Buffer(string, 'base64'); };

	return BufferUtils;
})();
