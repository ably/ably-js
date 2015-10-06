var Resource = (function() {
	var msgpack = (typeof(window) == 'object') ? window.Ably.msgpack : require('msgpack-js');

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
		return function(err, body, headers, unpacked) {
			if(err) {
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

			var statusCode = body.statusCode,
				response = body.response,
				headers = body.headers;

			if(statusCode < 200 || statusCode >= 300) {
				/* handle wrapped errors */
				var err = response && response.error;
				if(!err) {
					err = new Error(String(res));
					err.statusCode = statusCode;
				}
				callback(err);
				return;
			}

			callback(null, response, headers, true);
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

	function logResponseHandler(callback, verb, path, params) {
		return function(err, body, headers, unpacked) {
			if (err) {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + verb + '()', 'Received Error; ' + urlFromPathAndParams(path, params) + '; Error: ' + JSON.stringify(err));
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.' + verb + '()',
					'Received; ' + urlFromPathAndParams(path, params) + '; Headers: ' + paramString(headers) + '; Body: ' + (BufferUtils.isBuffer(body) ? body.toString() : body));
			}
			if (callback) { callback(err, body, headers, unpacked); }
		}
	}

	Resource.get = function(rest, path, origheaders, origparams, envelope, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			callback = logResponseHandler(callback, 'get', path, origparams);
		}

		if(envelope) {
			callback = (callback && unenvelope(callback, envelope));
			(origparams = (origparams || {}))['envelope'] = envelope;
		}

		function doGet(headers, params) {
			if (Logger.shouldLog(Logger.LOG_MICRO)) {
				Logger.logAction(Logger.LOG_MICRO, 'Resource.get()', 'Sending; ' + urlFromPathAndParams(path, params));
			}

			Http.get(rest, path, headers, params, function(err, res, headers, unpacked) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise(null, {force:true}, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doGet);
					});
					return;
				}
				callback(err, res, headers, unpacked);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doGet);
	};

	Resource.post = function(rest, path, body, origheaders, origparams, envelope, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			callback = logResponseHandler(callback, 'post', path, origparams);
		}

		if(envelope) {
			callback = unenvelope(callback, envelope);
			origparams['envelope'] = envelope;
		}

		function doPost(headers, params) {
			if (Logger.shouldLog(Logger.LOG_MICRO)) {
				var decodedBody = body;
				if ((headers['content-type'] || '').indexOf('msgpack') > 0) {
					try {
						body = msgpack.decode(body);
					} catch (decodeErr) {
						Logger.logAction(Logger.LOG_MICRO, 'Resource.post()', 'Sending MsgPack Decoding Error: ' + JSON.stringify(decodeErr));
					}
				}
				Logger.logAction(Logger.LOG_MICRO, 'Resource.post()', 'Sending; ' + urlFromPathAndParams(path, params) + '; Body: ' + decodedBody);
			}

			Http.post(rest, path, headers, body, params, function(err, res, headers, unpacked) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise(null, {force:true}, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doPost);
					});
					return;
				}
				callback(err, res, headers, unpacked);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doPost);
	};

	return Resource;
})();
