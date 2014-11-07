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
		var rest = this.rest,
			envelope = !Http.supportsLinkHeaders,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/messages', headers, params, envelope, function(body, headers, unpacked) {
			return Message.fromResponseBody(body, options, !unpacked && format);
		})).get(callback);
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		callback = callback || noop;
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			msg = Message.fromValues({name:name, data:data}),
			options = this.options;

		var requestBody = Message.toRequestBody([msg], options, format);
		var headers = Utils.copy(Utils.defaultPostHeaders(format));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.post(rest, this.basePath + '/messages', requestBody, headers, null, false, callback);
	};

	function Presence(channel) {
		this.channel = channel;
		this.basePath = channel.basePath + '/presence';
	}

	Presence.prototype.get = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence.get()', 'channel = ' + this.channel.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.channel.rest,
			envelope = !Http.supportsLinkHeaders,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath, headers, params, envelope, function(body, headers, unpacked) {
			return PresenceMessage.fromResponseBody(body, options, !unpacked && format);
		})).get(callback);
	};

	Presence.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence.history()', 'channel = ' + this.channel.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.channel.rest,
			envelope = !Http.supportsLinkHeaders,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/history', headers, params, envelope, function(body, headers, unpacked) {
			return PresenceMessage.fromResponseBody(body, options, !unpacked && format);
		})).get(callback);
	};

	return Channel;
})();
