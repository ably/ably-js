var Channel = (function() {
	function noop() {}

	/* public constructor */
	function Channel(rest, name, channelOptions) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
		this.name = name;
		this.basePath = '/channels/' + encodeURIComponent(name);
		this.presence = new Presence(this);
		this.push = new PushChannel(this);
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
				callback = noop;
			}
		}

		this._history(params, callback);
	};

	Channel.prototype._history = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			channel = this;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		var options = this.channelOptions;
		(new PaginatedResource(rest, this.basePath + '/messages', headers, envelope, function(body, headers, unpacked) {
			return Message.fromResponseBody(body, options, !unpacked && format);
		})).get(params, callback);
	};

	Channel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1],
			self = this;

		if(typeof(callback) !== 'function') {
			callback = noop;
			++argCount;
		}
		if(argCount == 2) {
			if(Utils.isObject(messages))
				messages = [Message.fromValues(messages)];
			else if(Utils.isArray(messages))
				messages = Message.fromValuesArray(messages);
			else
				throw new ErrorInfo('The single-argument form of publish() expects a message object or an array of message objects', 40013, 400);
		} else {
			messages = [Message.fromValues({name: arguments[0], data: arguments[1]})];
		}

		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultPostHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Message.toRequestBody(messages, this.channelOptions, format, function(err, requestBody) {
			if (err) {
				callback(err);
				return;
			}
			self._publish(requestBody, headers, callback);
		});
	};

	Channel.prototype._publish = function(requestBody, headers, callback) {
		Resource.post(this.rest, this.basePath + '/messages', requestBody, headers, null, false, callback);
	};

	return Channel;
})();
