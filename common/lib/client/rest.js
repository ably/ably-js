var Rest = (function() {
	var noop = function() {};

	function Rest(options) {
		/* normalise options */
		if(!options) {
			var msg = 'no options provided';
			Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
			throw new Error(msg);
		}
		if(typeof(options) == 'string') {
			options = (options.indexOf(':') == -1) ? {token: options} : {key: options};
		}
		this.options = Defaults.normaliseOptions(options);

		/* use binary protocol only if it is supported and explicitly requested */
		if(!BufferUtils.supportsBinary || this.options.useBinaryProtocol !== true)
			this.options.useBinaryProtocol = false;

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
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started');
		this.clientId = options.clientId;

		this.serverTimeOffset = null;
		this.baseUri = this.authority = function(host) { return 'https://' + host + ':' + (options.tlsPort || Defaults.TLS_PORT); };

		this.auth = new Auth(this, options);
		this.channels = new Channels(this);
	}

	Rest.prototype.stats = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var headers = Utils.copy(Utils.defaultGetHeaders()),
			envelope = Http.supportsLinkHeaders ? undefined : 'json';

		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);

		(new PaginatedResource(this, '/stats', headers, params, envelope, function(body, headers, unpacked) {
			var statsValues = (unpacked ? body : JSON.parse(body));
			for(var i = 0; i < statsValues.length; i++) statsValues[i] = Stats.fromValues(statsValues[i]);
			return statsValues;
		})).get(callback);
	};

	Rest.prototype.time = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var headers = Utils.copy(Utils.defaultGetHeaders());
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
			self.serverTimeOffset = (time - Date.now());
			callback(null, time);
		});
	};

	function Channels(rest) {
		this.rest = rest;
		this.attached = {};
	}

	Channels.prototype.get = function(name) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new Channel(this.rest, name);
		}
		return channel;
	};

	return Rest;
})();