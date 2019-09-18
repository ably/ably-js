var Rest = (function() {
	var noop = function() {};
	var msgpack = Platform.msgpack;

	function Rest(options) {
		if(!(this instanceof Rest)){
			return new Rest(options);
		}

		/* normalise options */
		if(!options) {
			var msg = 'no options provided';
			Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
			throw new Error(msg);
		}
		options = Defaults.objectifyOptions(options);

		if(options.log) {
			Logger.setLog(options.log.level, options.log.handler);
		}
		Logger.logAction(Logger.LOG_MICRO, 'Rest()', 'initialized with clientOptions ' + Utils.inspect(options));

		this.options = Defaults.normaliseOptions(options);

		/* process options */
		if(options.key) {
			var keyMatch = options.key.match(/^([^:\s]+):([^:.\s]+)$/);
			if(!keyMatch) {
				var msg = 'invalid key parameter';
				Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
				throw new Error(msg);
			}
			options.keyName = keyMatch[1];
			options.keySecret = keyMatch[2];
		}

		if('clientId' in options) {
			if(!(typeof(options.clientId) === 'string' || options.clientId === null))
				throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
			else if(options.clientId === '*')
				throw new ErrorInfo('Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, use {defaultTokenParams: {clientId: "*"}})', 40012, 400);
		}

		Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started; version = ' + Defaults.libstring);

		this.baseUri = this.authority = function(host) { return Defaults.getHttpScheme(options) + host + ':' + Defaults.getPort(options, false); };
		this._currentFallback = null;

		this.serverTimeOffset = null;
		this.auth = new Auth(this, options);
		this.channels = new Channels(this);
		this.push = new Push(this);
	}

	Rest.prototype.stats = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				if(this.options.promises) {
					return Utils.promisify(this, 'stats', arguments);
				}
				callback = noop;
			}
		}
		var headers = Utils.defaultGetHeaders(),
			format = this.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format;

		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);

		(new PaginatedResource(this, '/stats', headers, envelope, function(body, headers, unpacked) {
			var statsValues = (unpacked ? body : JSON.parse(body));
			for(var i = 0; i < statsValues.length; i++) statsValues[i] = Stats.fromValues(statsValues[i]);
			return statsValues;
		})).get(params, callback);
	};

	Rest.prototype.time = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				if(this.options.promises) {
					return Utils.promisify(this, 'time', arguments);
				}
				callback = noop;
			}
		}
		var headers = Utils.defaultGetHeaders();
		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);
		var self = this;
		var timeUri = function(host) { return self.authority(host) + '/time' };
		Http.get(this, timeUri, headers, params, function(err, res, headers, unpacked) {
			if(err) {
				callback(err);
				return;
			}
			if(!unpacked) res = JSON.parse(res);
			var time = res[0];
			if(!time) {
				err = new Error('Internal error (unexpected result type from GET /time)');
				err.statusCode = 500;
				callback(err);
				return;
			}
			/* calculate time offset only once for this device by adding to the prototype */
			self.serverTimeOffset = (time - Utils.now());
			callback(null, time);
		});
	};

	Rest.prototype.request = function(method, path, params, body, customHeaders, callback) {
		var useBinary = this.options.useBinaryProtocol,
			encoder = useBinary ? msgpack.encode: JSON.stringify,
			decoder = useBinary ? msgpack.decode : JSON.parse,
			format = useBinary ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format;
		params = params || {};
		method = method.toLowerCase();
		var headers = method == 'get' ? Utils.defaultGetHeaders(format) : Utils.defaultPostHeaders(format);

		if(callback === undefined) {
			if(this.options.promises) {
				return Utils.promisify(this, 'request', [method, path, params, body, customHeaders]);
			}
			callback = noop;
		}

		if(typeof body !== 'string') {
			body = encoder(body);
		}
		if(this.options.headers) {
			Utils.mixin(headers, this.options.headers);
		}
		if(customHeaders) {
			Utils.mixin(headers, customHeaders);
		}
		var paginatedResource = new PaginatedResource(this, path, headers, envelope, function(resbody, headers, unpacked) {
			return Utils.ensureArray(unpacked ? resbody : decoder(resbody));
		}, /* useHttpPaginatedResponse: */ true);

		if(!Utils.arrIn(Http.methods, method)) {
			throw new ErrorInfo('Unsupported method ' + method, 40500, 405);
		}

		if(Utils.arrIn(Http.methodsWithBody, method)) {
			paginatedResource[method](params, body, callback);
		} else {
			paginatedResource[method](params, callback);
		}
	};

	Rest.prototype.setLog = function(logOptions) {
		Logger.setLog(logOptions.level, logOptions.handler);
	};

	function Channels(rest) {
		this.rest = rest;
		this.attached = {};
	}

	Channels.prototype.get = function(name, channelOptions) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new Channel(this.rest, name, channelOptions);
		} else if(channelOptions) {
			channel.setOptions(channelOptions);
		}

		return channel;
	};

	Channels.prototype.release = function(name) {
		delete this.attached[String(name)];
	};

	return Rest;
})();

Rest.Promise = function(options) {
	options = Defaults.objectifyOptions(options);
	options.promises = true;
	return new Rest(options);
};

Rest.Callbacks = Rest;
