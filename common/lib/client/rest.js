var Rest = (function() {

	function Rest(options) {
		/* normalise options */
		if(!options) {
			var msg = 'no options provided';
			Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
			throw new Error(msg);
		}
		if(typeof(options) == 'string')
			options = {key: options};
		if(options.key) {
			var keyParts = options.key.split(':');
			if(keyParts.length != 3) {
				var msg = 'invalid key parameter';
				Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
				throw new Error(msg);
			}
			options.appId = keyParts[0];
			options.keyId = keyParts[1];
			options.keyValue = keyParts[2];
		}
		if(!options.appId) {
			var msg = 'no appId provided';
			Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
			throw new Error(msg);
		}
		this.options = options;

		/* process options */
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started');
		this.clientId = options.clientId;

		if((typeof(window) == 'object') && (window.location.protocol == 'https:') && !('encrypted' in options))
			options.encrypted = true;
		var restHost = options.restHost = (options.restHost || Defaults.REST_HOST);
		var restPort = options.restPort = options.tlsPort || (options.encrypted && options.port) || Defaults.WSS_PORT;
		var authority = this.authority = 'https://' + restHost + ':' + restPort;
		this.baseUri = authority + '/apps/' + this.options.appId;

		/* FIXME: temporarily force use of json and not thrift */
		options.useTextProtocol = true;

		this.auth = new Auth(this, options);
		this.channels = new Channels(this);
	}

	Rest.prototype.stats = function(params, callback) {
		var headers = Utils.copy(Utils.defaultGetHeaders(!this.options.useTextProtocol));
		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);
		Resource.get(this, '/stats', headers, params, callback);
	};

	Rest.prototype.time = function(callback) {
		var headers = Utils.copy(Utils.defaultGetHeaders());
		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);
		Http.get(this.authority + '/time', headers, null, function(err, res) {
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