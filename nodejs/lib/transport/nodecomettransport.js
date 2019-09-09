"use strict";
var NodeCometTransport = (function() {
	var http = require('http');
	var https = require('https');
	var url = require('url');
	var util = require('util');
	var noop = function(){};
	var shortName = 'comet';

	/*
	 * A transport to use with nodejs
	 * to simulate an XHR transport for test purposes
	 */
	function NodeCometTransport(connectionManager, auth, params) {
		CometTransport.call(this, connectionManager, auth, params);
		this.httpAgent = null;
		this.httpsAgent = null;
		this.pendingRequests = 0;
		this.shortName = shortName;
	}
	util.inherits(NodeCometTransport, CometTransport);

	NodeCometTransport.isAvailable = function() { return true; };
	ConnectionManager.supportedTransports[shortName] = NodeCometTransport;

	NodeCometTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new NodeCometTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback({event: this.event, error: err}); };
		transport.on(['failed', 'disconnected'], errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'NodeCometTransport.tryConnect()', 'viable transport ' + transport);
			transport.off(['failed', 'disconnected'], errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	NodeCometTransport.prototype.toString = function() {
		return 'NodeCometTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected + '; format=' + this.format + '; stream=' + this.stream;
	};

	NodeCometTransport.prototype.getAgent = function(tls) {
		var prop = tls ? 'httpsAgent' : 'httpAgent',
			agent = this[prop];

		if(!agent)
			agent = this[prop] = new (tls ? https: http).Agent({ keepAlive: true });

		return agent;
	};

	NodeCometTransport.prototype.dispose = function() {
		var self = this;
		this.onceNoPending(function() {
			if(self.httpAgent)
				self.httpAgent.destroy();
			if(self.httpsAgent)
				self.httpsAgent.destroy();
		});
		CometTransport.prototype.dispose.call(this);
	};

	/* valid in non-streaming mode only, or data only contains last update */
	NodeCometTransport.prototype.request = function(uri, params, body, requestMode, callback) {
		var req = this.createRequest(uri, params, body, requestMode);
		req.once('complete', callback);
		req.exec();
		return req;
	};

	NodeCometTransport.prototype.createRequest = function(uri, headers, params, body, requestMode) {
		return new Request(uri, headers, params, body, requestMode, this.format, this.timeouts, this);
	};

	NodeCometTransport.prototype.addPending = function() {
		++this.pendingRequests;
	};

	NodeCometTransport.prototype.removePending = function() {
		if(--this.pendingRequests <= 0) {
			this.emit('nopending');
		}
	};

	NodeCometTransport.prototype.onceNoPending = function(listener) {
		if(this.pendingRequests == 0) {
			listener();
			return;
		}
		this.once('nopending', listener);
	};

	function Request(uri, headers, params, body, requestMode, format, timeouts, transport) {
		EventEmitter.call(this);
		if(typeof(uri) == 'string') uri = url.parse(uri);
		var tls = (uri.protocol == 'https:');
		this.client = tls ? https : http;
		this.requestMode = requestMode;
		this.timeouts = timeouts;
		this.transport = transport;
		this.requestComplete = false;
		this.req = this.res = null;

		var method = 'GET',
			contentType = (format == 'msgpack') ? 'application/x-msgpack' : 'application/json';

		headers = headers ? Utils.mixin({}, headers) : {};
		headers['accept'] = contentType;

		if(body) {
			method = 'POST';
			if(!Buffer.isBuffer(body)) {
				if(typeof(body) == 'object') body = JSON.stringify(body);
				body = new Buffer(body);
			}
			this.body = body;
			headers['Content-Length'] = body.length;
			headers['Content-Type'] = contentType;
		}
		var requestOptions = this.requestOptions = {
			hostname: uri.hostname,
			port: uri.port,
			path: uri.path + Utils.toQueryString(params),
			method: method,
			headers: headers
		};
		if(transport)
			requestOptions.agent = transport.getAgent(tls);
	}
	Utils.inherits(Request, EventEmitter);

	Request.prototype.exec = function() {
		var timeout = (this.requestMode == CometTransport.REQ_SEND) ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout,
			self = this;

		var timer = this.timer = setTimeout(function() { self.abort(); }, timeout),
			req = this.req = this.client.request(this.requestOptions);

		req.on('error', this.onReqError = function(err) {
			clearTimeout(timer);
			self.timer = null;
			self.complete(err);
		});

		req.on('response', function(res) {
			clearTimeout(timer);
			self.timer = null;

			var statusCode = res.statusCode;
			if(statusCode == 204) {
				/* cause the stream to flow, and thus end */
				res.resume();
				self.complete();
				return;
			}

			res.on('error', self.onResError = function(err) {
				self.complete(err);
			});

			self.res = res;
			/* responses with an non-success statusCode are never streamed */
			if(self.requestMode == CometTransport.REQ_RECV_STREAM && statusCode < 400) {
				self.readStream();
			} else {
				self.readFully();
			}
		});

		if(this.transport)
			this.transport.addPending();

		req.end(this.body);
	};

	Request.prototype.readStream = function() {
		var res = this.res,
			headers = res.headers,
			self = this;

		/* an array of text blocks to concatenate and parse once complete */
		this.chunks = [];
		this.streamComplete = false;

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				var msg = 'Malformed response body from server: ' + e.message;
				Logger.logAction(Logger.LOG_ERROR, 'NodeCometTransport.Request.readStream()', msg);
				self.complete(new ErrorInfo(msg, null, 400));
				return;
			}
			self.emit('data', chunk);
		}

		res.on('data', (this.ondata = function(data) {
			var newChunks = String(data).split('\n'),
				chunks = self.chunks;

			if(newChunks.length > 1 && chunks.length > 0) {
				/* there is a \n in this chunk, so it completes the partial chunks we had */
				chunks.push(newChunks.shift());
				self.chunks = [];
				onChunk(chunks.join(''));
			}

			/* if the trailing chunk wasn't empty, it's a new fragment */
			var trailingNewChunk = newChunks.pop();
			if(trailingNewChunk.length) {
				self.chunks.push(trailingNewChunk);
			}

			/* the remaining new chunks are complete */
			newChunks.map(onChunk);
		}));

		res.on('end', function () {
			self.streamComplete = true;
			process.nextTick(function() {
				self.complete();
			});
		});
	};

	Request.prototype.readFully = function() {
		var res = this.res,
			chunks = [],
			self = this;

		res.on('data', function(chunk) {
			chunks.push(chunk);
		});

		res.on('end', function () {
			process.nextTick(function() {
				var body = Buffer.concat(chunks),
					statusCode = res.statusCode;

				try {
					body = JSON.parse(String(body));
				} catch(e) {
					var msg = 'Malformed response body from server: ' + e.message;
					Logger.logAction(Logger.LOG_ERROR, 'NodeCometTransport.Request.readFully()', msg);
					self.complete(new ErrorInfo(msg, null, 400));
					return;
				}

				/* If response is an array, it's an array of protocol messages -- even if
				 * is contains an error action (hence the nonsuccess statuscode), we can
				 * consider the request to have succeeded, just pass it on to
				 * onProtocolMessage to decide what to do */
				if(statusCode < 400 || Utils.isArray(body)) {
					self.complete(null, body);
					return;
				}

				var err = body.error;
				if(!err) {
					err = new ErrorInfo('Error response received from server: ' + statusCode + ', body was: ' + Utils.inspect(body), null, statusCode);
				}
				self.complete(err);
			});
		});
	};

	Request.prototype.complete = function(err, body) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			if(body)
				this.emit('data', body);
			this.emit('complete', err, body);
			if(err) {
				/* if there was an error mid-stream, ensure
				 * we get no new data events from the stream */
				if(this.ondata && !this.streamComplete)
					if(this.ondata && this.res) this.res.removeListener('data', this.ondata);
			}
			if(this.transport) {
				this.transport.removePending();
			}
		}
	};

	Request.prototype.abort = function() {
		Logger.logAction(Logger.LOG_MINOR, 'NodeCometTransport.Request.abort()', '');
		var timer = this.timer;
		if(timer) {
			clearTimeout(timer);
			this.timer = null;
		}
		var req = this.req;
		if(req) {
			Logger.logAction(Logger.LOG_MINOR, 'NodeCometTransport.Request.abort()', 'aborting request');
			req.removeListener('error', this.onReqError);
			req.on('error', noop);
			req.abort();
			this.req = null;
		}
		this.complete({statusCode: 400, code: 80003, message: 'Cancelled'})
	};

	return NodeCometTransport;
})();
