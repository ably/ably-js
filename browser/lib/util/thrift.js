this.Thrift = (function() {
	var isBrowser = (typeof(window) == 'object');
	var thrift = isBrowser ? Thrift : require('thrift');
	var defaultBufferSize = 1024;
	var thriftTransport = new thrift.TTransport();
	var thriftProtocol = new thrift.TBinaryProtocol(thriftTransport);
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

	function Thrift() {}

	Thrift.encode = function(ob, callback) {
		try {
			callback(null, Thrift.encodeSync(ob));
		} catch(e) {
			var msg = 'Unexpected exception encoding Thrift; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'Thrift.encode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			callback(err);
		}
	};

	Thrift.encodeSync = function(ob) {
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

	Thrift.decode = function(ob, encoded, callback) {
		var err = Thrift.decodeSync(ob, encoded);
		if(err) callback(err);
		else callback(null, ob, encoded);
	};

	Thrift.decodeSync = function(ob, encoded) {
		try {
			thriftTransport.reset(encoded);
			ob.read(thriftProtocol);
			return ob;
		} catch(e) {
			var msg = 'Unexpected exception decoding thrift message; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'Thrift.decode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			throw err;
		}
	};

})();
