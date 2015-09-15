var Channel = (function() {
	function noop() {}

	var defaultOptions = {};

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
		this.name = name;
		this.basePath = '/channels/' + encodeURIComponent(name);
		this.presence = new Presence(this);
		this.setOptions(options);
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.setOptions = function(options, callback) {
		callback = callback || noop;
		options = this.options = Utils.prototypicalClone(defaultOptions, options);
		if(options.encrypted) {
			if(!Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
			Crypto.getCipher(options, function(err, cipher) {
				options.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, (options.cipher = null));
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
			options = this.options,
			channel = this;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/messages', headers, envelope, function(body, headers, unpacked) {
			return Message.fromResponseBody(body, options, !unpacked && format, channel);
		})).get(params, callback);
	};

	Channel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1],
			options = this.options;

		if(typeof(callback) !== 'function') {
			callback = noop;
			++argCount;
		}
		if(argCount == 2) {
			if(!Utils.isArray(messages))
				messages = [messages];
			messages = Message.fromValuesArray(messages);
		} else {
			messages = [Message.fromValues({name: arguments[0], data: arguments[1]})];
		}

		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			requestBody = Message.toRequestBody(messages, this.options, format),
			headers = Utils.copy(Utils.defaultPostHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Resource.post(rest, this.basePath + '/messages', requestBody, headers, null, false, callback);
	};

	return Channel;
})();
