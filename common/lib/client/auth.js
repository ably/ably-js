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
		this.tokenParams = {};

		/* decide default auth method */
		var key = options.key;
		if(key) {
			if(!options.clientId) {
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
		/* using token auth, but decide the method */
		this.method = 'token';
		if(options.authToken)
			this.token = {id: options.authToken};
		if(options.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
		} else if(options.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
		} else if(options.keySecret) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
		} else if(this.token) {
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
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 *
	 * - ttl:        (optional) the requested life of any new token in seconds. If none
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
	 * - timestamp:  (optional) the time in seconds since the epoch. If none is specified,
	 *               the system will be queried for a time value to use.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorise = function(authOptions, tokenParams, callback) {
		var token = this.token;
		if(token) {
			if(token.expires === undefined || (token.expires > this.getTimestamp())) {
				if(!(authOptions && authOptions.force)) {
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
					callback(null, token);
					return;
				}
			} else {
				/* expired, so remove */
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
				this.token = null;
			}
		}
		var self = this;
		this.requestToken(authOptions, tokenParams, function(err, tokenResponse) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, (self.token = tokenResponse));
		});
	};

	/**
	 * Request an access token
	 * @param authOptions
	 * an object containing the request options:
	 * - key:           the key to use.
	 *
	 * - authCallback:  (optional) a javascript callback to be used, passing a set of token
	 *                  request params, to get a signed token request.
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
	 * - ttl:       (optional) the requested life of the token in seconds. If none is specified
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
	 * - timestamp:     (optional) the time in seconds since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.requestToken = function(authOptions, tokenParams, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = tokenParams = null;
		}
		else if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			tokenParams = authOptions;
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
			tokenRequestCallback = function(params, cb) {
				var authHeaders = Utils.mixin({accept: 'application/json'}, authOptions.authHeaders);
				Http.getUri(rest, authOptions.authUrl, authHeaders || {}, Utils.mixin(params, authOptions.authParams), function(err, body, headers, unpacked) {
					if(err) return cb(err);
					if(!unpacked) body = JSON.parse(body);
					cb(null, body);
				});
			};
		} else if(authOptions.key) {
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(authOptions, params, cb); };
		} else {
			throw new Error('Auth.requestToken(): authOptions must include valid authentication parameters');
		}

		/* normalise token params */
		if('capability' in tokenParams)
			tokenParams.capability = c14n(tokenParams.capability);

		var rest = this.rest;
		var tokenRequest = function(signedTokenParams, tokenCb) {
			var requestHeaders,
				keyName = signedTokenParams.id,
				tokenUri = function(host) { return rest.baseUri(host) + '/keys/' + keyName + '/requestToken';};

			if(Http.post) {
				requestHeaders = Utils.defaultPostHeaders(format);
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				signedTokenParams = (format == 'msgpack') ? msgpack.encode(signedTokenParams, true): JSON.stringify(signedTokenParams);
				Http.post(rest, tokenUri, requestHeaders, signedTokenParams, null, tokenCb);
			} else {
				requestHeaders = Utils.defaultGetHeaders();
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
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
			/* the response from the callback might be a signed request or a token details */
			if('issued_at' in tokenRequestOrDetails) {
				callback(null, tokenRequestOrDetails);
				return;
			}
			tokenRequest(tokenRequestOrDetails, function(err, tokenResponse, headers, unpacked) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + Utils.inspectError(err));
					callback(err);
					return;
				}
				if(!unpacked) tokenResponse = (format == 'msgpack') ? msgpack.decode(tokenResponse) : JSON.parse(tokenResponse);
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'token received');
				callback(null, tokenResponse.access_token);
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
	 * - key:           the key to use.
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * - requestHeaders (optional, unsuported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 * - ttl:       (optional) the requested life of the token in seconds. If none is specified
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
	 * - timestamp:     (optional) the time in seconds since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 */
	Auth.prototype.createTokenRequest = function(authOptions, tokenParams, callback) {
		authOptions = authOptions || this.rest.options;
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

		var request = Utils.mixin({ id: keyName }, tokenParams),
			clientId = tokenParams.clientId || '',
			ttl = tokenParams.ttl || '',
			capability = tokenParams.capability || '',
			rest = this.rest,
			self = this;

		(function(authoriseCb) {
			if(request.timestamp) {
				authoriseCb();
				return;
			}
			if(authOptions.queryTime) {
				rest.time(function(err, time) {
					if(err) {callback(err); return;}
					request.timestamp = Math.floor(time/1000);
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
			=	request.id + '\n'
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
			this.authorise(null, null, function(err, token) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {access_token:token.id});
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
			this.authorise(null, null, function(err, token) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {authorization: 'Bearer ' + toBase64(token.id)});
			});
		}
	};

	Auth.prototype.getTimestamp = function() {
		var time = Date.now() + (this.rest.serverTimeOffset || 0);
		return Math.floor(time / 1000);
	};

	return Auth;
})();
