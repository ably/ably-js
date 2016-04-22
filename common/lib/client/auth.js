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

	function containsAuthInfo(options) {
		return options.authUrl ||
		  options.authCallback ||
		  options.token        ||
		  options.tokenDetails ||
		  options.key;
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
			 (options.clientId     ||
			  options.authCallback ||
			  options.authUrl      ||
			  options.token        ||
			  options.tokenDetails))
	}

	function Auth(client, options) {
		this.client = client;
		this.tokenParams = options.defaultTokenParams || {};

		if(useTokenAuth(options)) {
			/* Token auth */
			if(options.key && !hmac) {
				var msg = 'client-side token request signing not supported';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new Error(msg);
			}
			this._saveTokenOptions(options.defaultTokenParams, options);
			logAndValidateTokenAuthMethod(this.authOptions);
		} else {
			/* Basic auth */
			if(options.clientId || !options.key) {
				var msg = 'Cannot authenticate with basic auth' +
					(options.clientId ? ' as a clientId implies token auth' :
					 (!options.key ? ' as no key was given' : ''));
					 Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
					 throw new Error(msg);
			}
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
			this._saveBasicOptions(options);
		}
	}

	/**
	 * Instructs the library to use token auth, storing the tokenParams and
	 * authOptions given as the new defaults for subsequent use.
	 * Ensures a valid token is present, requesting one if necessary or if
	 * explicitly requested.
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
	 * - force       (optional) boolean indicating that a new token should be requested,
	 *               even if a current token is still valid.
	 *
	 * - tokenDetails: (optional) object: An authenticated TokenDetails object.
	 *
	 * - token:        (optional) string: the `token` property of a tokenDetails object
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
	 *
	 * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
	 *                  requestToken request
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
		callback = callback || noop;
		var self = this;

		/* RSA10a: authorise() call implies token auth. If a key is passed it, we
		 * just check if it doesn't clash and assume we're generating a token from it */
		if(authOptions && authOptions.key && (this.key !== authOptions.key)) {
			throw new ErrorInfo('Unable to update auth options with incompatible key', 40102, 401);
		}
		this._saveTokenOptions(tokenParams, authOptions);

		/* _save normalises the tokenParams and authOptions and updates the auth
		 * object. All subsequent operations should use the values on `this`,
		 * not the passed in ones. */

		logAndValidateTokenAuthMethod(this.authOptions);

		this._ensureValidAuthCredentials(function(err, tokenDetails) {
			if(self.force && !err && (self.client instanceof Realtime)) {
				self.client.connection.connectionManager.onAuthUpdated();
			}
			callback(err, tokenDetails);
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

		/* merge supplied options with the already-known options */
		authOptions = Utils.mixin(Utils.copy(this.authOptions), authOptions);
		tokenParams = tokenParams || Utils.copy(this.tokenParams);
		callback = callback || noop;
		var format = authOptions.format || 'json';

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback, client = this.client;

		if(authOptions.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authCallback');
			tokenRequestCallback = authOptions.authCallback;
		} else if(authOptions.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authUrl');
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
			var msg = "Need a new token, but authOptions does not include any way to request one";
			Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
			callback(new ErrorInfo(msg, 40101, 401));
			return;
		}

		/* normalise token params */
		if('capability' in tokenParams)
			tokenParams.capability = c14n(tokenParams.capability);

		var client = this.client;
		var tokenRequest = function(signedTokenParams, tokenCb) {
			var requestHeaders,
				keyName = signedTokenParams.keyName,
				tokenUri = function(host) { return client.baseUri(host) + '/keys/' + keyName + '/requestToken';};

			if(Http.post) {
				requestHeaders = Utils.defaultPostHeaders(format);
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending POST; ' + tokenUri + '; Token params: ' + JSON.stringify(signedTokenParams));
				signedTokenParams = (format == 'msgpack') ? msgpack.encode(signedTokenParams, true): JSON.stringify(signedTokenParams);
				Http.post(client, tokenUri, requestHeaders, signedTokenParams, null, tokenCb);
			} else {
				requestHeaders = Utils.defaultGetHeaders();
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Logger.logAction(Logger.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending GET; ' + tokenUri + '; Token params: ' + JSON.stringify(signedTokenParams));
				Http.get(client, tokenUri, requestHeaders, signedTokenParams, tokenCb);
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

		authOptions = Utils.mixin(Utils.copy(this.authOptions), authOptions);
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

	/**
	 * Get the current time based on the local clock,
	 * or if the option queryTime is true, return the server time.
	 * The server time offset from the local time is stored so that
	 * only one request to the server to get the time is ever needed
	 */
	Auth.prototype.getTimestamp = function(queryTime, callback) {
		var offsetSet = !isNaN(parseInt(this.client.serverTimeOffset));
		if (!offsetSet && (queryTime || this.authOptions.queryTime)) {
			this.client.time(function(err, time) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, time);
			});
		} else {
			callback(null, Utils.now() + (this.client.serverTimeOffset || 0));
		}
	};

	Auth.prototype._saveBasicOptions = function(authOptions) {
		this.method = 'basic';
		this.key = authOptions.key;
		this.basicKey = toBase64(authOptions.key);
		this.authOptions = authOptions || {};
		this.authOptions.force = false;
		if('clientId' in authOptions) {
			this._userSetClientId(authOptions.clientId);
		}
	}

	Auth.prototype._saveTokenOptions = function(tokenParams, authOptions) {
		this.method = 'token';

		this.tokenParams = tokenParams || this.tokenParams || {};

		/* If an authOptions object is passed in that contains new auth info (ie
		* isn't just {force: true} or something), it becomes the new default, with
		* the exception of the force attribute (RSA10g), which is set anew on each
		* call to authorise (defaulting to false) */
		this.force = false;
		if(authOptions) {
			this.force = authOptions.force;

			if(containsAuthInfo(authOptions)) {
				this.authOptions = authOptions || {};
				this.authOptions.force = false;
			} else if('queryTime' in authOptions) {
				/* queryTime isn't an authInfo so can't replace the current
				* authOptions, but per RSA10g, should still be stored */
				this.authOptions.queryTime = authOptions.queryTime;
			}

			if(this.force) {
				/* get rid of current token even if still valid */
				this.tokenDetails = null;
			}

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
		}
	};

	Auth.prototype._ensureValidAuthCredentials = function(callback) {
		var self = this,
			token = this.tokenDetails;

		var requestToken = function() {
			self.requestToken(self.tokenParams, self.authOptions, function(err, tokenResponse) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, (self.tokenDetails = tokenResponse));
			});
		};

		if(token) {
			if(this._tokenClientIdMismatch(token.clientId)) {
				callback(new ErrorInfo('ClientId in token was ' + token.clientId + ', but library was instantiated with clientId ' + this.clientId, 40102, 401));
				return;
			}
			this.getTimestamp(self.authOptions && self.authOptions.queryTime, function(err, time) {
				if(err)
					callback(err);

				if(token.expires === undefined || (token.expires >= time)) {
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
					callback(null, token);
					return;
				} else {
					/* expired, so remove */
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
					self.tokenDetails = null;
				}
				requestToken();
			});
		} else {
			requestToken();
		}
	};


	/* User-set: check types, '*' is disallowed, throw any errors */
	Auth.prototype._userSetClientId = function(clientId) {
		if(!(typeof(clientId) === 'string' || clientId === null)) {
			throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
		} else if(clientId === '*') {
			throw new ErrorInfo('Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorise(), pass it in as a tokenParam: authorise({clientId: "*"}, authOptions)', 40012, 400);
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
		} else if(clientId === '*') {
			this.tokenParams.clientId = clientId;
		} else {
			/* RSA7a4: if options.clientId is provided and is not
			 * null, it overrides defaultTokenParams.clientId */
			this.clientId = this.tokenParams.clientId = clientId;
			return null;
		}
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
