var FlashTransport = (function() {
	var isBrowser = (typeof(window) == 'object');

	/* public constructor */
	function FlashTransport(connectionManager, auth, options) {
		options.useTextProtocol = true;
		WebSocketTransport.call(this, connectionManager, auth, options);
	}
	Utils.inherits(FlashTransport, WebSocketTransport);

	FlashTransport.isAvailable = function() {
		return isBrowser && swfobject && swfobject.getFlashPlayerVersion().major >= 10 && FlashWebSocket;
	};

	if(FlashTransport.isAvailable())
		ConnectionManager.availableTransports.flash_socket = FlashTransport;

	FlashTransport.tryConnect = function(connectionManager, auth, options, callback) {
		/* load the swf if not already loaded */
		FlashWebSocket.__initialize();
		var transport = new FlashTransport(connectionManager, auth, options);
		errorCb = function(err) { callback(err); };
		transport.on('wserror', errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'FlashTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('wsopen', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	FlashTransport.prototype.createWebSocket = function(uri, params) {
		var paramCount = 0;
		if(params) {
			for(var key in params)
				uri += (paramCount++ ? '&' : '?') + key + '=' + params[key];
		}
		this.uri = uri;
		return new FlashWebSocket(uri, [], this.options.proxyHost, this.options.proxyPort);
	};

	FlashTransport.prototype.toString = function() {
		return 'FlashTransport; uri=' + this.uri;
	};

	return FlashTransport;
})();
