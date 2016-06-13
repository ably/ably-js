var XHRStreamingTransport = (function() {
	var shortName = 'xhr_streaming';

	/* public constructor */
	function XHRStreamingTransport(connectionManager, auth, params) {
		CometTransport.call(this, connectionManager, auth, params);
		this.shortName = shortName;
	}
	Utils.inherits(XHRStreamingTransport, CometTransport);

	XHRStreamingTransport.isAvailable = XHRRequest.isAvailable;

	XHRStreamingTransport.checkConnectivity = function(callback) {
		var upUrl = Defaults.internetUpUrlWithoutExtension + '.txt';
		Logger.logAction(Logger.LOG_MICRO, 'XHRStreamingTransport.checkConnectivity()', 'Sending; ' + upUrl);
		Http.Request(upUrl, null, null, null, function(err, responseText) {
			var result = (!err && responseText.replace(/\n/, '') == 'yes');
			Logger.logAction(Logger.LOG_MICRO, 'XHRStreamingTransport.checkConnectivity()', 'Result: ' + result);
			callback(null, result);
		});
	};

	XHRStreamingTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new XHRStreamingTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'XHRStreamingTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	XHRStreamingTransport.prototype.toString = function() {
		return 'XHRStreamingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRStreamingTransport.prototype.createRequest = XHRRequest.createRequest;

	if(typeof(ConnectionManager) !== 'undefined' && XHRStreamingTransport.isAvailable()) {
		ConnectionManager.supportedTransports[shortName] = XHRStreamingTransport;
	}

	return XHRStreamingTransport;
})();
