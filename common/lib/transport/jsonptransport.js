var JSONPTransport = (function() {

	/* public constructor */
	function JSONPTransport(connectionManager, auth, options) {
		options.useTextProtocol = true;
		CometTransport.call(this, connectionManager, auth, options);
		Ably._ = {};
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.availableTransports.jsonp = JSONPTransport;

	JSONPTransport.tryConnect = function(connectionManager, auth, options, callback) {
		var transport = new JSONPTransport(connectionManager, auth, options);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'JSONPTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	JSONPTransport.prototype.toString = function() {
		return 'JSONPTransport; uri=' + uri + '; state=' + this.state;
	};

	JSONPTransport.prototype.toString = function() {
		return 'JSONPTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	JSONPTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		return new JSONPTransport.Request(uri, params, body, expectToBlock, callback);
	};

	var requestId = 0;
	JSONPTransport.Request = function(uri, params, body, expectToBlock, callback) {
		var _ = Ably._;
		this.callback = callback;
		var thisId = this.requestId = requestId++;

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = this.timer = setTimeout(timeout, function() { self.abort(); });

		params.callback = 'Ably._._' + thisId;
		if(body)
			params.body = encodeUriComponent(body);
		else
			delete params.body;

		var script = document.createElement('script');
		script.async = true;
		script.onerror = function() { self.abort(); };
		script.src = CometTransport.paramStr(params, uri);

		var self = this;
		Ably._['_' + thisId] = function(message) {
			clearTimeout(timer);
			delete _['_' + thisId];
			if(self.aborted)
				return;
			script.parentNode.removeChild(script);
			callback(null, message);
		};

		var insertAt = document.getElementsByTagName('script')[0];
	    insertAt.parentNode.insertBefore(script, insertAt);
	    this.script = script;
	};

	JSONPTransport.Request.prototype.abort = function() {
		/* No abort possible, but flag this request
		 * so no action occurs if it does complete */
		clearTimeout(this.timer);
		this.aborted = true;
		delete Ably._['_' + this.requestId];
		this.callback(new Error('JSONPTransport: requestId ' + this.requestId + ' aborted'));
	};

	return JSONPTransport;
})();
