var XHRRequest = (function() {
	var noop = function() {};
	var idCounter = 0;
	var pendingRequests = {};

	/* duplicated here; because this is included standalone in iframe.js */
	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function clearPendingRequests() {
		for(var id in pendingRequests)
			pendingRequests[id].dispose();
	}

	var isIE = window.XDomainRequest;
	var xhrSupported, xdrSupported;
	function isAvailable() {
		if(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()) {
			return (xhrSupported = true);
		}

		if(isIE && document.domain && (window.location.protocol == 'https:')) {
			return (xdrSupported = true);
		}

		return false;
	};

	function getContentType(xhr) {
		return xhr.getResponseHeader && xhr.getResponseHeader('content-type');
	}

	function XHRRequest(uri, headers, params, body, requestMode) {
		EventEmitter.call(this);
		params = params || {};
		params.rnd = String(Math.random()).substr(2);
		this.uri = uri + Utils.toQueryString(params);
		this.headers = headers || {};
		this.body = body;
		this.requestMode = requestMode;
		this.requestComplete = false;
		pendingRequests[this.id = String(++idCounter)] = this;
	}
	Utils.inherits(XHRRequest, EventEmitter);
	XHRRequest.isAvailable = isAvailable;

	var createRequest = XHRRequest.createRequest = function(uri, headers, params, body, requestMode) {
		return xhrSupported ? new XHRRequest(uri, headers, params, body, requestMode) : new XDRRequest(uri, headers, params, body, requestMode);
	};

	XHRRequest.prototype.complete = function(err, body, headers, unpacked) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			if(body)
				this.emit('data', body);
			this.emit('complete', err, body, headers, unpacked);
			this.dispose();
		}
	};

	XHRRequest.prototype.abort = function() {
		this.dispose();
	};

	XHRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			headers = this.headers,
			xhr = this.xhr = new XMLHttpRequest(),
			self = this,
			accept = headers['accept'],
			responseType = 'text';

		if(!accept)
			headers['accept'] = 'application/json';
		else if(accept != 'application/json')
			responseType = 'arraybuffer';

		if(body) {
			var contentType = headers['content-type'] || (headers['content-type'] = 'application/json');
			if(contentType == 'application/json' && typeof(body) != 'string')
				body = JSON.stringify(body);
		}


		xhr.open(method, this.uri, true);
		xhr.responseType = responseType;
		xhr.withCredentials = 'true';

		for(var h in headers)
			xhr.setRequestHeader(h, headers[h]);

		var onerror = xhr.onerror = function(err) {
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			contentType,
			successResponse,
			streamPos = 0,
			unpacked = false;

		function onResponse() {
			clearTimeout(timer);
			successResponse = (statusCode < 400);
			if(statusCode == 204) {
				self.complete();
				return;
			}
			streaming = (self.requestMode == REQ_RECV_STREAM && successResponse);
		}

		function onEnd() {
			try {
				var contentType = getContentType(xhr),
					json = contentType ? (contentType == 'application/json') : (xhr.responseType == 'text');

				responseBody = json ? xhr.responseText : xhr.response;
				if(!responseBody) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}

				if(json) {
					responseBody = JSON.parse(String(responseBody));
					unpacked = true;
				}
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}

			if(successResponse) {
				self.complete(null, responseBody, (contentType && {'content-type': contentType}), unpacked);
				return;
			}

			var err = responseBody.error;
			if(!err) {
				err = new Error('Error response received from server: ' + statusCode);
				err.statusCode = statusCode;
			}
			self.complete(err);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onreadystatechange = function() {
			var readyState = xhr.readyState;
			if(readyState < 3) return;
			if(xhr.status !== 0) {
				if(statusCode === undefined) {
					statusCode = xhr.status;
					/* IE returns 1223 for 204: http://bugs.jquery.com/ticket/1450 */
					if(statusCode === 1223) statusCode = 204;
					onResponse();
				}
				if(readyState == 3 && streaming) {
					onProgress();
				} else if(readyState == 4) {
					if(streaming)
						onStreamEnd();
					else
						onEnd();
				}
			}
		};
		xhr.send(body);
	};

	XHRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onreadystatechange = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	function XDRRequest(uri, headers, params, body, requestMode) {
		params.ua = 'xdr';
		XHRRequest.call(this, uri, headers, params, body, requestMode);
	}
	Utils.inherits(XDRRequest, XHRRequest);

   /**
	* References:
	* http://ajaxian.com/archives/100-line-ajax-wrapper
	* http://msdn.microsoft.com/en-us/library/cc288060(v=VS.85).aspx
	*/
	XDRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			xhr = this.xhr = new XDomainRequest(),
			self = this;

		if(body)
			if(typeof(body) == 'object') body = JSON.stringify(body);

		var onerror = xhr.onerror = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onerror()', '');
			var err = new Error('Error response');
			err.statusCode = 400;
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onabort()', '');
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.timeout()', '');
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			streamPos = 0;

		function onResponse() {
			clearTimeout(timer);
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onResponse: ', responseBody);
			if(responseBody) {
				var idx = responseBody.length - 1;
				if(responseBody[idx] == '\n' || (idx = responseBody.indexOf('\n') > -1)) {
					var chunk = responseBody.slice(0, idx);
					try {
						chunk = JSON.parse(chunk);
						var err = chunk.error;
						if(err) {
							statusCode = err.statusCode || 500;
							self.complete(err);
						} else {
							statusCode = responseBody ? 201 : 200;
							streaming = (self.requestMode == REQ_RECV_STREAM);
							if(streaming) {
								streamPos = idx;
								if(!Utils.isEmpty(chunk)) {
									self.emit('data', chunk);
								}
							}
						}
					} catch(e) {
						err = new Error('Malformed response body from server: ' + e.message);
						err.statusCode = 400;
						self.complete(err);
						return;
					}
				}
			}
		}

		function onEnd() {
			try {
				responseBody = xhr.responseText;
				//Logger.logAction(Logger.LOG_MICRO, 'onEnd: ', responseBody);
				if(!responseBody || !responseBody.length) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}
				responseBody = JSON.parse(String(responseBody));
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.complete(null, responseBody, {'content-type': 'application/json'}, true);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onProgress: ', responseBody);
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onprogress = function() {
			if(statusCode === undefined)
				onResponse();
			else if(streaming)
				onProgress();
		};

		xhr.onload = function() {
			if(statusCode === undefined) {
				onResponse();
				if(self.requestComplete)
					return;
			}
			if(streaming)
				onStreamEnd();
			else
				onEnd();
		};

		try {
			xhr.open(method, this.uri);
			xhr.send(body);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onStreamEnd()', 'Unexpected send exception; err = ' + e);
			onerror(e);
		}
	};

	XDRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onprogress = xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	var isAvailable = XHRRequest.isAvailable();
	if(isAvailable) {
		DomEvent.addUnloadListener(clearPendingRequests);
		if(typeof(Http) !== 'undefined') {
			Http.supportsAuthHeaders = xhrSupported;
			Http.Request = function(uri, headers, params, body, callback) {
				var req = createRequest(uri, headers, params, body, REQ_SEND);
				req.once('complete', callback);
				req.exec();
				return req;
			};
		}
	}

	return XHRRequest;
})();
