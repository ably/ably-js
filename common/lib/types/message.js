var Message = (function() {

	function Message() {
		this.name = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.connectionId = undefined;
		this.connectionKey = undefined;
		this.data = undefined;
		this.encoding = undefined;
		this.extras = undefined;
		this.size = undefined;
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	Message.prototype.toJSON = function() {
		var result = {
			name: this.name,
			id: this.id,
			clientId: this.clientId,
			connectionId: this.connectionId,
			connectionKey: this.connectionKey,
			encoding: this.encoding,
			extras: this.extras
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
				/* Called by msgpack. toBuffer returns a datatype understandable by
				 * that platform's msgpack implementation (Buffer in node, Uint8Array
				 * in browsers) */
				data = BufferUtils.toBuffer(data);
			}
		}
		result.data = data;
		return result;
	};

	Message.prototype.toString = function() {
		var result = '[Message';
		if(this.name)
			result += '; name=' + this.name;
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
		if(this.extras)
			result += '; extras =' + JSON.stringify(this.extras);
		if(this.data) {
			if (typeof(this.data) == 'string')
				result += '; data=' + this.data;
			else if (BufferUtils.isBuffer(this.data))
				result += '; data (buffer)=' + BufferUtils.base64Encode(this.data);
			else
				result += '; data (json)=' + JSON.stringify(this.data);
		}
		if(this.extras)
			result += '; extras=' + JSON.stringify(this.extras);
		result += ']';
		return result;
	};

	Message.encrypt = function(msg, options, callback) {
		var data = msg.data,
			encoding = msg.encoding,
			cipher = options.channelCipher;

		encoding = encoding ? (encoding + '/') : '';
		if(!BufferUtils.isBuffer(data)) {
			data = BufferUtils.utf8Encode(String(data));
			encoding = encoding + 'utf-8/';
		}
		cipher.encrypt(data, function(err, data) {
			if (err) {
				callback(err);
				return;
			}
			msg.data = data;
			msg.encoding = encoding + 'cipher+' + cipher.algorithm;
			callback(null, msg);
		});
	};

	Message.encode = function(msg, options, callback) {
		var data = msg.data, encoding,
			nativeDataType = typeof(data) == 'string' || BufferUtils.isBuffer(data) || data === null || data === undefined;

		if (!nativeDataType) {
			if (Utils.isObject(data) || Utils.isArray(data)) {
				msg.data = JSON.stringify(data);
				msg.encoding = (encoding = msg.encoding) ? (encoding + '/json') : 'json';
			} else {
				throw new ErrorInfo('Data type is unsupported', 40013, 400);
			}
		}

		if(options != null && options.cipher) {
			Message.encrypt(msg, options, callback);
		} else {
			callback(null, msg);
		}
	};

	Message.encodeArray = function(messages, options, callback) {
		var processed = 0;
		for (var i = 0; i < messages.length; i++) {
			Message.encode(messages[i], options, function(err, msg) {
				if (err) {
					callback(err);
					return;
				}
				processed++;
				if (processed == messages.length) {
					callback(null, messages);
				}
			});
		}
	};

	Message.serialize = Utils.encodeBody;

	Message.decode = function(message, options) {
		var encoding = message.encoding;
		if(encoding) {
			var xforms = encoding.split('/'),
				i, j = xforms.length,
				data = message.data;

			try {
				while((i = j) > 0) {
					var match = xforms[--j].match(/([\-\w]+)(\+([\w\-]+))?/);
					if(!match) break;
					var xform = match[1];
					switch(xform) {
						case 'base64':
							data = BufferUtils.base64Decode(String(data));
							continue;
						case 'utf-8':
							data = BufferUtils.utf8Decode(data);
							continue;
						case 'json':
							data = JSON.parse(data);
							continue;
						case 'cipher':
							if(options != null && options.cipher) {
								var xformAlgorithm = match[3], cipher = options.channelCipher;
								/* don't attempt to decrypt unless the cipher params are compatible */
								if(xformAlgorithm != cipher.algorithm) {
									throw new Error('Unable to decrypt message with given cipher; incompatible cipher params');
								}
								data = cipher.decrypt(data);
								continue;
							} else {
								throw new Error('Unable to decrypt message; not an encrypted channel');
							}
						default:
							throw new Error("Unknown encoding");
					}
					break;
				}
			} catch(e) {
				throw new ErrorInfo('Error processing the ' + xform + ' encoding, decoder returned ‘' + e.message + '’', 40013, 400);
			} finally {
				message.encoding = (i <= 0) ? null : xforms.slice(0, i).join('/');
				message.data = data;
			}
		}
	};

	Message.fromResponseBody = function(body, options, format) {
		if(format) {
			body = Utils.decodeBody(body, format);
		}

		for(var i = 0; i < body.length; i++) {
			var msg = body[i] = Message.fromValues(body[i]);
			try {
				Message.decode(msg, options);
			} catch (e) {
				Logger.logAction(Logger.LOG_ERROR, 'Message.fromResponseBody()', e.toString());
			}
		}
		return body;
	};

	Message.fromValues = function(values) {
		return Utils.mixin(new Message(), values);
	};

	Message.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = Message.fromValues(values[i]);
		return result;
	};

	function normalizeCipherOptions(options) {
		if(options && options.cipher && !options.cipher.channelCipher) {
			if(!Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
			var cipher = Crypto.getCipher(options.cipher);
			options.cipher = cipher.cipherParams;
			options.channelCipher = cipher.cipher;
		}
	}

	Message.fromEncoded = function(encoded, options) {
		var msg = Message.fromValues(encoded);
		normalizeCipherOptions(options);
		/* if decoding fails at any point, catch and return the message decoded to
		 * the fullest extent possible */
		try {
			Message.decode(msg, options);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'Message.fromEncoded()', e.toString());
		}
		return msg;
	};

	Message.fromEncodedArray = function(encodedArray, options) {
		normalizeCipherOptions(options);
		return Utils.arrMap(encodedArray, function(encoded) {
			return Message.fromEncoded(encoded, options);
		});
	};

	function getMessageSize(msg) {
		var size = 0;
		if(msg.name) {
			size += msg.name.length;
		}
		if(msg.clientId) {
			size += msg.clientId.length;
		}
		if(msg.extras) {
			size += JSON.stringify(msg.extras).length;
		}
		if(msg.data) {
			size += Utils.dataSizeBytes(msg.data);
		}
		return size;
	};

	/* This should be called on encode()d (and encrypt()d) Messages (as it
	 * assumes the data is a string or buffer) */
	Message.getMessagesSize = function(messages) {
		var msg, total = 0;
		for(var i=0; i<messages.length; i++) {
			msg = messages[i];
			total += (msg.size || (msg.size = getMessageSize(msg)))
		}
		return total;
	};

	return Message;
})();
