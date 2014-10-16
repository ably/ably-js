var Message = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack');

	function Message() {
		this.name = undefined;
		this.clientId = undefined;
		this.timestamp = undefined;
		this.data = undefined;
	}

	Message.encrypt = function(msg, cipher) {
		var cipherData = new TData(), data = msg.data;
		cipherData.cipherData = cipher.encrypt(Crypto.Data.asPlaintext(data));
		cipherData.type = data.type;
		msg.data = cipherData;
	};

	Message.decrypt = function(msg, cipher) {
		var data = msg.data;
		if(data.cipherData)
			msg.data = Crypto.Data.fromPlaintext(cipher.decrypt(data.cipherData), data.type);
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	Message.prototype.toJSON = function() {
		var data = this.data, result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		if(arguments.length > 0 && BufferUtils.isBuffer(data)) {
			result.encoding = 'base64';
			data = BufferUtils.base64Encode(data);
		}
		result.data = data;
		return result;
	};

	Message.encode = function(msg, format) {
		return (format == 'msgpack') ? msgpack.pack(msg): JSON.stringify(msg);
	};

	Message.encodeArray = function(messages, format) {
		return (format == 'msgpack') ? msgpack.pack(messages): JSON.stringify(messages);
	};

	Message.decode = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.unpack(encoded) : JSON.parse(String(encoded));
		return Message.fromDecoded(decoded);
	};

	Message.decodeArray = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.unpack(encoded) : JSON.parse(String(encoded));
		for(var i = 0; i < decoded.length; i++) decoded[i] = Message.fromDecoded(decoded[i]);
	};

	Message.fromDecoded = function(values) {
		var result = Utils.mixin(new Message(), values);
		result.data = Data.fromEncoded(result.data, values);
		return result;
	};

	Message.fromValues = function(values) {
		var result = Utils.mixin(new Message(), values);
		result.data = Data.toData(result.data);
		result.timestamp = result.timestamp || Date.now();
		return result;
	};

	Message.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = Message.fromValues(values[i]);
		return result;
	};

	return Message;
})();
