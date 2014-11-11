var Message = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function Message() {
		this.name = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.data = undefined;
		this.encoding = undefined;
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
			encoding: this.encoding
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var data = this.data;
		if(arguments.length > 0 && BufferUtils.isBuffer(data)) {
			var encoding = this.encoding;
			result.encoding = encoding ? (encoding + '/base64') : 'base64';
			data = BufferUtils.base64Encode(data);
		}
		result.data = data;
		return result;
	};

	Message.encrypt = function(msg, options) {
		var data = msg.data, encoding = msg.encoding;
		if(!BufferUtils.isBuffer(data)) {
			data = Crypto.Data.utf8Encode(String(data));
			encoding = encoding ? (encoding + '/utf-8') : 'utf-8';
		}
		msg.data = options.cipher.encrypt(data);
		msg.encoding = encoding ? (encoding + '/cipher') : 'cipher';
	};

	Message.encode = function(msg, options) {
		var data = msg.data, encoding;
		if(typeof(data) != 'string' && !BufferUtils.isBuffer(data)) {
			msg.data = JSON.stringify(data);
			msg.encoding = (encoding = msg.encoding) ? (encoding + '/json') : 'json';
		}
		if(options != null && options.encrypted)
			Message.encrypt(msg, options);
	};

	Message.toRequestBody = function(messages, options, format) {
		for (var i = 0; i < messages.length; i++)
			Message.encode(messages[i], options);

		return (format == 'msgpack') ? msgpack.encode(messages, true): JSON.stringify(messages);
	};

	Message.decode = function(message, options) {
		var encoding = message.encoding;
		if(encoding) {
			var xforms = encoding.split('/'),
				i, j = xforms.length,
				data = message.data;

			try {
				while((i = j) > 0) {
					var match = xforms[--j].match(/([\-\w]+)(\+(\w+))?/);
					if(!match) break;
					var xform = match[1];
					switch(xform) {
						case 'base64':
							data = BufferUtils.base64Decode(String(data));
							continue;
						case 'utf-8':
							data = Crypto.Data.utf8Decode(data);
							continue;
						case 'json':
							data = JSON.parse(data);
							continue;
						case 'cipher':
							if(options != null && options.encrypted) {
								data = options.cipher.decrypt(data);
								continue;
							}
						default:
					}
					break;
				}
			} finally {
				message.encoding = (i <= 0) ? null : xforms.slice(0, i).join('/');
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
		return Utils.mixin(new Message(), values);
	};

	Message.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = Message.fromValues(values[i]);
		return result;
	};

	return Message;
})();
