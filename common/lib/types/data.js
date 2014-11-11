this.Data = (function() {

	function Data() {}

	/* ensure a user-supplied data value has appropriate (string or buffer) type */
	Data.toData = function(data) {
		return BufferUtils.isBuffer(data) ? data : String(data);
	};

	/* get a data value from the value received inbound */
	Data.fromEncoded = function(data, msg) {
		if(typeof(data) == 'string') {
			var encoding = msg.encoding, match;
			if(encoding && (match = encoding.match(/((.+)\/)?(\w+)$/)) && (match[3] == 'base64')) {
				data = BufferUtils.decodeBase64(data);
				msg.encoding = match[2];
			}
		}
		return data;
	};

	return Data;
})();
