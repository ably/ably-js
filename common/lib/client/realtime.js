var Realtime = this.Realtime = (function() {

	function Realtime(options) {
		this.options = options = options || {};
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Realtime()', 'started');
		var realtime = this;
		if(!options.appId)
			throw new Error('Realtime(): no appId provided');
		this.clientId = options.clientId;

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
		this.events = new Resource(this, '/events');
		this.stats = new Resource(this, '/stats');

		this.connection.connectionManager.start();
	}

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
		var attached = this.attached = {};
		var connectionManager = realtime.connection.connectionManager;
    	connectionManager.on(function(newState, transport) {
    		Logger.logAction(Logger.LOG_MICRO, 'Channels on connection state', 'newState = ' + newState.current);
    		switch(newState.current) {
    		case 'connected':
    			Logger.logAction(Logger.LOG_MINOR, 'Channels on connection state', 'connected; transport = ' + transport);
    			transport.on('channelmessage', function(msg) {
    				var channelName = msg.channel;
    				if(!channelName) {
    					Logger.logAction(Logger.LOG_ERROR, 'Channels', 'connected: received event unspecified channel: ' + channelName);
    					return;
    				}
    				var channel = attached[channelName];
    				if(!channel) {
    					Logger.logAction(Logger.LOG_ERROR, 'Channels', 'connected: received event for non-existent channel: ' + channelName);
    					return;
    				}
    				channel.onMessage(msg);
    			});
    			break;
    		case 'suspended':
    		case 'closed':
    		case 'failed':
            	var connectionState = connectionManager.state;
        		for(var channelName in attached)
    				attached[channelName].setSuspended(connectionState);
        		break;
    		default:
    		}
    	});
	}

	Channels.prototype.get = function(name, options) {
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new RealtimeChannel(this.realtime, name, (options || {}));
		}
		return channel;
	};

	return Realtime;
})();
