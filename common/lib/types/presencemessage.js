var PresenceMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack');

	function PresenceMessage() {
		this.action = undefined;
		this.clientId = undefined;
		this.clientData = undefined;
		this.memberId = undefined;
		this.inheritMemberId = undefined;
	}

	PresenceMessage.Action = {
		'ENTER' : 0,
		'LEAVE' : 1,
		'UPDATE' : 2
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PresenceMessage.prototype.toJSON = function() {
		var clientData = this.clientData, result = {
			name: this.name,
			clientId: this.clientId,
			memberId: this.memberId,
			timestamp: this.timestamp,
			action: this.action
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		if(arguments.length > 0 && BufferUtils.isBuffer(clientData)) {
			result.encoding = 'base64';
			clientData = BufferUtils.encodeBase64(clientData);
		}
		result.clientData = clientData;
		return result;
	};

	PresenceMessage.encode = function(msg, format) {
		return (format == 'msgpack') ? msgpack.pack(msg): JSON.stringify(msg);
	};

	PresenceMessage.decode = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.unpack(encoded) : JSON.parse(String(encoded));
		return PresenceMessage.fromDecoded(decoded);
	};

	PresenceMessage.decodeArray = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.unpack(encoded) : JSON.parse(String(encoded));
		for(var i = 0; i < decoded.length; i++) decoded[i] = PresenceMessage.fromDecoded(decoded[i]);
		return decoded;
	};

	PresenceMessage.fromDecoded = function(values) {
		var result = Utils.mixin(new PresenceMessage(), values);
		result.clientData = Data.fromEncoded(result.clientData, values);
		return result;
	};

	PresenceMessage.fromValues = function(values) {
		var result = Utils.mixin(new PresenceMessage(), values);
		result.clientData = Data.toData(result.clientData);
		result.timestamp = result.timestamp || Date.now();
		return result;
	};

	PresenceMessage.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	return PresenceMessage;
})();
