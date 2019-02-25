var Resource = (function() {
	var msgpack = Platform.msgpack;

	function Resource() {}

	function withAuthDetails(rest, headers, params, errCallback, opCallback) {
		if (Http.supportsAuthHeaders) {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err)
					errCallback(err);
				else
					opCallback(Utils.mixin(authHeaders, headers), params);
			});
		} else {
			rest.auth.getAuthParams(function(err, authParams) {
				if(err)
					errCallback(err);
				else
					opCallback(headers, Utils.mixin(authParams, params));
			});
		}
	}

	function unenvelope(callback, format) {
		return function(err, body, outerHeaders, unpacked, outerStatusCode) {
			if(err && !body) {
				callback(err);
				return;
			}

			if(!unpacked) {
				try {
					body = Utils.decodeBody(body, format);
				} catch(e) {
					callback(e);
					return;
				}
			}

			if(body.statusCode === undefined) {
				/* Envelope already unwrapped by the transport */
				callback(err, body, outerHeaders, true, outerStatusCode);
				return;
			}

			var wrappedStatusCode = body.statusCode,
				response = body.response,
				wrappedHeaders = body.headers;

			if(wrappedStatusCode < 200 || wrappedStatusCode >= 300) {
				/* handle wrapped errors */
				var wrappedErr = (response && response.error) || err;
				if(!wrappedErr) {
					wrappedErr = new Error("Error in unenveloping " + body);
					wrappedErr.statusCode = wrappedStatusCode;
				}
				callback(wrappedErr, response, wrappedHeaders, true, wrappedStatusCode);
				return;
			}

			callback(err, response, wrappedHeaders, true, wrappedStatusCode);
		};
	}

	function paramString(params) {
		var paramPairs = [];
		if (params) {
			for (var needle in params) {
				paramPairs.push(needle + '=' + params[needle]);
			}
		}
		return paramPairs.join('&');
	}

	function urlFromPathAndParams(path, params) {
		return path + (params ? '?' : '') + paramString(params);
	}

	function logResponseHandler(callback, method, path, params) {
		return function(err, body, headers, unpacked, statusCode) {
			if (err) {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + method + '()', 'Received Error; ' + urlFromPathAndParams(path, params) + '; Error: ' + Utils.inspectError(err));
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + method + '()',
					'Received; ' + urlFromPathAndParams(path, params) + '; Headers: ' + paramString(headers) + '; StatusCode: ' + statusCode + '; Body: ' + (BufferUtils.isBuffer(body) ? body.toString() : body));
			}
			if (callback) { callback(err, body, headers, unpacked, statusCode); }
		}
	}

	Utils.arrForEach(Http.methodsWithoutBody, function(method) {
		Resource[method] = function(rest, path, origheaders, origparams, envelope, callback) {
			Resource['do'](method, rest, path, null, origheaders, origparams, envelope, callback);
		};
	});

	Utils.arrForEach(Http.methodsWithBody, function(method) {
		Resource[method] = function(rest, path, body, origheaders, origparams, envelope, callback) {
			Resource['do'](method, rest, path, body, origheaders, origparams, envelope, callback);
		};
	});

	Resource['do'] = function(method, rest, path, body, origheaders, origparams, envelope, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			callback = logResponseHandler(callback, method, path, origparams);
		}

		if(envelope) {
			callback = (callback && unenvelope(callback, envelope));
			(origparams = (origparams || {}))['envelope'] = envelope;
		}

		function doRequest(headers, params) {
			if (Logger.shouldLog(Logger.LOG_MICRO)) {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + method + '()', 'Sending; ' + urlFromPathAndParams(path, params));
			}

			var args = [rest, path, headers, body, params, function(err, res, headers, unpacked, statusCode) {
				if(err && Auth.isTokenErr(err)) {
					/* token has expired, so get a new one */
					rest.auth.authorize(null, null, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doRequest);
					});
					return;
				}
				callback(err, res, headers, unpacked, statusCode);
			}];
			if (!body) {
				args.splice(3, 1);
			}

			if (Logger.shouldLog(Logger.LOG_MICRO)) {
				var decodedBody = body;
				if ((headers['content-type'] || '').indexOf('msgpack') > 0) {
					try {
						decodedBody = msgpack.decode(body);
					} catch (decodeErr) {
						Logger.logAction(Logger.LOG_MICRO, 'Resource.' + method + '()', 'Sending MsgPack Decoding Error: ' + Utils.inspectError(decodeErr));
					}
				}
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + method + '()', 'Sending; ' + urlFromPathAndParams(path, params) + '; Body: ' + decodedBody);
			}
			Http[method].apply(this, args);
		}

		withAuthDetails(rest, origheaders, origparams, callback, doRequest);
	};

	return Resource;
})();
