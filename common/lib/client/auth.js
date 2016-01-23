var Auth = (function() {
	var isBrowser = (typeof(window) == 'object');
	var crypto = isBrowser ? null : require('crypto');
	var msgpack = isBrowser ? window.Ably.msgpack : require('msgpack-js');
	function noop() {}
	function random() { return ('000000' + Math.floor(Math.random() * 1E16)).slice(-16); }

	var hmac, toBase64;
	if(isBrowser) {
		toBase64 = Base64.encode;
		hmac = function(text, key) {
			return CryptoJS.HmacSHA256(text, key).toString(CryptoJS.enc.Base64);
		};
	} else {
		toBase64 = function(str) { return (new Buffer(str, 'ascii')).toString('base64'); };
		hmac = function(text, key) {
			var inst = crypto.createHmac('SHA256', key);
			inst.update(text);
			return inst.digest('base64');
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

	function Auth(rest, options) {
		this.rest = rest;
		this.tokenParams = options.defaultTokenParams || {};

		/* RSA7a4: if options.clientId is provided and is not
		 * null, it overrides defaultTokenParams.clientId */
		if(options.clientId) {
			this.tokenParams.clientId = options.clientId;
			this.clientId = options.clientId
		}

		/* decide default auth method */
		var key = options.key;
		if(key) {
			if(!options.clientId && !options.useTokenAuth) {
				/* we have the key and do not need to authenticate the client,
				 * so default to using basic auth */
				Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
				this.method = 'basic';
				this.key = key;
				this.basicKey = toBase64(key);
				return;
			}
			/* token auth, but we have the key so we can authorise
			 * ourselves */
			if(!hmac) {
				var msg = 'client-side token request signing not supported';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new Error(msg);
			}
		}
		if('useTokenAuth' in options && !options.useTokenAuth) {
			var msg = 'option useTokenAuth was falsey, but basic auth cannot be used' +
				(options.clientId ? ' as a clientId implies token auth' :
				(!options.key ? ' as a key was not given' : ''));
			Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
			throw new Error(msg);
		}
		/* using token auth, but decide the method */
		this.method = 'token';
		if(options.token) {
			/* options.token may contain a token string or, for convenience, a TokenDetails */
			options.tokenDetails = (typeof(options.token) === 'string') ? {token: options.token} : options.token;
		}
		this.tokenDetails = options.tokenDetails;

		if(options.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
		} else if(options.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
		} else if(options.keySecret) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
		} else if(options.tokenDetails) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
		} else {
			var msg = 'options must include valid authentication parameters';
			Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
			throw new Error(msg);
		}
	}

	/**
	 * Ensure valid auth credentials are present. This may rely in an already-known
	 * and valid token, and will obtain a new token if necessary or explicitly
	 * requested.
	 * Authorisation will use the parameters supplied on construction except
	 * where overridden with the options supplied in the call.
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
	 * an object containing the request params:
	 * - key:        (optional) the key to use; if not specified, a key
	 *               passed in constructing the Rest interface may be used
	 *
	 * - queryTime   (optional) boolean indicating that the Ably system should be
	 *               queried for the current time when none is specified explicitly.
	 *
	 * - force       (optional) boolean indicating that a new token should be requested,
	 *               even if a current token is still valid.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorise = function(tokenParams, authOptions, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			authOptions = tokenParams = null;
		} else if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = null;
		}

		var token = this.tokenDetails;
		if(token) {
			if(this._tokenClientIdMismatch(token.clientId)) {
				callback(new ErrorInfo('ClientId in token was ' + token.clientId + ', but library was instantiated with clientId ' + this.clientId, 40102, 401));
				return;
			}
			if(token.expires === undefined || (token.expires > this.getTimestamp())) {
				if(!(authOptions && authOptions.force)) {
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
					callback(null, token);
					return;
				}
			} else {
				/* expired, so remove */
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
				this.tokenDetails = null;
			}
		}
		var self = this;
		this.requestToken(tokenParams, authOptions, function(err, tokenResponse) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, (self.tokenDetails = tokenResponse));
		});
	};

	/**
	 * Request an access token
	 * @param authOptions
	 * an object containing the request options:
	 * - key:           the key to use.
	 *
	 * - authCallback:  (optional) a javascript callback to be called to get auth information.
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
	 * - requestHeaders (optional, unsuported, for testing only) extra headers to add to the
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

		/* merge supplied options with the already-known options */
		authOptions = Utils.mixin(Utils.copy(this.rest.options), authOptions);
		tokenParams = tokenParams || Utils.copy(this.tokenParams);
		callback = callback || noop;
		var format = authOptions.format || 'json';

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback, rest = this.rest;
		if(authOptions.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_callback');
			tokenRequestCallback = authOptions.authCallback;
		} else if(authOptions.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_url');
			/* if no authParams given, check if they were given in the URL */
			if(!authOptions.authParams) {
				var queryIdx = authOptions.authUrl.indexOf('?');
				if(queryIdx > -1) {
					authOptions.authParams = Utils.parseQueryString(authOptions.authUrl.slice(queryIdx));
					authOptions.authUrl = authOptions.authUrl.slice(0, queryIdx);
				}
			}
			tokenRequestCallback = function(params, cb) {
				var authHeaders = Utils.mixin({accept: 'application/json'}, authOptions.authHeaders),
						authParams = Utils.mixin(params, authOptions.authParams);
				var authUrlRequestCallback = function(err, body, headers, unpacked) {
					if (err) {
						Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received Error; ' + JSON.stringify(err));
					} else {
						Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received; body: ' + (BufferUtils.isBuffer(body) ? body.toString() : body));
					}
					if(err || unpacked) return cb(err, body);
					if(BufferUtils.isBuffer(body)) body = body.toString();
					if(headers['content-type'] && headers['content-type'].indexOf('application/json') > -1) {
						try {
							body = JSON.parse(body);
						} catch(e) {
							cb(new ErrorInfo('Unexpected error processing authURL response; err = ' + e.message, 40000, 400));
							return;
						}
					}
					cb(null, body);
				};
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Sending; ' + authOptions.authUrl + '; Params: ' + JSON.stringify(authParams));
				if(authOptions.authMethod && authOptions.authMethod.toLowerCase() === 'post') {
					/* send body form-encoded */
					var headers = authHeaders || {};
					headers['content-type'] = 'application/x-www-form-urlencoded';
					var body = Utils.toQueryString(authParams).slice(1); /* slice is to remove the initial '?' */
					Http.postUri(rest, authOptions.authUrl, headers, body, {}, authUrlRequestCallback);
				} else {
					Http.getUri(rest, authOptions.authUrl, authHeaders || {}, authParams, authUrlRequestCallback);
				}
			};
		} else if(authOptions.key) {
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(params, authOptions, cb); };
		} else {
			var msg = "Need a new token, but authOptions does not include any way to request one";
			Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
			callback(new ErrorInfo(msg, 40101, 401));
			return;
		}

		/* normalise token params */
		if('capability' in tokenParams)
			tokenParams.capability = c14n(tokenParams.capability);

		var rest = this.rest;
		var tokenRequest = function(signedTokenParams, tokenCb) {
			var requestHeaders,
				keyName = signedTokenParams.keyName,
				tokenUri = function(host) { return rest.baseUri(host) + '/keys/' + keyName + '/requestToken';};

			if(Http.post) {
				requestHeaders = Utils.defaultPostHeaders(format);
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending POST; ' + tokenUri + '; Token params: ' + JSON.stringify(signedTokenParams));
				signedTokenParams = (format == 'msgpack') ? msgpack.encode(signedTokenParams, true): JSON.stringify(signedTokenParams);
				Http.post(rest, tokenUri, requestHeaders, signedTokenParams, null, tokenCb);
			} else {
				requestHeaders = Utils.defaultGetHeaders();
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending GET; ' + tokenUri + '; Token params: ' + JSON.stringify(signedTokenParams));
				Http.get(rest, tokenUri, requestHeaders, signedTokenParams, tokenCb);
			}
		};
		tokenRequestCallback(tokenParams, function(err, tokenRequestOrDetails) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + Utils.inspectError(err));
				if(!('code' in err))
					err.code = 40170;
				if(!('statusCode' in err))
					err.statusCode = 401;
				callback(err);
				return;
			}
			/* the response from the callback might be a token string, a signed request or a token details */
			if(typeof(tokenRequestOrDetails) === 'string') {
				callback(null, {token: tokenRequestOrDetails});
				return;
			}
			if('issued' in tokenRequestOrDetails) {
				callback(null, tokenRequestOrDetails);
				return;
			}
			/* it's a token request, so make the request */
			tokenRequest(tokenRequestOrDetails, function(err, tokenResponse, headers, unpacked) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + Utils.inspectError(err));
					callback(err);
					return;
				}
				if(!unpacked) tokenResponse = (format == 'msgpack') ? msgpack.decode(tokenResponse) : JSON.parse(tokenResponse);
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
	 * - requestHeaders (optional, unsuported, for testing only) extra headers to add to the
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

		authOptions = Utils.mixin(Utils.copy(this.rest.options), authOptions);
		tokenParams = tokenParams || Utils.copy(this.tokenParams);

		var key = authOptions.key;
		if(!key) {
			callback(new Error('No key specified'));
			return;
		}
		var keyParts = key.split(':'),
			keyName = keyParts[0],
			keySecret = keyParts[1];

		if(!keySecret) {
			callback(new Error('Invalid key specified'));
			return;
		}

		if(tokenParams.clientId === '') {
			callback(new ErrorInfo('clientId can’t be an empty string', 40012, 400));
			return;
		}

		tokenParams.capability = c14n(tokenParams.capability);

		var request = Utils.mixin({ keyName: keyName }, tokenParams),
			clientId = tokenParams.clientId || '',
			ttl = tokenParams.ttl || '',
			capability = tokenParams.capability,
			rest = this.rest,
			self = this;

		(function(authoriseCb) {
			if(request.timestamp) {
				authoriseCb();
				return;
			}
			if(authOptions.queryTime || (typeof queryTime == 'undefined' && Rest.prototype.serverTimeOffset === null )) {
				rest.time(function(err, time) {
					if(err) {callback(err); return;}
					request.timestamp = time;
					authoriseCb();
				});
				return;
			}
			request.timestamp = self.getTimestamp();
			authoriseCb();
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
			this.authorise(null, null, function(err, tokenDetails) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {access_token:tokenDetails.token});
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
			this.authorise(null, null, function(err, tokenDetails) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {authorization: 'Bearer ' + toBase64(tokenDetails.token)});
			});
		}
	};

	Auth.prototype.getTimestamp = function() {
		return Utils.now() + (this.rest.serverTimeOffset || 0);
	};

	Auth.prototype._tokenClientIdMismatch = function(tokenClientId) {
		return this.clientId &&
			tokenClientId &&
			(tokenClientId !== '*') &&
			(this.clientId !== tokenClientId);
	};

	Auth.isTokenErr = function(error) {
		return error.code && (error.code >= 40140) && (error.code < 40150);
	};

	return Auth;
})();
