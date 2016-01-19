var JSONPTransport = (function() {
	var noop = function() {};
	var _ = window.Ably._ = function(id) { return _[id] || noop; };
	var idCounter = 1;
	var head = document.getElementsByTagName('head')[0];

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.stream = false;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.httpTransports['jsonp'] = ConnectionManager.transports['jsonp'] = JSONPTransport;

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

		var req = new Request('_isTheInternetUp', upUrl, null, null, null, CometTransport.REQ_SEND, Defaults.TIMEOUTS);
		req.once('complete', function(err, response) {
			var result = !err && response;
			Logger.logAction(Logger.LOG_MICRO, 'JSONPTransport.checkConnectivity()', 'Result: ' + result);
			for(var i = 0; i < checksInProgress.length; i++) checksInProgress[i](null, result);
			checksInProgress = null;
		});
		Utils.nextTick(function() {
			req.exec();
		})
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

		params.callback = 'Ably._(' + id + ')';
		params.envelope = 'jsonp';
		if(body)
			params.body = body;
		else
			delete params.body;

		var script = this.script = document.createElement('script');
		script.src = uri + Utils.toQueryString(params);
		script.async = true;
		script.type = 'text/javascript';
		script.charset = 'UTF-8';
		script.onerror = function(err) {
			err.code = 80000;
			self.complete(err);
		};

		_[id] = function(message) {
			if(message.statusCode) {
				/* Handle as enveloped jsonp, as all jsonp transport uses should be */
				var response = message.response;
				if(!response) {
					self.complete(new ErrorInfo('Invalid server response: no envelope detected', 50000, 500));
				} else if(message.statusCode < 400) {
					self.complete(null, response, message.headers);
				} else {
					var err = response.error || new ErrorInfo('Error response received from server', 50000, message.statusCode);
					self.complete(err);
				}
			} else {
				/* Handle as non-enveloped -- as will be eg from a customer's authUrl server */
				self.complete(null, message)
			}
		};

		var timeout = (this.requestMode == CometTransport.REQ_SEND) ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout;
		this.timer = setTimeout(function() { self.abort(); }, timeout);
		head.insertBefore(script, head.firstChild);
	};

	Request.prototype.complete = function(err, body, headers) {
		headers = headers || {};
		if(!this.requestComplete) {
			this.requestComplete = true;
			var contentType;
			if(body) {
				contentType = (typeof(body) == 'string') ? 'text/plain' : 'application/json';
				headers['content-type'] = contentType;
				this.emit('data', body);
			}

			this.emit('complete', err, body, headers, /* unpacked: */ true);
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
		})
		return req;
	};

	return JSONPTransport;
})();
