var JSONPTransport = (function() {

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.binary = false;
		CometTransport.call(this, connectionManager, auth, params);
		Ably._ = {};
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.httpTransports.jsonp = ConnectionManager.transports.jsonp = JSONPTransport;

	JSONPTransport.get = function(options, path, headers, params, callback) {

	};

	/* connectivity check; since this has a hard-coded callback id,
	 * we just make sure that we handle concurrent requests (but the
	 * connectionmanager should ensure this doesn't happen anyway */
	var checksInProgress = null;
	JSONPTransport.checkConnectivity = function(callback) {
		if(checksInProgress) {
			checksInProgress.push(callback);
			return;
		}
		checksInProgress = [callback];
		new JSONPTransport.Request('http://live.cdn.ably-realtime.com/is-the-internet-up.js', null, null, false, 'isTheInternetUp', function(err, response) {
			var result = !err && response;
			for(var i = 0; i < checksInProgress.length; i++) checksInProgress[i](null, result);
			checksInProgress = null;
		});
	};

	JSONPTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new JSONPTransport(connectionManager, auth, params);
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
		return new JSONPTransport.Request(uri, params, body, expectToBlock, null, callback);
	};

	var requestId = 0;
	JSONPTransport.Request = function(uri, params, body, expectToBlock, thisId, callback) {
		var _ = Ably._;
		this.callback = callback;
		if(thisId === null) thisId = this.requestId = requestId++;

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
