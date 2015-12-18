var XHRTransport = (function() {

	/* public constructor */
	function XHRTransport(connectionManager, auth, params) {
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(XHRTransport, CometTransport);

	XHRTransport.isAvailable = XHRRequest.isAvailable;

	XHRTransport.checkConnectivity = function(callback) {
		var upUrl = Defaults.internetUpUrlWithoutExtension + '.txt';
		Logger.logAction(Logger.LOG_MICRO, 'XHRTransport.checkConnectivity()', 'Sending; ' + upUrl);
		Http.Request(upUrl, null, null, null, function(err, responseText) {
			var result = (!err && responseText.replace(/\n/, '') == 'yes');
			Logger.logAction(Logger.LOG_MICRO, 'XHRTransport.checkConnectivity()', 'Result: ' + result);
			callback(null, result);
		});
	};

	XHRTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new XHRTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'XHRTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	XHRTransport.prototype.toString = function() {
		return 'XHRTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRTransport.prototype.createRequest = XHRRequest.createRequest;

	if(typeof(ConnectionManager) !== 'undefined' && XHRTransport.isAvailable()) {
		ConnectionManager.httpTransports['xhr'] = ConnectionManager.transports['xhr'] = XHRTransport;
	}

	return XHRTransport;
})();
