var XHRPollingTransport = (function() {
	var shortName = 'xhr_polling';

	function XHRPollingTransport(connectionManager, auth, params) {
		params.stream = false;
		CometTransport.call(this, connectionManager, auth, params);
		this.shortName = shortName;
	}
	Utils.inherits(XHRPollingTransport, CometTransport);

	XHRPollingTransport.isAvailable = function() {
		return Platform.xhrSupported && Platform.allowComet;
	};

	XHRPollingTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new XHRPollingTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback({event: this.event, error: err}); };
		transport.on(['failed', 'disconnected'], errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'XHRPollingTransport.tryConnect()', 'viable transport ' + transport);
			transport.off(['failed', 'disconnected'], errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	XHRPollingTransport.prototype.toString = function() {
		return 'XHRPollingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRPollingTransport.prototype.createRequest = function(uri, headers, params, body, requestMode) {
		return XHRRequest.createRequest(uri, headers, params, body, requestMode, this.timeouts);
	};

	if(typeof(ConnectionManager) !== 'undefined' && XHRPollingTransport.isAvailable()) {
		ConnectionManager.supportedTransports[shortName] = XHRPollingTransport;
	}

	return XHRPollingTransport;
})();
