this.Thrift = (function() {
	var isBrowser = (typeof(window) == 'object');
	var thrift = isBrowser ? Thrift : require('thrift');
	var defaultBufferSize = 1024;
	var thriftTransport = thrift.TTransport;
	var thriftProtocol = thrift.TBinaryProtocol;
	var protocolBuffer = new thrift.CheckedBuffer(defaultBufferSize);

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
			var protocol = new thriftProtocol(new thriftTransport(protocolBuffer, function(encoded) {
				result = encoded;
			}));
			ob.write(protocol);
			protocol.flush();
		}
		return result;
	};

	Thrift.decode = function(ob, encoded, callback) {
		try {
			callback(null, ob.read(new thriftProtocol(new thriftTransport(encoded))));
		} catch(e) {
			var msg = 'Unexpected exception decoding thrift message; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'Thrift.decode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			callback(err);
		}
	};

	Thrift.decodeSync = function(ob, encoded) {
		try {
			ob.read(new thriftProtocol(new thriftTransport(encoded)));
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
