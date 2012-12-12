var Rest = (function() {

	function Rest(options) {
		if(typeof(options == 'string')) {
			/* we assume that the string is of the form
			 * <app id>:<key id>:<key value> */
			var parts = options.split(':');
			if(parts.length < 3)
				throw new Error('Realtime(): invalid key');
			options = {
				appId: parts[0],
				key: parts[1] + ':' + parts[2]
			};
		}
		this.options = options = options || {};
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started');
		if(!options.appId)
			throw new Error('Realtime(): no appId provided');
		this.clientId = options.clientId;

		var restHost = options.restHost = (options.restHost || Defaults.REST_HOST);
		var restPort = options.restPort = options.tlsPort || (options.encrypted && options.port) || Defaults.WSS_PORT;
		var authority = this.authority = 'https://' + restHost + ':' + restPort;
		this.baseUri = authority + '/apps/' + this.options.appId;

		var format = options.format == 'json';
		var headers = Utils.defaultHeaders[format];
		if(options.headers)
			headers = Utils.mixin(Utils.copy(options.headers), this.headers);
		this.headers = headers;

		this.auth = new Auth(this, options);
		this.channels = new Channels(this);
		this.events = new Resource(this, '/events');
		this.stats = new Resource(this, '/stats');
	}

	Rest.prototype.time = function(callback) {
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