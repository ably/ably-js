var Auth = (function() {
	var isBrowser = (typeof(window) == 'object');
	var crypto = isBrowser ? null : require('crypto');
	function noop() {}
	function random() { return ('000000' + Math.floor(Math.random() * 1E16)).slice(-16); }
	function timestamp() { return Math.floor(Date.now()/1000); }
	function toBase64(str) { return (new Buffer(str, 'ascii')).toString('base64'); }

	var hmac = undefined;
	if(isBrowser && window.CryptoJS && CryptoJS.HmacSHA1 && CryptoJS.enc.Base64)
		hmac = function(text, key) {
			return CryptoJS.HmacSHA1(text, key).toString(CryptoJS.enc.Base64);
		};
	if(!isBrowser)
		hmac = function(text, key) {
			var inst = crypto.createHmac('SHA1', key);
			inst.update(text);
			return inst.digest('base64');
		};

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
		this.tokenUri = rest.baseUri + '/authorise';
		var authOptions = this.authOptions = {};
		if(options.key) {
			var parts = options.key.split(':');
			if(parts.length != 2) {
				var msg = 'invalid key parameter';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new Error(msg);
			}
			this.key = options.key;
			this.keyId = parts[0];
			this.keyValue = parts[1];
			if(!options.clientId) {
				/* anonymous client */
				Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
				this.method = 'basic';
				authOptions.key = options.key;
				authOptions.key_id = this.keyId;
				authOptions.key_value = this.keyValue;
				return;
			}
			/* token auth, but we have the key so we can authorise
			 * ourselves */
			if(!hmac)
				throw new Error('Auth(): client-side token request signing not supported');
		}
		this.method = 'token';
		if(options.authToken)
			this.token = {id: options.authToken};
		if(options.auth_callback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
			authOptions.auth_callback = options.authCallback;
		} else if(options.authURL) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authURL');
			authOptions.auth_url = options.auth_url;
		} else if(options.key) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using token auth with client-side signing');
			authOptions.key = options.key;
			authOptions.key_id = this.keyId;
			authOptions.key_value = this.keyValue;
		} else if(this.token) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
		} else {
			throw new Error('Auth(): options must include valid authentication parameters');
		}
	}

	/**
	 * Request an access token
	 * @param params
	 * an object containing the request params:
	 * - key:        (optional) the key to use in the format keyId:keyValue; if not
	 *               specified, a key passed in constructing the Rest interface will be used
	 *
	 * - expires:    (optional) the requested life of the token in seconds. If none is specified
	 *               a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *               exceeeding that lifetime will be rejected with an error.
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
	 * - queryTime   (optional) boolean indicating that the aardvark system should be
	 *               queried for the current time when none is specified explicitly
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorise = function(options, callback) {
		if(this.token) {
			if(this.token.expires > timestamp()) {
				if(!options.force) {
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + this.token.expires);
					callback();
					return;
				}
			} else {
				/* expired, so remove */
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
				delete this.token;
			}
		}
		var self = this;
		this.requestToken(options, function(err, tokenResponse) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, (self.token = tokenResponse));
		});
	};

	/**
	 * Request an access token
	 * @param options
	 * an object containing the request options:
	 * - key_id:        the id of the key to use.
	 *
	 * - key_value:     (optional) the secret value of the key; if not
	 *                  specified, a key passed in constructing the Rest interface will be used; or
	 *                  if no key is available, a token request callback or url will be used.
	 *
	 * - auth_callback: (optional) a javascript callback to be used, passing a set of token
	 *                  request params, to get a signed token request.
	 *
	 * - auth_url:      (optional) a URL to be used to GET or POST a set of token request
	 *                  params, to obtain a signed token request.
	 *
	 * - auth_headers:  (optional) a set of application-specific headers to be added to any request
	 *                  made to the auth_url.
	 *
	 * - auth_params:   (optional) a set of application-specific query params to be added to any
	 *                  request made to the auth_url.
	 *
	 * - expires:       (optional) the requested life of the token in seconds. If none is specified
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
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.requestToken = function(options, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(options) == 'function' && !callback) {
			callback = options;
			options = {};
		}
		options = options || {};
		callback = callback || noop;

		/* merge supplied options with the already-known options */
		options = Utils.mixin(Utils.copy(this.authOptions), options);

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback;
		if(options.auth_callback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_callback');
			tokenRequestCallback = options.auth_callback;
		} else if(options.auth_url) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_url');
			tokenRequestCallback = function(params, cb) {
				Http.get(options.auth_url, options.auth_headers || {}, Utils.mixin(params, options.auth_params), cb);
			};
		} else if(options.key) {
			var parts = options.key.split(':');
			options.key_id = parts[0];
			options.key_value = parts[1];
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(Utils.mixin(Utils.copy(options), params), cb); };
		} else {
			throw new Error('Auth.requestToken(): options must include valid authentication parameters');
		}

		/* now set up the request params */
		var requestParams = {};
		var clientId = options.client_id || this.rest.clientId;
		if(clientId)
			requestParams.client_id = clientId;

		var expires = options.expires || '';
		if('expires' in options)
			requestParams.expires = expires;

		if('capability' in options)
			requestParams.capability = c14n(options.capability);

		var self = this;
		var tokenRequest = function(ob, tokenCb) {
			if(Http.post)
				Http.post(self.tokenUri, null, ob, null, tokenCb);
			else
				Http.get(self.tokenUri, null, ob, tokenCb);
		};
		tokenRequestCallback(requestParams, function(err, signedRequest) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + err);
				callback(err);
				return;
			}
			tokenRequest(signedRequest, function(err, tokenResponse) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + err);
					callback(err);
					return;
				}
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
	 * Valid token request options are:
	 * - key_id:        the id of the key to use.
	 *
	 * - expires:       (optional) the requested life of the token in seconds. If none is specified
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
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 */
	Auth.prototype.createTokenRequest = function(options, callback) {
		var keyId = options.key_id;
		var keyValue = options.key_value;
		if(!keyId || !keyValue) {
			callback(new Error('No key specified'));
			return;
		}
		var request = { id: keyId };
		var clientId = options.clientId || '';
		if(clientId)
			request.client_id = options.clientId;

		var expires = options.expires || '';
		if(expires)
			request.expires = expires;

		var capability = options.capability || '';
		if(capability)
			request.capability = capability;

		var rest = this.rest;
		(function(authoriseCb) {
			if(options.timestamp) {
				authoriseCb();
				return;
			}
			if(options.queryTime) {
				rest.time(function(err, time) {
					if(err) {callback(err); return;}
					options.timestamp = Math.floor(time/1000);
					authoriseCb();
				});
				return;
			}
			options.timestamp = Math.floor(Date.now()/1000);
			authoriseCb();
		})(function() {
			/* nonce */
			/* NOTE: there is no expectation that the client
			 * specifies the nonce; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			var nonce = request.nonce = (options.nonce || random());

			var timestamp = request.timestamp = options.timestamp;

			var signText
			=	request.id + '\n'
			+	expires + '\n'
			+	capability + '\n'
			+	clientId + '\n'
			+	timestamp + '\n'
			+	nonce + '\n';
			/* mac */
			/* NOTE: there is no expectation that the client
			 * specifies the mac; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			request.mac = options.mac || hmac(signText, keyValue);

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
			callback(null, {key_id: this.keyId, key_value: this.keyValue});
		else
			this.getToken(false, function(err, token) {
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
			var keyStr = this.key || this.key_id + ':' + this.key_value;
			callback(null, {authorization: 'Basic ' + toBase64(keyStr)});
		} else {
			this.authorise({}, function(err, token) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {authorization: 'Bearer ' + token.id});
			});
		}
	};

	return Auth;
})();
