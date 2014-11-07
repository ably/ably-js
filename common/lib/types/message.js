var Message = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function Message() {
		this.name = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.data = undefined;
		this.xform = undefined;
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	Message.prototype.toJSON = function() {
		var result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			xform: this.xform
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var data = this.data;
		if(arguments.length > 0 && BufferUtils.isBuffer(data)) {
			var xform = this.xform;
			result.xform = xform ? (xform + '/base64') : 'base64';
			data = BufferUtils.base64Encode(data);
		}
		result.data = data;
		return result;
	};

	Message.encrypt = function(msg, options) {
		var data = msg.data, xform = msg.xform;
		if(!BufferUtils.isBuffer(data)) {
			data = Crypto.Data.utf8Encode(String(data));
			xform = xform ? (xform + '/utf-8') : 'utf-8';
		}
		msg.data = options.cipher.encrypt(data);
		msg.xform = xform ? (xform + '/cipher') : 'cipher';
	};

	Message.encode = function(msg, options) {
		if(options != null && options.encrypted)
			Message.encrypt(msg, options);
	};

	Message.toRequestBody = function(messages, options, format) {
		for (var i = 0; i < messages.length; i++)
			Message.encode(messages[i], options);

		return (format == 'msgpack') ? msgpack.encode(messages, true): JSON.stringify(messages);
	};

	Message.decode = function(message, options) {
		var xform = message.xform;
		if(xform) {
			var i = 0, j = xform.length, data = message.data;
			try {
				while((i = j) >= 0) {
					j = xform.lastIndexOf('/', i - 1);
					var subXform = xform.substring(j + 1, i);
					if(subXform == 'base64') {
						data = BufferUtils.base64Decode(String(data));
						continue;
					}
					if(subXform == 'utf-8') {
						data = Crypto.Data.utf8Decode(data);
						continue;
					}
					if(subXform == 'cipher' && options != null && options.encrypted) {
						data = options.cipher.decrypt(data);
						continue;
					}
					/* FIXME: can we do anything generically with msgpack here? */
					break;
				}
			} finally {
				message.xform = (i <= 0) ? null : xform.substring(0, i);
				message.data = data;
			}
		}
	};

	Message.fromResponseBody = function(body, options, format) {
		if(format)
			body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

		for(var i = 0; i < body.length; i++) {
			var msg = body[i] = Message.fromDecoded(body[i]);
			Message.decode(msg, options);
		}
		return body;
	};

	Message.fromDecoded = function(values) {
		return Utils.mixin(new Message(), values);
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
