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
		this._waitingOptions = [];
		this.setOptions(channelOptions);
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.setOptions = function(options, callback) {
		this._optionsSet = false;
		var callerCallback = callback || noop;

		// Perform actions waiting on setOptions to finish.
		callback = function() {
			this._optionsSet = true;
			for (var i = 0; i < this._waitingOptions.length; i++) {
				this._waitingOptions[i]();
			}
			this._waitingOptions = [];
			callerCallback.apply(this, arguments);
		}.bind(this);

		this.channelOptions = options = options || {};
		if(options.cipher) {
			if(!Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
			Crypto.getCipher(options.cipher, function(err, cipherResult) {
				if (err) {
					callback(err);
					return;
				}
				options.cipher = cipherResult.cipherParams;
				options.channelCipher = cipherResult.cipher;
				callback(null);
			});
			return;
		} else if('cipher' in options) {
			/* Don't deactivate an existing cipher unless options
			 * has a 'cipher' key that's falsey */
			options.cipher = null;
			options.channelCipher = null;
		}
		callback(null);
	};

	Channel.prototype._afterOptionsSet = function(callback) {
		if (this._optionsSet) {
			callback();
		} else {
			this._waitingOptions.push(callback);
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

		this._afterOptionsSet(function() {
			var options = this.channelOptions;
			(new PaginatedResource(rest, this.basePath + '/messages', headers, envelope, function(body, headers, unpacked) {
				return Message.fromResponseBody(body, options, !unpacked && format, channel);
			})).get(params, callback);
		}.bind(this));
	};

	Channel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1];

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

		this._afterOptionsSet(function() {
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
				this._publish(requestBody, headers, callback);
			}.bind(this));
		}.bind(this));
	};

	Channel.prototype._publish = function(requestBody, headers, callback) {
		Resource.post(this.rest, this.basePath + '/messages', requestBody, headers, null, false, callback);
	};

	return Channel;
})();
