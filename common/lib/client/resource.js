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
		return function(err, body, headers, unpacked, statusCode) {
			if(err && !body) {
				callback(err);
				return;
			}

			if(!unpacked) {
				try {
					body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(body);
				} catch(e) {
					callback(e);
					return;
				}
			}

			if(body.statusCode === undefined) {
				/* Envelope already unwrapped by the transport */
				callback(err, body, headers, true, statusCode);
				return;
			}

			var statusCode = body.statusCode,
				response = body.response,
				headers = body.headers;

			if(statusCode < 200 || statusCode >= 300) {
				/* handle wrapped errors */
				var wrappedErr = (response && response.error) || err;
				if(!wrappedErr) {
					wrappedErr = new Error("Error in unenveloping " + body);
					wrappedErr.statusCode = statusCode;
				}
				callback(wrappedErr, response, headers, true, statusCode);
				return;
			}

			callback(err, response, headers, true, statusCode);
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

	Resource.get = function(rest, path, origheaders, origparams, envelope, callback) {
		Resource['do']('get', rest, path, null, origheaders, origparams, envelope, callback);
	};

	Resource.post = function(rest, path, body, origheaders, origparams, envelope, callback) {
		Resource['do']('post', rest, path, body, origheaders, origparams, envelope, callback);
	};

	Resource['delete'] = function(rest, path, origheaders, origparams, envelope, callback) {
		Resource['do']('delete', rest, path, null, origheaders, origparams, envelope, callback);
	};

	Resource.put = function(rest, path, body, origheaders, origparams, envelope, callback) {
		Resource['do']('put', rest, path, body, origheaders, origparams, envelope, callback);
	};

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
