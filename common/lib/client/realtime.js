var Realtime = this.Realtime = (function() {

	function Realtime(options) {
		/* normalise options */
		if(!options) {
			var msg = 'no options provided';
			Logger.logAction(Logger.LOG_ERROR, 'Realtime()', msg);
			throw new Error(msg);
		}
		if(typeof(options) == 'string')
			options = {key: options};
		if(options.key) {
			var keyParts = options.key.split(':');
			if(keyParts.length != 3) {
				var msg = 'invalid key parameter';
				Logger.logAction(Logger.LOG_ERROR, 'Realtime()', msg);
				throw new Error(msg);
			}
			options.appId = keyParts[0];
			options.keyId = keyParts[1];
			options.keyValue = keyParts[2];
		}
		if(!options.appId) {
			var msg = 'no appId provided';
			Logger.logAction(Logger.LOG_ERROR, 'Realtime()', msg);
			throw new Error(msg);
		}
		this.options = options;

		/* process options */
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Realtime()', 'started');
		this.clientId = options.clientId;

		if((typeof(window) == 'object') && (window.location.protocol == 'https:') && !('encrypted' in options))
			options.encrypted = true;
		var restHost = options.restHost = (options.restHost || Defaults.REST_HOST);
		var restPort = options.restPort = options.tlsPort || (options.encrypted && options.port) || Defaults.WSS_PORT;
		var authority = this.authority = 'https://' + restHost + ':' + restPort;
		this.baseUri = authority + '/apps/' + this.options.appId;

		var wsHost = options.wsHost = (options.wsHost || Defaults.WS_HOST);
		var wsPort = options.wsPort = options.encrypted ? restPort : (options.wsPort || Defaults.WS_PORT);

		var format = options.format == 'json';
		var headers = Utils.defaultHeaders[format];
		if(options.headers)
			headers = Utils.mixin(Utils.copy(options.headers), this.headers);
		this.headers = headers;

		this.auth = new Auth(this, options);
		this.connection = new Connection(this, options);
		this.channels = new Channels(this);

		this.connection.connect();
	}

	Realtime.prototype.history = function(params, callback) {
		Resource.get(this, '/events', params, callback);
	};

	Realtime.prototype.stats = function(params, callback) {
		Resource.get(this, '/stats', params, callback);
	};

	Realtime.prototype.close = function() {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
		this.connection.connectionManager.requestState({state: 'closed'});
	};

	Realtime.prototype.time = function(callback) {
		Http.get(this.authority + '/time', null, null, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			var time = res[0];
			if(!time) {
				err = new Error('Internal error (unexpected result type from GET /time');
				err.statusCode = 500;
				callback(err);
				return;
			}
			callback(null, time);
		});
	};

	function Channels(realtime) {
		this.realtime = realtime;
		this.attached = {};
	}

	Channels.prototype.get = function(name, options) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new RealtimeChannel(this.realtime, name, (options || {}));
		}
		return channel;
	};

	return Realtime;
})();
