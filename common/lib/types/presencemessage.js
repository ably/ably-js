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

	/* Contains an Enum like Array of presence actions
	   in lower case format i.e. [0] => 'absent' */
	PresenceMessage.ActionEvents = [];
	for (var action in PresenceMessage.Action) {
		PresenceMessage.ActionEvents.push(action.toLowerCase())
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PresenceMessage.prototype.toJSON = function() {
		var result = {
			clientId: this.clientId,
			action: this.getActionNumeric(),
			encoding: this.encoding
		};

		/* encode data to base64 if present and we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it has a non-empty arguments list */
		var data = this.data;
		if(data && BufferUtils.isBuffer(data)) {
			if(arguments.length > 0) {
				/* stringify call */
				var encoding = this.encoding;
				result.encoding = encoding ? (encoding + '/base64') : 'base64';
				data = BufferUtils.base64Encode(data);
			} else {
				/* Called by msgpack. Need to feed it an ArrayBuffer, msgpack doesn't
				* understand WordArrays */
				data = BufferUtils.toArrayBuffer(data);
			}
		}
		result.data = data;
		return result;
	};

	/* When a PresenceMessage object is created using functions from*
	   the action numeric is converted to a string value making it
	   easier for developers to undersatnd what the action represents.
	   This method gets the numeric value */
	PresenceMessage.prototype.getActionNumeric = function() {
		var actionNum = PresenceMessage.Action[String(this.action).toUpperCase()];
		return typeof(actionNum) === 'number' ? actionNum : this.action;
	}

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
				channel.emit('error', e);
			}
		}
		return body;
	};

	PresenceMessage.fromDecoded = function(values) {
		return PresenceMessage.fromValues(values);
	};

	PresenceMessage.fromValues = function(values) {
		var presenceMessage = Utils.mixin(new PresenceMessage(), values);
		if (values && (typeof(values.action) == 'number')) {
			// As PresenceMessage.Action is not available in the global scope
			// convert action to a string value instead of a meaningless
			// index of the PresenceMessage.Action enum
			// Use lower case for consistency with events emitted i.e. subscribe('enter')
			if (PresenceMessage.ActionEvents[values.action])
				presenceMessage.action = PresenceMessage.ActionEvents[values.action].toLowerCase();
		}
		return presenceMessage;
	};

	/* Ably uses a numeric enum for actions, see PresenceMessage.Action above
	   The client library API exposes PresenceMessage.action as a meaningful string
	   whereas Ably requires the number. This method is called before the message
	   is pushed to Ably to ensure the action value is a number */
	PresenceMessage.fromValuesWithNumericAction = function(values) {
		var presenceMessage = Utils.mixin(new PresenceMessage(), values);
		if (presenceMessage && (typeof(presenceMessage.action) !== 'number')) {
			presenceMessage.action = presenceMessage.getActionNumeric();
		}
		return presenceMessage;
	};

	PresenceMessage.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	return PresenceMessage;
})();
