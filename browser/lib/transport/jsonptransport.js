var JSONPTransport = (function() {
	var noop = function() {};
	var _ = window.Ably._ = function(id) { return _[id] || noop; };
	var requestId = 1;

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.binary = false;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.httpTransports.jsonp = ConnectionManager.transports.jsonp = JSONPTransport;

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
		(new JSONPTransport.Request(0)).send('http://internet-up.ably.io.s3-website-us-east-1.amazonaws.com/is-the-internet-up.js', null, null, null, false, false, function(err, response) {
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
		return 'JSONPTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	JSONPTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		var req = new JSONPTransport.Request()
		req.send(uri, params, null, body, expectToBlock, false, callback);
		return req;
	};

	JSONPTransport.Request = function(id) {
		this.requestId = id || requestId++;
	};

	JSONPTransport.Request.prototype.send = function(uri, params, headers /* ignored */, body, expectToBlock, binary /* ignored */, callback) {
		this.callback = callback;
		var id = this.requestId;

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = this.timer = setTimeout(function() { self.abort(); }, timeout);

		params = params || {};
		params.callback = 'Ably._(' + id + ')';
		if(body)
			params.body = encodeURIComponent(body);
		else
			delete params.body;

		var script = document.createElement('script');
		script.async = true;
		script.onerror = function(e) {  self.abort(); };
		script.src = CometTransport.paramStr(params, uri);

		var self = this;
		var _finish = this._finish = function() {
			clearTimeout(timer);
			if(script.parentNode) script.parentNode.removeChild(script);
			delete _[id];
		}

		_[id] = function(message) {
			_finish();
			if(!self.aborted)
				callback(null, message);
		};

		var insertAt = document.getElementsByTagName('script')[0];
	    insertAt.parentNode.insertBefore(script, insertAt);
	};

	JSONPTransport.Request.prototype.abort = function() {
		/* No abort possible, but flag this request
		 * so no action occurs if it does complete */
		this.aborted = true;
 		this._finish();
		this.callback(new Error('JSONPTransport: requestId ' + this.requestId + ' aborted'));
	};

	Http.Request = function(uri, params, headers, body, binary, callback) {
		(new JSONPTransport.Request()).send(uri, params, headers, body, false, binary, callback);
	};

	return JSONPTransport;
})();
