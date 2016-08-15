var JSONPTransport = (function() {
	var noop = function() {};
	var _ = window.Ably._ = {};
	/* express strips out parantheses from the callback!
	 * Kludge to still alow its responses to work, while not keeping the
	 * function form for normal use and not cluttering window.Ably
	 * https://github.com/strongloop/express/blob/master/lib/response.js#L305
	 */
	_._ = function(id) { return _['_' + id] || noop; };
	var idCounter = 1;
	var isSupported = (typeof(document) !== 'undefined');
	var head = isSupported ? document.getElementsByTagName('head')[0] : null;
	var shortName = 'jsonp';

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.stream = false;
		CometTransport.call(this, connectionManager, auth, params);
		this.shortName = shortName;
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return isSupported; };
	if(isSupported) {
		ConnectionManager.supportedTransports[shortName] = JSONPTransport;
	}

	/* connectivity check; since this has a hard-coded callback id,
	 * we just make sure that we handle concurrent requests (but the
	 * connectionmanager should ensure this doesn't happen anyway */
	var checksInProgress = null;
	JSONPTransport.checkConnectivity = function(callback) {
		var upUrl = Defaults.internetUpUrlWithoutExtension + '.js';

		if(checksInProgress) {
			checksInProgress.push(callback);
			return;
		}
		checksInProgress = [callback];
		Logger.logAction(Logger.LOG_MICRO, 'JSONPTransport.checkConnectivity()', 'Sending; ' + upUrl);

		var req = new Request('isTheInternetUp', upUrl, null, null, null, CometTransport.REQ_SEND, Defaults.TIMEOUTS);
		req.once('complete', function(err, response) {
			var result = !err && response;
			Logger.logAction(Logger.LOG_MICRO, 'JSONPTransport.checkConnectivity()', 'Result: ' + result);
			for(var i = 0; i < checksInProgress.length; i++) checksInProgress[i](null, result);
			checksInProgress = null;
		});
		Utils.nextTick(function() {
			req.exec();
		});
	};

	JSONPTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new JSONPTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback({event: this.event, error: err}); };
		transport.on(['failed', 'disconnected'], errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'JSONPTransport.tryConnect()', 'viable transport ' + transport);
			transport.off(['failed', 'disconnected'], errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	JSONPTransport.prototype.toString = function() {
		return 'JSONPTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	var createRequest = JSONPTransport.prototype.createRequest = function(uri, headers, params, body, requestMode) {
		/* JSONP requests are used outside the context of a realtime transport, in which case use the default timeouts */
		var timeouts = (this && this.timeouts) || Defaults.TIMEOUTS;
		return new Request(undefined, uri, headers, Utils.copy(params), body, requestMode, timeouts);
	};

	function Request(id, uri, headers, params, body, requestMode, timeouts) {
		EventEmitter.call(this);
		if(id === undefined) id = idCounter++;
		this.id = id;
		this.uri = uri;
		this.params = params || {};
		this.params.rnd = Utils.randStr();
		if(headers) {
			/* JSONP doesn't allow headers. Cherry-pick a couple to turn into qs params */
			if(headers['X-Ably-Version']) this.params.v = headers['X-Ably-Version'];
			if(headers['X-Ably-Lib']) this.params.lib = headers['X-Ably-Lib'];
		}
		this.body = body;
		this.requestMode = requestMode;
		this.timeouts = timeouts;
		this.requestComplete = false;
	}
	Utils.inherits(Request, EventEmitter);

	Request.prototype.exec = function() {
		var id = this.id,
			body = this.body,
			uri = this.uri,
			params = this.params,
			self = this;

		params.callback = 'Ably._._(' + id + ')';

		params.envelope = 'jsonp';
		if(body)
			params.body = body;

		var script = this.script = document.createElement('script');
		script.src = uri + Utils.toQueryString(params);
		script.async = true;
		script.type = 'text/javascript';
		script.charset = 'UTF-8';
		script.onerror = function(err) {
			self.complete(new ErrorInfo('JSONP script error (event: ' + Utils.inspect(err) + ')', null, 400));
		};

		_['_' + id] = function(message) {
			if(message.statusCode) {
				/* Handle as enveloped jsonp, as all jsonp transport uses should be */
				var response = message.response;
				if(message.statusCode == 204) {
					self.complete(null, null, null, statusCode);
				} else if(!response) {
					self.complete(new ErrorInfo('Invalid server response: no envelope detected', null, 500));
				} else if(message.statusCode < 400 || Utils.isArray(response)) {
					/* If response is an array, it's an array of protocol messages -- even if
					 * it contains an error action (hence the nonsuccess statuscode), we can
					 * consider the request to have succeeded, just pass it on to
					 * onProtocolMessage to decide what to do */
					self.complete(null, response, message.headers, message.statusCode);
				} else {
					var err = response.error || new ErrorInfo('Error response received from server', null, message.statusCode);
					self.complete(err);
				}
			} else {
				/* Handle as non-enveloped -- as will be eg from a customer's authUrl server */
				self.complete(null, message);
			}
		};

		var timeout = (this.requestMode == CometTransport.REQ_SEND) ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout;
		this.timer = setTimeout(function() { self.abort(); }, timeout);
		head.insertBefore(script, head.firstChild);
	};

	Request.prototype.complete = function(err, body, headers, statusCode) {
		headers = headers || {};
		if(!this.requestComplete) {
			this.requestComplete = true;
			var contentType;
			if(body) {
				contentType = (typeof(body) == 'string') ? 'text/plain' : 'application/json';
				headers['content-type'] = contentType;
				this.emit('data', body);
			}

			this.emit('complete', err, body, headers, /* unpacked: */ true, statusCode);
			this.dispose();
		}
	};

	Request.prototype.abort = function() {
		this.dispose();
	};

	Request.prototype.dispose = function() {
		var timer = this.timer;
		if(timer) {
			clearTimeout(timer);
			this.timer = null;
		}
		var script = this.script;
		if(script.parentNode) script.parentNode.removeChild(script);
		delete _[this.id];
		this.emit('disposed');
	};

	Http.Request = function(uri, headers, params, body, callback) {
		var req = createRequest(uri, headers, params, body, CometTransport.REQ_SEND);
		req.once('complete', callback);
		Utils.nextTick(function() {
			req.exec();
		});
		return req;
	};

	return JSONPTransport;
})();
