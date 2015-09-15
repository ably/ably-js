var Presence = (function() {
	function Presence(channel) {
		this.channel = channel;
		this.basePath = channel.basePath + '/presence';
	}

	Utils.inherits(Presence, EventEmitter);

	Presence.prototype.get = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.get()', 'channel = ' + this.channel.name);
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
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath, headers, envelope, function(body, headers, unpacked) {
			return PresenceMessage.fromResponseBody(body, options, !unpacked && format);
		})).get(params, callback);
	};

	Presence.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.history()', 'channel = ' + this.channel.name);
		this._history(params, callback);
	};

	Presence.prototype._history = function(params, callback) {
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
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options,
			channel = this.channel;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/history', headers, envelope, function(body, headers, unpacked) {
			return PresenceMessage.fromResponseBody(body, options, !unpacked && format, channel);
		})).get(params, callback);
	};

	return Presence;
})();
