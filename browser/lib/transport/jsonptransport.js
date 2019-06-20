var JSONPTransport = (function() {
	var noop = function() {};
	/* Can't just use window.Ably, as that won't exist if using the commonjs version. */
	var _ = global._ablyjs_jsonp = {};

	/* express strips out parantheses from the callback!
	 * Kludge to still alow its responses to work, while not keeping the
	 * function form for normal use and not cluttering window.Ably
	 * https://github.com/strongloop/express/blob/master/lib/response.js#L305
	 */
	_._ = function(id) { return _['_' + id] || noop; };
	var idCounter = 1;
	var head = null;
	var shortName = 'jsonp';

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.stream = false;
		CometTransport.call(this, connectionManager, auth, params);
		this.shortName = shortName;
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() {
		return Platform.jsonpSupported && Platform.allowComet;
	};
	if(JSONPTransport.isAvailable()) {
		ConnectionManager.supportedTransports[shortName] = JSONPTransport;
	}
	if(Platform.jsonpSupported) {
		head = document.getElementsByTagName('head')[0];
	}

	/* connectivity check; since this has a hard-coded callback id,
	 * we just make sure that we handle concurrent requests (but the
	 * connectionmanager should ensure this doesn't happen anyway */
	var checksInProgress = null;
	global.JSONPTransport = JSONPTransport

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

	var createRequest = JSONPTransport.prototype.createRequest = function(uri, headers, params, body, requestMode, timeouts, method) {
		/* JSONP requests are used either with the context being a realtime
		 * transport, or with timeouts passed in (for when used by a rest client),
		 * or completely standalone.  Use the appropriate timeouts in each case */
		timeouts = (this && this.timeouts) || timeouts || Defaults.TIMEOUTS;
		return new Request(undefined, uri, headers, Utils.copy(params), body, requestMode, timeouts, method);
	};

	function Request(id, uri, headers, params, body, requestMode, timeouts, method) {
		EventEmitter.call(this);
		if(id === undefined) id = idCounter++;
		this.id = id;
		this.uri = uri;
		this.params = params || {};
		this.params.rnd = Utils.cheapRandStr();
		if(headers) {
			/* JSONP doesn't allow headers. Cherry-pick a couple to turn into qs params */
			if(headers['X-Ably-Version']) this.params.v = headers['X-Ably-Version'];
			if(headers['X-Ably-Lib']) this.params.lib = headers['X-Ably-Lib'];
		}
		this.body = body;
		this.method = method;
		this.requestMode = requestMode;
		this.timeouts = timeouts;
		this.requestComplete = false;
	}
	Utils.inherits(Request, EventEmitter);

	Request.prototype.exec = function() {
		var id = this.id,
			body = this.body,
			method = this.method,
			uri = this.uri,
			params = this.params,
			self = this;

		params.callback = '_ablyjs_jsonp._(' + id + ')';

		params.envelope = 'jsonp';
		if(body) {
			params.body = body;
		}
		if(method && method !== 'get') {
			params.method = method;
		}

		var script = this.script = document.createElement('script');
		var src = uri + Utils.toQueryString(params);
		script.src = src;
		if(script.src.split('/').slice(-1)[0] !== src.split('/').slice(-1)[0]) {
			/* The src has been truncated. Can't abort, but can at least emit an
			 * error so the user knows what's gone wrong. (Can't compare strings
			 * directly as src may have a port, script.src won't) */
			Logger.logAction(Logger.LOG_ERROR, 'JSONP Request.exec()', 'Warning: the browser appears to have truncated the script URI. This will likely result in the request failing due to an unparseable body param');
		}
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
					self.complete(null, null, null, message.statusCode);
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

	if(Platform.jsonpSupported && !Http.Request) {
		Http.Request = function(method, rest, uri, headers, params, body, callback) {
			var req = createRequest(uri, headers, params, body, CometTransport.REQ_SEND, rest && rest.options.timeouts, method);
			req.once('complete', callback);
			Utils.nextTick(function() {
				req.exec();
			});
			return req;
		};

		Http.checkConnectivity = function(callback) {
			var upUrl = Defaults.jsonpInternetUpUrl;

			if(checksInProgress) {
				checksInProgress.push(callback);
				return;
			}
			checksInProgress = [callback];
			Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Sending; ' + upUrl);

			var req = new Request('isTheInternetUp', upUrl, null, null, null, CometTransport.REQ_SEND, Defaults.TIMEOUTS);
			req.once('complete', function(err, response) {
				var result = !err && response;
				Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Result: ' + result);
				for(var i = 0; i < checksInProgress.length; i++) checksInProgress[i](null, result);
				checksInProgress = null;
			});
			Utils.nextTick(function() {
				req.exec();
			});
		};
	}

	return JSONPTransport;
})();
