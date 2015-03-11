var PresenceMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.Ably.msgpack : require('msgpack-js');

	function PresenceMessage() {
		this.action = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.connectionId = undefined;
		this.data = undefined;
		this.encoding = undefined;
	}

	PresenceMessage.Action = {
		'ABSENT' : 0,
		'PRESENT' : 1,
		'ENTER' : 2,
		'LEAVE' : 3,
		'UPDATE' : 4
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PresenceMessage.prototype.toJSON = function() {
		var result = {
			name: this.name,
			clientId: this.clientId,
			connectionId: this.connectionId,
			timestamp: this.timestamp,
			action: this.action,
			encoding: this.encoding
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var data = this.data;
		if(arguments.length > 0 && BufferUtils.isBuffer(data)) {
			var encoding = this.encoding;
			result.encoding = encoding ? (encoding + '/base64') : 'base64';
			data = data.toString('base64');
		}
		result.data = data;
		return result;
	};

	PresenceMessage.prototype.toString = function() {
		var result = '[PresenceMessage';
		result += '; action=' + this.action;
		if(this.id)
			result += '; id=' + this.id;
		if(this.timestamp)
			result += '; timestamp=' + this.timestamp;
		if(this.clientId)
			result += '; clientId=' + this.clientId;
		if(this.encoding)
			result += '; encoding=' + this.encoding;
		if(this.data) {
			if (typeof(data) == 'string')
				result += '; data=' + this.data;
			else if (BufferUtils.isBuffer(this.data))
				result += '; data (buffer)=' + BufferUtils.base64Encode(this.data);
			else
				result += '; data (json)=' + JSON.stringify(this.data);
		}
		result += ']';
		return result;
	};
	PresenceMessage.encode = Message.encode;
	PresenceMessage.decode = Message.decode;

	PresenceMessage.fromResponseBody = function(body, options, format) {
		if(format)
			body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

		for(var i = 0; i < body.length; i++) {
			var msg = body[i] = PresenceMessage.fromDecoded(body[i]);
			PresenceMessage.decode(msg, options);
		}
		return body;
	};

	PresenceMessage.fromDecoded = function(values) {
		return Utils.mixin(new PresenceMessage(), values);
	};

	PresenceMessage.fromValues = function(values) {
		return Utils.mixin(new PresenceMessage(), values);
	};

	PresenceMessage.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	return PresenceMessage;
})();
