var Channel = (function() {
	function noop() {}
	var MSG_ID_ENTROPY_BYTES = 9;

	/* public constructor */
	function Channel(rest, name, channelOptions) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
		this.name = name;
		this.basePath = '/channels/' + encodeURIComponent(name);
		this.presence = new Presence(this);
		this.setOptions(channelOptions);
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.setOptions = function(options) {
		this.channelOptions = options = options || {};
		if(options.cipher) {
			if(!Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
			var cipher = Crypto.getCipher(options.cipher);
			options.cipher = cipher.cipherParams;
			options.channelCipher = cipher.cipher;
		} else if('cipher' in options) {
			/* Don't deactivate an existing cipher unless options
			 * has a 'cipher' key that's falsey */
			options.cipher = null;
			options.channelCipher = null;
		}
	};

	Channel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				if(this.rest.options.promises) {
					return Utils.promisify(this, 'history', arguments);
				}
				callback = noop;
			}
		}

		this._history(params, callback);
	};

	Channel.prototype._history = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.defaultGetHeaders(format),
			channel = this;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		var options = this.channelOptions;
		(new PaginatedResource(rest, this.basePath + '/messages', headers, envelope, function(body, headers, unpacked) {
			return Message.fromResponseBody(body, options, !unpacked && format);
		})).get(params, callback);
	};

	function allEmptyIds(messages) {
		return Utils.arrEvery(messages, function(message) {
			return !message.id;
		});
	}

	Channel.prototype.publish = function() {
		var argCount = arguments.length,
			first = arguments[0],
			second = arguments[1],
			callback = arguments[argCount - 1],
			messages,
			params,
			self = this;

		if(typeof(callback) !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'publish', arguments);
			}
			callback = noop;
		}

		if(typeof first === 'string' || first === null) {
			/* (name, data, ...) */
			messages = [Message.fromValues({name: first, data: second})];
			params = arguments[2];
		} else if(Utils.isObject(first)) {
			messages = [Message.fromValues(first)];
			params = arguments[1];
		} else if(Utils.isArray(first)) {
			messages = Message.fromValuesArray(first);
			params = arguments[1];
		} else {
			throw new ErrorInfo('The single-argument form of publish() expects a message object or an array of message objects', 40013, 400);
		}

		if(typeof params !== 'object' || !params) {
			/* No params supplied (so after-message argument is just the callback or undefined) */
			params = {};
		}

		var rest = this.rest,
			options = rest.options,
			format = options.useBinaryProtocol ? 'msgpack' : 'json',
			idempotentRestPublishing = rest.options.idempotentRestPublishing,
			headers = Utils.defaultPostHeaders(format);

		if(options.headers)
			Utils.mixin(headers, options.headers);

		if(idempotentRestPublishing && allEmptyIds(messages)) {
			var msgIdBase = Utils.randomString(MSG_ID_ENTROPY_BYTES);
			Utils.arrForEach(messages, function(message, index) {
				message.id = msgIdBase + ':' + index.toString();
			});
		}

		Message.encodeArray(messages, this.channelOptions, function(err) {
			if(err) {
				callback(err);
				return;
			}

			/* RSL1i */
			var size = Message.getMessagesSize(messages),
				maxMessageSize = options.maxMessageSize;
			if(size > maxMessageSize) {
				callback(new ErrorInfo('Maximum size of messages that can be published at once exceeded ( was ' + size + ' bytes; limit is ' + maxMessageSize + ' bytes)', 40009, 400));
				return;
			}

			self._publish(Message.serialize(messages, format), headers, params, callback);
		});
	};

	Channel.prototype._publish = function(requestBody, headers, params, callback) {
		Resource.post(this.rest, this.basePath + '/messages', requestBody, headers, params, false, callback);
	};

	return Channel;
})();
