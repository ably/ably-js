var XHRRequest = (function() {
	var noop = function() {};
	var idCounter = 0;
	var pendingRequests = {};

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function clearPendingRequests() {
		for(var id in pendingRequests)
			pendingRequests[id].dispose();
	}

	var isIE = typeof global !== 'undefined' && global.XDomainRequest;

	function ieVersion() {
		var match = navigator.userAgent.toString().match(/MSIE\s([\d.]+)/);
		return match && Number(match[1]);
	}

	function needJsonEnvelope() {
		/* IE 10 xhr bug: http://stackoverflow.com/a/16320339 */
		var version;
		return isIE && (version = ieVersion()) && version === 10;
	}

	function getHeader(xhr, header) {
		return xhr.getResponseHeader && xhr.getResponseHeader(header);
	}

	/* Safari mysteriously returns 'Identity' for transfer-encoding when in fact
	 * it is 'chunked'. So instead, decide that it is chunked when
	 * transfer-encoding is present or content-length is absent.  ('or' because
	 * when using http2 streaming, there's no transfer-encoding header, but can
	 * still deduce streaming from lack of content-length) */
	function isEncodingChunked(xhr) {
		return xhr.getResponseHeader
			&& (xhr.getResponseHeader('transfer-encoding')
			|| !xhr.getResponseHeader('content-length'));
	}

	function getHeadersAsObject(xhr) {
		var headerPairs = Utils.trim(xhr.getAllResponseHeaders()).split('\r\n'),
			headers = {};
		for (var i = 0; i < headerPairs.length; i++) {
			var parts = Utils.arrMap(headerPairs[i].split(':'), Utils.trim);
			headers[parts[0].toLowerCase()] = parts[1];
		}
		return headers;
	}

	function XHRRequest(uri, headers, params, body, requestMode, timeouts, method) {
		EventEmitter.call(this);
		params = params || {};
		params.rnd = Utils.cheapRandStr();
		if(needJsonEnvelope() && !params.envelope)
			params.envelope = 'json';
		this.uri = uri + Utils.toQueryString(params);
		this.headers = headers || {};
		this.body = body;
		this.method = method ? method.toUpperCase() : (Utils.isEmptyArg(body) ? 'GET' : 'POST');
		this.requestMode = requestMode;
		this.timeouts = timeouts;
		this.timedOut = false;
		this.requestComplete = false;
		pendingRequests[this.id = String(++idCounter)] = this;
	}
	Utils.inherits(XHRRequest, EventEmitter);

	var createRequest = XHRRequest.createRequest = function(uri, headers, params, body, requestMode, timeouts, method) {
		/* XHR requests are used either with the context being a realtime
		 * transport, or with timeouts passed in (for when used by a rest client),
		 * or completely standalone.  Use the appropriate timeouts in each case */
		timeouts = timeouts || Defaults.TIMEOUTS;
		return new XHRRequest(uri, headers, Utils.copy(params), body, requestMode, timeouts, method);
	};

	XHRRequest.prototype.complete = function(err, body, headers, unpacked, statusCode) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			if(!err && body) {
				this.emit('data', body);
			}
			this.emit('complete', err, body, headers, unpacked, statusCode);
			this.dispose();
		}
	};

	XHRRequest.prototype.abort = function() {
		this.dispose();
	};

	XHRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout,
			self = this,
			timer = this.timer = setTimeout(function() {
				self.timedOut = true;
				xhr.abort();
			}, timeout),
			body = this.body,
			method = this.method,
			headers = this.headers,
			xhr = this.xhr = new XMLHttpRequest(),
			accept = headers['accept'],
			responseType = 'text';

		if(!accept) {
			headers['accept'] = 'application/json';
		} else if(accept.indexOf('application/x-msgpack') === 0) {
			responseType = 'arraybuffer';
		}

		if(body) {
			var contentType = headers['content-type'] || (headers['content-type'] = 'application/json');
			if(contentType.indexOf('application/json') > -1 && typeof(body) != 'string')
				body = JSON.stringify(body);
		}

		xhr.open(method, this.uri, true);
		xhr.responseType = responseType;

		if ('authorization' in headers) {
			xhr.withCredentials = true;
		}

		for(var h in headers)
			xhr.setRequestHeader(h, headers[h]);

		var errorHandler = function(errorEvent, message, code, statusCode) {
			var errorMessage = message + ' (event type: ' + errorEvent.type + ')' + (self.xhr.statusText ? ', current statusText is ' + self.xhr.statusText : '');
			Logger.logAction(Logger.LOG_ERROR, 'Request.on' + errorEvent.type + '()', errorMessage);
			self.complete(new ErrorInfo(errorMessage, code, statusCode));
		};
		xhr.onerror = function(errorEvent) {
			errorHandler(errorEvent, 'XHR error occurred', null, 400);
		}
		xhr.onabort = function(errorEvent) {
			if(self.timedOut) {
				errorHandler(errorEvent, 'Request aborted due to request timeout expiring', null, 408);
			} else {
				errorHandler(errorEvent, 'Request cancelled', null, 400);
			}
		};
		xhr.ontimeout = function(errorEvent) {
			errorHandler(errorEvent, 'Request timed out', null, 408);
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
				self.complete(null, null, null, null, statusCode);
				return;
			}
			streaming = (self.requestMode == REQ_RECV_STREAM && successResponse && isEncodingChunked(xhr));
		}

		function onEnd() {
			try {
				var contentType = getHeader(xhr, 'content-type'),
					headers,
					responseBody,
					/* Be liberal in what we accept; buggy auth servers may respond
					 * without the correct contenttype, but assume they're still
					 * responding with json */
					json = contentType ? (contentType.indexOf('application/json') >= 0) : (xhr.responseType == 'text');

				if(json) {
					/* If we requested msgpack but server responded with json, then since
					 * we set the responseType expecting msgpack, the response will be
					 * an ArrayBuffer containing json */
					responseBody = (xhr.responseType === 'arraybuffer') ? BufferUtils.utf8Decode(xhr.response) : String(xhr.responseText);
					if(responseBody.length) {
						responseBody = JSON.parse(responseBody);
					}
					unpacked = true;
				} else {
					responseBody = xhr.response;
				}

				if(responseBody.response !== undefined) {
					/* unwrap JSON envelope */
					statusCode = responseBody.statusCode;
					successResponse = (statusCode < 400);
					headers = responseBody.headers;
					responseBody = responseBody.response;
				} else {
					headers = getHeadersAsObject(xhr);
				}
			} catch(e) {
				self.complete(new ErrorInfo('Malformed response body from server: ' + e.message, null, 400));
				return;
			}

			/* If response is an array, it's an array of protocol messages -- even if
			 * is contains an error action (hence the nonsuccess statuscode), we can
			 * consider the request to have succeeded, just pass it on to
			 * onProtocolMessage to decide what to do */
			if(successResponse || Utils.isArray(responseBody)) {
				self.complete(null, responseBody, headers, unpacked, statusCode);
				return;
			}

			var err = responseBody.error;
			if(!err) {
				err = new ErrorInfo('Error response received from server: ' + statusCode + ' body was: ' + Utils.inspect(responseBody), null, statusCode);
			}
			self.complete(err, responseBody, headers, unpacked, statusCode);
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
				self.complete(new ErrorInfo('Malformed response body from server: ' + e.message, null, 400));
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

	if(Platform.xhrSupported) {
		if(typeof DomEvent === 'object') {
			DomEvent.addUnloadListener(clearPendingRequests);
		}
		if(typeof(Http) !== 'undefined') {
			Http.supportsAuthHeaders = true;
			Http.Request = function(method, rest, uri, headers, params, body, callback) {
				var req = createRequest(uri, headers, params, body, REQ_SEND, rest && rest.options.timeouts, method);
				req.once('complete', callback);
				req.exec();
				return req;
			};

			Http.checkConnectivity = function(callback) {
				var upUrl = Defaults.internetUpUrl;
				Logger.logAction(Logger.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Sending; ' + upUrl);
				Http.getUri(null, upUrl, null, null, function(err, responseText) {
					var result = (!err && responseText.replace(/\n/, '') == 'yes');
					Logger.logAction(Logger.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Result: ' + result);
					callback(null, result);
				});
			};
		}
	}

	return XHRRequest;
})();
