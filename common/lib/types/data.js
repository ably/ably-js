this.Data = (function() {

	function Data() {}

	/* ensure a user-supplied data value has appropriate (string or buffer) type */
	Data.toData = function(data) {
		return BufferUtils.isBuffer(data) ? data : String(data);
	};

	/* get a data value from the value received inbound */
	Data.fromEncoded = function(data, msg) {
		if(typeof(data) == 'string' && msg.encoding == 'base64')
			data = BufferUtils.encodeBase64(data);
		return data;
	};

	return Data;
})();
