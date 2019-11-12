var Auth = (function() {
	var MAX_TOKEN_LENGTH = Math.pow(2, 17);
	function noop() {}
	function random() { return ('000000' + Math.floor(Math.random() * 1E16)).slice(-16); }
	function normaliseAuthcallbackError(err) {
		/* A client auth callback may give errors in any number of formats; normalise to an errorinfo */
		if(!Utils.isErrorInfo(err)) {
			return new ErrorInfo(Utils.inspectError(err), err.code || 40170, err.statusCode || 401);
		}
		/* network errors will not have an inherent error code */
		if(!err.code) {
			if(err.statusCode === 403) {
				err.code = 40300;
			} else {
				err.code = 40170;
				/* normalise statusCode to 401 per RSA4e */
				err.statusCode = 401;
			}
		}
		return err;
	}

	var hmac, toBase64;
	if(Platform.createHmac) {
		toBase64 = function(str) { return (new Buffer(str, 'ascii')).toString('base64'); };
		hmac = function(text, key) {
			var inst = Platform.createHmac('SHA256', key);
			inst.update(text);
			return inst.digest('base64');
		};
	} else {
		toBase64 = Base64.encode;
		hmac = function(text, key) {
			return CryptoJS.HmacSHA256(text, key).toString(CryptoJS.enc.Base64);
		};
	}

	function c14n(capability) {
		if(!capability)
			return '';

		if(typeof(capability) == 'string')
			capability = JSON.parse(capability);

		var c14nCapability = {};
		var keys = Utils.keysArray(capability, true);
		if(!keys)
			return '';
		keys.sort();
		for(var i = 0; i < keys.length; i++) {
			c14nCapability[keys[i]] = capability[keys[i]].sort();
		}
		return JSON.stringify(c14nCapability);
	}

	function logAndValidateTokenAuthMethod(authOptions) {
		if(authOptions.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
		} else if(authOptions.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
		} else if(authOptions.key) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
		} else if(authOptions.tokenDetails) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
		} else {
			var msg = 'authOptions must include valid authentication parameters';
			Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
			throw new Error(msg);
		}
	}

	function basicAuthForced(options) {
		return 'useTokenAuth' in options && !options.useTokenAuth;
	}

	/* RSA4 */
	function useTokenAuth(options) {
		return options.useTokenAuth ||
			(!basicAuthForced(options) &&
			 (options.authCallback ||
			  options.authUrl      ||
			  options.token        ||
			  options.tokenDetails))
	}

	/* RSA4a */
	function noWayToRenew(options) {
		return !options.key &&
			!options.authCallback &&
			!options.authUrl;
	}

	var trId = 0;
	function getTokenRequestId() {
		return trId++;
	}

	function Auth(client, options) {
		this.client = client;
		this.tokenParams = options.defaultTokenParams || {};
		/* The id of the current token request if one is in progress, else null */
		this.currentTokenRequestId = null;
		this.waitingForTokenRequest = null;

		if(useTokenAuth(options)) {
			/* Token auth */
			if(options.key && !hmac) {
				var msg = 'client-side token request signing not supported';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new Error(msg);
			}
			if(noWayToRenew(options)) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', 'Warning: library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help');
			}
			this._saveTokenOptions(options.defaultTokenParams, options);
			logAndValidateTokenAuthMethod(this.authOptions);
		} else {
			/* Basic auth */
			if(!options.key) {
				var msg = 'No authentication options provided; need one of: key, authUrl, or authCallback (or for testing only, token or tokenDetails)';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new ErrorInfo(msg, 40160, 401);
			}
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
			this._saveBasicOptions(options);
		}
	}

	/**
	 * Instructs the library to get a token immediately and ensures Token Auth
	 * is used for all future requests, storing the tokenParams and authOptions
	 * given as the new defaults for subsequent use.
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 *
	 * - ttl:        (optional) the requested life of any new token in ms. If none
	 *               is specified a default of 1 hour is provided. The maximum lifetime
	 *               is 24hours; any request exceeeding that lifetime will be rejected
	 *               with an error.
	 *
	 * - capability: (optional) the capability to associate with the access token.
	 *               If none is specified, a token will be requested with all of the
	 *               capabilities of the specified key.
	 *
	 * - clientId:   (optional) a client Id to associate with the token
	 *
	 * - timestamp:  (optional) the time in ms since the epoch. If none is specified,
	 *               the system will be queried for a time value to use.
	 *
	 * @param authOptions
	 * an object containing auth options relevant to token auth:
	 *
	 * - queryTime   (optional) boolean indicating that the Ably system should be
	 *               queried for the current time when none is specified explicitly.
	 *
	 * - tokenDetails: (optional) object: An authenticated TokenDetails object.
	 *
	 * - token:        (optional) string: the `token` property of a tokenDetails object
	 *
	 * - authCallback:  (optional) a JavaScript callback to be called to get auth information.
	 *                  authCallback should be a function of (tokenParams, callback) that calls
	 *                  the callback with (err, result), where result is any of:
	 *                  - a tokenRequest object (ie the result of a rest.auth.createTokenRequest call),
	 *                  - a tokenDetails object (ie the result of a rest.auth.requestToken call),
	 *                  - a token string
	 *
	 * - authUrl:       (optional) a URL to be used to GET or POST a set of token request
	 *                  params, to obtain a signed token request.
	 *
	 * - authHeaders:   (optional) a set of application-specific headers to be added to any request
	 *                  made to the authUrl.
	 *
	 * - authParams:    (optional) a set of application-specific query params to be added to any
	 *                  request made to the authUrl.
	 *
	 *
	 * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorize = function(tokenParams, authOptions, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			authOptions = tokenParams = null;
		} else if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = null;
		}
		if(!callback) {
			if(this.client.options.promises) {
				return Utils.promisify(this, 'authorize', arguments);
			}
			callback = noop;
		}
		var self = this;

		/* RSA10a: authorize() call implies token auth. If a key is passed it, we
		 * just check if it doesn't clash and assume we're generating a token from it */
		if(authOptions && authOptions.key && (this.authOptions.key !== authOptions.key)) {
			throw new ErrorInfo('Unable to update auth options with incompatible key', 40102, 401);
		}

		if(authOptions && ('force' in authOptions)) {
			Logger.logAction(Logger.LOG_ERROR, 'Auth.authorize', 'Deprecation warning: specifying {force: true} in authOptions is no longer necessary, authorize() now always gets a new token. Please remove this, as in version 1.0 and later, having a non-null authOptions will overwrite stored library authOptions, which may not be what you want');
			/* Emulate the old behaviour: if 'force' was the only member of authOptions,
			 * set it to null so it doesn't overwrite stored. TODO: remove in version 1.0 */
			if(Utils.isOnlyPropIn(authOptions, 'force')) {
				authOptions = null;
			}
		}

		this._forceNewToken(tokenParams, authOptions, function(err, tokenDetails) {
			if(err) {
				callback(err);
				return;
			}
			/* RTC8
			 * - When authorize called by an end user and have a realtime connection,
			 * don't call back till new token has taken effect.
			 * - Use self.client.connection as a proxy for (self.client instanceof Realtime),
			 * which doesn't work in node as Realtime isn't part of the vm context for Rest clients */
			if(self.client.connection) {
				self.client.connection.connectionManager.onAuthUpdated(tokenDetails, callback);
			} else {
				callback(null, tokenDetails);
			}
		})
	};

	Auth.prototype.authorise = function() {
		Logger.deprecated('Auth.authorise', 'Auth.authorize');
		this.authorize.apply(this, arguments);
	};

	/* For internal use, eg by connectionManager - useful when want to call back
	 * as soon as we have the new token, rather than waiting for it to take
	 * effect on the connection as #authorize does */
	Auth.prototype._forceNewToken = function(tokenParams, authOptions, callback) {
		var self = this;

		/* get rid of current token even if still valid */
		this.tokenDetails = null;

		/* _save normalises the tokenParams and authOptions and updates the auth
		 * object. All subsequent operations should use the values on `this`,
		 * not the passed in ones. */
		this._saveTokenOptions(tokenParams, authOptions);

		logAndValidateTokenAuthMethod(this.authOptions);

		this._ensureValidAuthCredentials(true, function(err, tokenDetails) {
			/* RSA10g */
			delete self.tokenParams.timestamp;
			delete self.authOptions.queryTime;
			callback(err, tokenDetails);
		});
	}

	/**
	 * Request an access token
	 * @param authOptions
	 * an object containing the request options:
	 * - key:           the key to use.
	 *
	 * - authCallback:  (optional) a JavaScript callback to be called to get auth information.
	 *                  authCallback should be a function of (tokenParams, callback) that calls
	 *                  the callback with (err, result), where result is any of:
	 *                  - a tokenRequest object (ie the result of a rest.auth.createTokenRequest call),
	 *                  - a tokenDetails object (ie the result of a rest.auth.requestToken call),
	 *                  - a token string
	 *
	 * - authUrl:       (optional) a URL to be used to GET or POST a set of token request
	 *                  params, to obtain a signed token request.
	 *
	 * - authHeaders:   (optional) a set of application-specific headers to be added to any request
	 *                  made to the authUrl.
	 *
	 * - authParams:    (optional) a set of application-specific query params to be added to any
	 *                  request made to the authUrl.
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 * - ttl:          (optional) the requested life of the token in milliseconds. If none is specified
	 *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *                  exceeeding that lifetime will be rejected with an error.
	 *
	 * - capability:    (optional) the capability to associate with the access token.
	 *                  If none is specified, a token will be requested with all of the
	 *                  capabilities of the specified key.
	 *
	 * - clientId:      (optional) a client Id to associate with the token; if not
	 *                  specified, a clientId passed in constructing the Rest interface will be used
	 *
	 * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.requestToken = function(tokenParams, authOptions, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			authOptions = tokenParams = null;
		}
		else if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = null;
		}
		if(!callback && this.client.options.promises) {
			return Utils.promisify(this, 'requestToken', arguments);
		}

		/* RSA8e: if authOptions passed in, they're used instead of stored, don't merge them */
		authOptions = authOptions || this.authOptions;
		tokenParams = tokenParams || Utils.copy(this.tokenParams);
		callback = callback || noop;

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback, client = this.client;

		if(authOptions.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authCallback');
			tokenRequestCallback = authOptions.authCallback;
		} else if(authOptions.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authUrl');
			tokenRequestCallback = function(params, cb) {
				var authHeaders = Utils.mixin({accept: 'application/json, text/plain'}, authOptions.authHeaders),
					usePost = authOptions.authMethod && authOptions.authMethod.toLowerCase() === 'post';
				if(!usePost) {
					/* Combine authParams with any qs params given in the authUrl */
					var queryIdx = authOptions.authUrl.indexOf('?');
					if(queryIdx > -1) {
						var providedQsParams = Utils.parseQueryString(authOptions.authUrl.slice(queryIdx));
						authOptions.authUrl = authOptions.authUrl.slice(0, queryIdx);
						/* In case of conflict, authParams take precedence over qs params in the authUrl */
						authOptions.authParams = Utils.mixin(providedQsParams, authOptions.authParams);
					}
				}
				/* RSA8c2 */
				var authParams = Utils.mixin({}, authOptions.authParams || {}, params);
				var authUrlRequestCallback = function(err, body, headers, unpacked) {
					var contentType;
					if (err) {
						Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received Error: ' + Utils.inspectError(err));
					} else {
						contentType = headers['content-type'];
						Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received; content-type: ' + contentType + '; body: ' + Utils.inspectBody(body));
					}
					if(err || unpacked) return cb(err, body);
					if(BufferUtils.isBuffer(body)) body = body.toString();
					if(!contentType) {
						cb(new ErrorInfo('authUrl response is missing a content-type header', 40170, 401));
						return;
					}
					var json = contentType.indexOf('application/json') > -1,
						text = contentType.indexOf('text/plain') > -1 || contentType.indexOf('application/jwt') > -1;
					if(!json && !text) {
						cb(new ErrorInfo('authUrl responded with unacceptable content-type ' + contentType + ', should be either text/plain, application/jwt or application/json', 40170, 401));
						return;
					}
					if(json) {
						if(body.length > MAX_TOKEN_LENGTH) {
							cb(new ErrorInfo('authUrl response exceeded max permitted length', 40170, 401));
							return;
						}
						try {
							body = JSON.parse(body);
						} catch(e) {
							cb(new ErrorInfo('Unexpected error processing authURL response; err = ' + e.message, 40170, 401));
							return;
						}
					}
					cb(null, body, contentType);
				};
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Requesting token from ' + authOptions.authUrl + '; Params: ' + JSON.stringify(authParams) + '; method: ' + (usePost ? 'POST' : 'GET'));
				if(usePost) {
					/* send body form-encoded */
					var headers = authHeaders || {};
					headers['content-type'] = 'application/x-www-form-urlencoded';
					var body = Utils.toQueryString(authParams).slice(1); /* slice is to remove the initial '?' */
					Http.postUri(client, authOptions.authUrl, headers, body, {}, authUrlRequestCallback);
				} else {
					Http.getUri(client, authOptions.authUrl, authHeaders || {}, authParams, authUrlRequestCallback);
				}
			};
		} else if(authOptions.key) {
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(params, authOptions, cb); };
		} else {
			var msg = "Need a new token, but authOptions does not include any way to request one (no authUrl, authCallback, or key)";
			Logger.logAction(Logger.LOG_ERROR, 'Auth()', 'library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help');
			callback(new ErrorInfo(msg, 40171, 403));
			return;
		}

		/* normalise token params */
		if('capability' in tokenParams)
			tokenParams.capability = c14n(tokenParams.capability);

		var tokenRequest = function(signedTokenParams, tokenCb) {
			var keyName = signedTokenParams.keyName,
				path = '/keys/' + keyName + '/requestToken',
				tokenUri = function(host) { return client.baseUri(host) + path; };

			var requestHeaders = Utils.defaultPostHeaders();
			if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
			Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending POST to ' + path + '; Token params: ' + JSON.stringify(signedTokenParams));
			signedTokenParams = JSON.stringify(signedTokenParams);
			Http.post(client, tokenUri, requestHeaders, signedTokenParams, null, tokenCb);
		};

		var tokenRequestCallbackTimeoutExpired = false,
			timeoutLength = this.client.options.timeouts.realtimeRequestTimeout,
			tokenRequestCallbackTimeout = setTimeout(function() {
				tokenRequestCallbackTimeoutExpired = true;
				var msg = 'Token request callback timed out after ' + (timeoutLength / 1000) + ' seconds';
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
				callback(new ErrorInfo(msg, 40170, 401));
			}, timeoutLength);

		tokenRequestCallback(tokenParams, function(err, tokenRequestOrDetails, contentType) {
			if(tokenRequestCallbackTimeoutExpired) return;
			clearTimeout(tokenRequestCallbackTimeout);

			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + Utils.inspectError(err));
				callback(normaliseAuthcallbackError(err));
				return;
			}
			/* the response from the callback might be a token string, a signed request or a token details */
			if(typeof(tokenRequestOrDetails) === 'string') {
				if(tokenRequestOrDetails.length === 0) {
					callback(new ErrorInfo('Token string is empty', 40170, 401));
				} else if(tokenRequestOrDetails.length > MAX_TOKEN_LENGTH) {
					callback(new ErrorInfo('Token string exceeded max permitted length (was ' + tokenRequestOrDetails.length + ' bytes)', 40170, 401));
				} else if(tokenRequestOrDetails === 'undefined' || tokenRequestOrDetails === 'null') {
					/* common failure mode with poorly-implemented authCallbacks */
					callback(new ErrorInfo('Token string was literal null/undefined', 40170, 401));
				} else if((tokenRequestOrDetails[0] === '{') && !(contentType && contentType.indexOf('application/jwt') > -1)) {
					callback(new ErrorInfo('Token was double-encoded; make sure you\'re not JSON-encoding an already encoded token request or details', 40170, 401));
				} else {
					callback(null, {token: tokenRequestOrDetails});
				}
				return;
			}
			if(typeof(tokenRequestOrDetails) !== 'object') {
				var msg = 'Expected token request callback to call back with a token string or token request/details object, but got a ' + typeof(tokenRequestOrDetails);
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
				callback(new ErrorInfo(msg, 40170, 401));
				return;
			}
			var objectSize = JSON.stringify(tokenRequestOrDetails).length;
			if(objectSize > MAX_TOKEN_LENGTH && !authOptions.suppressMaxLengthCheck) {
				callback(new ErrorInfo('Token request/details object exceeded max permitted stringified size (was ' + objectSize + ' bytes)', 40170, 401));
				return;
			}
			if('issued' in tokenRequestOrDetails) {
				/* a tokenDetails object */
				callback(null, tokenRequestOrDetails);
				return;
			}
			if(!('keyName' in tokenRequestOrDetails)) {
				var msg = 'Expected token request callback to call back with a token string, token request object, or token details object';
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
				callback(new ErrorInfo(msg, 40170, 401));
				return;
			}
			/* it's a token request, so make the request */
			tokenRequest(tokenRequestOrDetails, function(err, tokenResponse, headers, unpacked) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + Utils.inspectError(err));
					callback(normaliseAuthcallbackError(err));
					return;
				}
				if(!unpacked) tokenResponse = JSON.parse(tokenResponse);
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'token received');
				callback(null, tokenResponse);
			});
		});
	};

	/**
	 * Create and sign a token request based on the given options.
	 * NOTE this can only be used when the key value is available locally.
	 * Otherwise, signed token requests must be obtained from the key
	 * owner (either using the token request callback or url).
	 *
	 * @param authOptions
	 * an object containing the request options:
	 * - key:           the key to use. If not specified, a key passed in constructing
	 *                  the Rest interface will be used
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 * - ttl:       (optional) the requested life of the token in ms. If none is specified
	 *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *                  exceeeding that lifetime will be rejected with an error.
	 *
	 * - capability:    (optional) the capability to associate with the access token.
	 *                  If none is specified, a token will be requested with all of the
	 *                  capabilities of the specified key.
	 *
	 * - clientId:      (optional) a client Id to associate with the token; if not
	 *                  specified, a clientId passed in constructing the Rest interface will be used
	 *
	 * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 */
	Auth.prototype.createTokenRequest = function(tokenParams, authOptions, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			authOptions = tokenParams = null;
		} else if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = null;
		}
		if(!callback && this.client.options.promises) {
			return Utils.promisify(this, 'createTokenRequest', arguments);
		}

		/* RSA9h: if authOptions passed in, they're used instead of stored, don't merge them */
		authOptions = authOptions || this.authOptions;
		tokenParams = tokenParams || Utils.copy(this.tokenParams);

		var key = authOptions.key;
		if(!key) {
			callback(new ErrorInfo('No key specified', 40101, 403));
			return;
		}
		var keyParts = key.split(':'),
			keyName = keyParts[0],
			keySecret = keyParts[1];

		if(!keySecret) {
			callback(new ErrorInfo('Invalid key specified', 40101, 403));
			return;
		}

		if(tokenParams.clientId === '') {
			callback(new ErrorInfo('clientId can’t be an empty string', 40012, 400));
			return;
		}

		if('capability' in tokenParams) {
			tokenParams.capability = c14n(tokenParams.capability);
		}

		var request = Utils.mixin({ keyName: keyName }, tokenParams),
			clientId = tokenParams.clientId || '',
			ttl = tokenParams.ttl || '',
			capability = tokenParams.capability || '',
			self = this;

		(function(authoriseCb) {
			if(request.timestamp) {
				authoriseCb();
				return;
			};
			self.getTimestamp(authOptions && authOptions.queryTime, function(err, time) {
				if(err) {callback(err); return;}
				request.timestamp = time;
				authoriseCb();
			});
		})(function() {
			/* nonce */
			/* NOTE: there is no expectation that the client
			 * specifies the nonce; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			var nonce = request.nonce || (request.nonce = random()),
				timestamp = request.timestamp;

			var signText
			=	request.keyName + '\n'
			+	ttl + '\n'
			+	capability + '\n'
			+	clientId + '\n'
			+	timestamp + '\n'
			+	nonce + '\n';

			/* mac */
			/* NOTE: there is no expectation that the client
			 * specifies the mac; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			request.mac = request.mac || hmac(signText, keySecret);

			Logger.logAction(Logger.LOG_MINOR, 'Auth.getTokenRequest()', 'generated signed request');
			callback(null, request);
		});
	};

	/**
	 * Get the auth query params to use for a websocket connection,
	 * based on the current auth parameters
	 */
	Auth.prototype.getAuthParams = function(callback) {
		if(this.method == 'basic')
			callback(null, {key: this.key});
		else
			this._ensureValidAuthCredentials(false, function(err, tokenDetails) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {access_token: tokenDetails.token});
			});
	};

	/**
	 * Get the authorization header to use for a REST or comet request,
	 * based on the current auth parameters
	 */
	Auth.prototype.getAuthHeaders = function(callback) {
		if(this.method == 'basic') {
			callback(null, {authorization: 'Basic ' + this.basicKey});
		} else {
			this._ensureValidAuthCredentials(false, function(err, tokenDetails) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {authorization: 'Bearer ' + toBase64(tokenDetails.token)});
			});
		}
	};

	/**
	 * Get the current time based on the local clock,
	 * or if the option queryTime is true, return the server time.
	 * The server time offset from the local time is stored so that
	 * only one request to the server to get the time is ever needed
	 */
	Auth.prototype.getTimestamp = function(queryTime, callback) {
		if (!this.isTimeOffsetSet() && (queryTime || this.authOptions.queryTime)) {
			this.client.time(callback);
		} else {
			callback(null, this.getTimestampUsingOffset());
		}
	};

	Auth.prototype.getTimestampUsingOffset = function() {
		return Utils.now() + (this.client.serverTimeOffset || 0);
	};

	Auth.prototype.isTimeOffsetSet = function() {
		return this.client.serverTimeOffset !== null;
	};

	Auth.prototype._saveBasicOptions = function(authOptions) {
		this.method = 'basic';
		this.key = authOptions.key;
		this.basicKey = toBase64(authOptions.key);
		this.authOptions = authOptions || {};
		if('clientId' in authOptions) {
			this._userSetClientId(authOptions.clientId);
		}
	}

	Auth.prototype._saveTokenOptions = function(tokenParams, authOptions) {
		this.method = 'token';

		if(tokenParams) {
			/* We temporarily persist tokenParams.timestamp in case a new token needs
			 * to be requested, then null it out in the callback of
			 * _ensureValidAuthCredentials for RSA10g compliance */
			this.tokenParams = tokenParams;
		}

		if(authOptions) {
			/* normalise */
			if(authOptions.token) {
				/* options.token may contain a token string or, for convenience, a TokenDetails */
				authOptions.tokenDetails = (typeof(authOptions.token) === 'string') ? {token: authOptions.token} : authOptions.token;
			}

			if(authOptions.tokenDetails) {
				this.tokenDetails = authOptions.tokenDetails;
			}

			if('clientId' in authOptions) {
				this._userSetClientId(authOptions.clientId);
			}

			this.authOptions = authOptions;
		}
	};

	/* @param forceSupersede: force a new token request even if there's one in
	 * progress, making all pending callbacks wait for the new one */
	Auth.prototype._ensureValidAuthCredentials = function(forceSupersede, callback) {
		var self = this,
			token = this.tokenDetails;

		if(token) {
			if(this._tokenClientIdMismatch(token.clientId)) {
				/* 403 to trigger a permanently failed client - RSA15c */
				callback(new ErrorInfo('Mismatch between clientId in token (' + token.clientId + ') and current clientId (' + this.clientId + ')', 40102, 403));
				return;
			}
			/* RSA4b1 -- if we have a server time offset set already, we can
			 * autoremove expired tokens. Else just use the cached token. If it is
			 * expired Ably will tell us and we'll discard it then. */
			if(!this.isTimeOffsetSet() || !token.expires || (token.expires >= this.getTimestampUsingOffset())) {
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
				callback(null, token);
				return;
			}
			/* expired, so remove and fallthrough to getting a new one */
			Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
			this.tokenDetails = null;
		}

		(this.waitingForTokenRequest || (this.waitingForTokenRequest = Multicaster())).push(callback);
		if(this.currentTokenRequestId !== null && !forceSupersede) {
			return;
		}

		/* Request a new token */
		var tokenRequestId = this.currentTokenRequestId = getTokenRequestId();
		this.requestToken(this.tokenParams, this.authOptions, function(err, tokenResponse) {
			if(self.currentTokenRequestId > tokenRequestId) {
				Logger.logAction(Logger.LOG_MINOR, 'Auth._ensureValidAuthCredentials()', 'Discarding token request response; overtaken by newer one');
				return;
			}
			self.currentTokenRequestId = null;
			var callbacks = self.waitingForTokenRequest || noop;
			self.waitingForTokenRequest = null;
			if(err) {
				callbacks(err);
				return;
			}
			callbacks(null, (self.tokenDetails = tokenResponse));
		});
	};


	/* User-set: check types, '*' is disallowed, throw any errors */
	Auth.prototype._userSetClientId = function(clientId) {
		if(!(typeof(clientId) === 'string' || clientId === null)) {
			throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
		} else if(clientId === '*') {
			throw new ErrorInfo('Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorize(), pass it in as a tokenParam: authorize({clientId: "*"}, authOptions)', 40012, 400);
		} else {
			var err = this._uncheckedSetClientId(clientId);
			if(err) throw err;
		}
	};

	/* Ably-set: no typechecking, '*' is allowed but not set on this.clientId), return errors to the caller */
	Auth.prototype._uncheckedSetClientId = function(clientId) {
		if(this._tokenClientIdMismatch(clientId)) {
			/* Should never happen in normal circumstances as realtime should
			 * recognise mismatch and return an error */
			var msg = 'Unexpected clientId mismatch: client has ' + this.clientId + ', requested ' + clientId;
			var err = new ErrorInfo(msg, 40102, 401);
			Logger.logAction(Logger.LOG_ERROR, 'Auth._uncheckedSetClientId()', msg);
			return err;
		} else {
			/* RSA7a4: if options.clientId is provided and is not
			 * null, it overrides defaultTokenParams.clientId */
			this.clientId = this.tokenParams.clientId = clientId;
			return null;
		}
	};

	Auth.prototype._tokenClientIdMismatch = function(tokenClientId) {
		return this.clientId &&
			(this.clientId !== '*') &&
			tokenClientId &&
			(tokenClientId !== '*') &&
			(this.clientId !== tokenClientId);
	};

	Auth.isTokenErr = function(error) {
		return error.code && (error.code >= 40140) && (error.code < 40150);
	};

	return Auth;
})();
