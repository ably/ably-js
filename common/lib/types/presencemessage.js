var PresenceMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.Ably.msgpack : require('msgpack-js');

	function toActionValue(actionString) {
		return Utils.arrIndexOf(PresenceMessage.Actions, actionString)
	}

	function PresenceMessage() {
		this.action = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.connectionId = undefined;
		this.data = undefined;
		this.encoding = undefined;
	}

	PresenceMessage.Actions = [
		'absent',
		'present',
		'enter',
		'leave',
		'update'
	];

	PresenceMessage.prototype.prepareForSending = function(format) {
		var result = {
			clientId: this.clientId,
			/* Convert presence action back to an int for sending to Ably */
			action: toActionValue(this.action),
			encoding: this.encoding
		};

		/* encode data to base64 if present and we're returning real JSON */
		var data = this.data;
		if(data && BufferUtils.isBuffer(data)) {
			if(format === 'json') {
				var encoding = this.encoding;
				result.encoding = encoding ? (encoding + '/base64') : 'base64';
				data = BufferUtils.base64Encode(data);
			} else if(format === 'msgpack') {
				/* msgpack. Need to feed it an ArrayBuffer, msgpack doesn't
				* understand WordArrays */
				data = BufferUtils.toArrayBuffer(data);
			}
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
		if(this.connectionId)
			result += '; connectionId=' + this.connectionId;
		if(this.encoding)
			result += '; encoding=' + this.encoding;
		if(this.data) {
			if (typeof(this.data) == 'string')
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

	PresenceMessage.fromResponseBody = function(body, options, format, channel) {
		if(format)
			body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

		for(var i = 0; i < body.length; i++) {
			var msg = body[i] = PresenceMessage.fromDecoded(body[i]);
			try {
				PresenceMessage.decode(msg, options);
			} catch (e) {
				Logger.logAction(Logger.LOG_ERROR, 'PresenceMessage.fromResponseBody()', e.toString());
				channel && channel.emit('error', e);
			}
		}
		return body;
	};

	/* Creates a PresenceMessage from values obtained from an Ably protocol
	* message; in particular, with a numeric presence action */
	PresenceMessage.fromDecoded = function(values) {
		values.action = PresenceMessage.Actions[values.action]
		return Utils.mixin(new PresenceMessage(), values);
	};

	/* Creates a PresenceMessage from specified values, with a string presence action */
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
