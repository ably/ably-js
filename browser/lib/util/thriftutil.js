this.ThriftUtil = (function() {
	var thriftTransport = new Thrift.TTransport();
	var thriftProtocol = new Thrift.TBinaryProtocol(thriftTransport);
	var defaultBufferSize = 16384;

	var buffers = [];

	function createBuffer(len) { return new Buffer(len || defaultBufferSize); }
	function getBuffer(len) {
		var len = len || 0;
		if(buffers.length) {
			var buf = buffers.shift();
			if(buf.length >= len)
				return buf;
		}
		return createBuffer(len);
	}

	function releaseBuffer(buf) { buffers.unshift(buf); }

	function ThriftUtil() {}

	ThriftUtil.encode = function(ob, callback) {
		try {
			callback(null, ThriftUtil.encodeSync(ob));
		} catch(e) {
			var msg = 'Unexpected exception encoding Thrift; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'ThriftUtil.encode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			callback(err);
		}
	};

	ThriftUtil.encodeSync = function(ob) {
		var result = undefined;
		if(ob) {
			var buf = getBuffer();
			thriftTransport.reset(buf, function(encoded) {
				result = encoded;
			});
			ob.write(thriftProtocol);
			thriftProtocol.flush();
			releaseBuffer(buf);
		}
		return result;
	};

	ThriftUtil.decode = function(ob, encoded, callback) {
		var err = ThriftUtil.decodeSync(ob, encoded);
		if(err) callback(err);
		else callback(null, ob, encoded);
	};

	ThriftUtil.decodeSync = function(ob, encoded) {
		try {
			thriftTransport.reset(encoded);
			ob.read(thriftProtocol);
			return ob;
		} catch(e) {
			var msg = 'Unexpected exception decoding thrift message; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'ThriftUtil.decode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			throw err;
		}
	};

})();
