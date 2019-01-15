"use strict";

define(['ably', 'shared_helper', 'async', 'globals'], function(Ably, helper, async, globals) {
	var currentTime, rest, exports = {},
		_exports = {},
		utils = helper.Utils,
		echoServer = 'https://echo.ably.io';

	var getServerTime = function(callback) {
		rest.time(function(err, time) {
			if(err) { callback(err); }
			callback(null, time);
		});
	};

	exports.setupauth = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			rest = helper.AblyRest({queryTime: true});
			getServerTime(function(err, time) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				currentTime = time;
				test.ok(true, 'Obtained time');
				test.done();
			});
		});
	};

	/*
	 * Base token generation case
	 */
	exports.authbase0 = function(test) {
		test.expect(1);
		rest.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(5);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.equal(tokenDetails.expires, 60*60*1000 + tokenDetails.issued, 'Verify default expiry period');
			test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Base token generation with options
	 */
	exports.authbase1 = function(test) {
		test.expect(1);
		rest.auth.requestToken(null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(4);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Generate token and init library with it
	 */
	exports.authbase2 = function(test) {
		test.expect(1);
		rest.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.ok((tokenDetails.token), 'Verify token value');
			try {
				var restInit = helper.AblyRest({ token: tokenDetails.token });
				test.done();
			} catch(e) {
				test.ok(false, helper.displayError(e));
				test.done();
			}
		});
	};

	/*
	 * Token generation with explicit timestamp
	 */
	exports.authtime0 = function(test) {
		test.expect(1);
		getServerTime(function(err, serverTime) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			rest.auth.requestToken({timestamp: serverTime}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				test.expect(4);
				test.ok((tokenDetails.token), 'Verify token value');
				test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
				test.done();
			});
		});
	};

	/*
	 * Token generation with explicit timestamp (invalid)
	 */
	exports.authtime1 = function(test) {
		test.expect(1);
		var badTime = utils.now() - 30*60*1000;
		rest.auth.requestToken({timestamp:badTime}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 401, 'Verify token request rejected with bad timestamp');
				test.done();
				return;
			}
			test.ok(false, 'Invalid timestamp, expected rejection');
			test.done();
		});
	};

	/*
	 * Token generation with system timestamp
	 */
	exports.authtime2 = function(test) {
		test.expect(1);
		rest.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(4);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Token generation with duplicate nonce
	 */
	exports.authnonce0 = function(test) {
		test.expect(1);
		getServerTime(function(err, serverTime) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			rest.auth.requestToken({timestamp:serverTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				rest.auth.requestToken({timestamp:serverTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
					if(err) {
						test.equal(err.statusCode, 401, 'Verify request rejected with duplicated nonce');
						test.done();
						return;
					}
					test.ok(false, 'Invalid nonce, expected rejection');
					test.done();
				});
			});
		});
	};

	/*
	 * Token generation with clientId
	 */
	exports.authclientid0 = function(test) {
		test.expect(1);
		var testClientId = 'test client id';
		rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(5);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.equal(tokenDetails.clientId, testClientId, 'Verify client id');
			test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Token generation with empty string clientId should error
	 */
	exports.authemptyclientid = function(test) {
		test.expect(1);
		rest.auth.requestToken({clientId: ''}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.code, 40012);
				test.done();
				return;
			}
			test.ok(false);
			test.done();
		});
	};

	/*
	 * Token generation with capability that subsets key capability
	 */
	exports.authcapability0 = function(test) {
		test.expect(1);
		var testCapability = {onlythischannel:['subscribe']};
		rest.auth.requestToken({capability:testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(4);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.deepEqual(JSON.parse(tokenDetails.capability), testCapability, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Token generation with specified key
	 */
	exports.authkey0 = function(test) {
		test.expect(1);
	var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};
	var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
		rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(5);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.equal(tokenDetails.keyName, helper.getTestApp().keys[1].keyName, 'Verify token key');
			test.deepEqual(JSON.parse(tokenDetails.capability), testCapability, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Token generation with explicit auth
	 */
	exports.authexplicit_simple = function(test) {
		test.expect(1);
		rest.auth.getAuthHeaders(function(err, authHeaders) {
			rest.auth.authOptions.requestHeaders = authHeaders;
			rest.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				test.expect(4);
				test.ok((tokenDetails.token), 'Verify token value');
				test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				test.equal(tokenDetails.keyName, helper.getTestApp().keys[0].keyName, 'Verify token key');
				test.done();
			});
		});
	};

	/*
	 * Token generation with explicit auth, different key
	 */
	exports.authexplicit_key = function(test) {
		test.expect(1);
		rest.auth.getAuthHeaders(function(err, authHeaders) {
	  var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};
	  var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
			rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				test.expect(5);
				test.ok((tokenDetails.token), 'Verify token value');
				test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				test.equal(tokenDetails.keyName, helper.getTestApp().keys[1].keyName, 'Verify token key');
				test.deepEqual(JSON.parse(tokenDetails.capability), testCapability, 'Verify token capability');
				test.done();
			});
		});
	};

	/*
	 * Token generation with invalid mac
	 */
	exports.authmac0 = function(test) {
		test.expect(1);
		rest.auth.requestToken({mac: '12345'}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 401, 'Verify request rejected with bad mac');
				test.done();
				return;
			}
			test.ok(false, 'Invalid mac, expected rejection');
			test.done();
		});
	};

	/*
	 * Token generation with defaultTokenParams set and no tokenParams passed in
	 */
	exports.authdefaulttokenparams0 = function(test) {
		test.expect(1);
		var rest1 = helper.AblyRest({defaultTokenParams: {ttl: 123, clientId: "foo"}});
		rest1.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.expect(3);
			test.ok((tokenDetails.token), 'Verify token value');
			test.equal(tokenDetails.clientId, 'foo', 'Verify client id from defaultTokenParams used');
			test.equal(tokenDetails.expires - tokenDetails.issued, 123, 'Verify ttl from defaultTokenParams used');
			test.done();
		});
	};

	/*
	 * Token generation: if tokenParams passed in, defaultTokenParams should be ignored altogether, not merged
	 */
	exports.authdefaulttokenparams1 = function(test) {
		test.expect(2);
		var rest1 = helper.AblyRest({defaultTokenParams: {ttl: 123, clientId: "foo"}});
		rest1.auth.requestToken({clientId: 'bar'}, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.equal(tokenDetails.clientId, 'bar', 'Verify client id passed in is used, not the one from defaultTokenParams');
			test.equal(tokenDetails.expires - tokenDetails.issued, 60 * 60 * 1000, 'Verify ttl from defaultTokenParams ignored completely, even though not overridden');
			test.done();
		});
	};

	/*
	 * authorize with different args
	 */
	exports.authauthorize = function(test) {
		test.expect(3);
		async.parallel([
			function(cb) {
				rest.auth.authorize(null, null, function(err, tokenDetails) {
					test.ok(tokenDetails.token, 'Check token obtained');
					cb(err);
				});
			},
			function(cb) {
				rest.auth.authorize(null, function(err, tokenDetails) {
					test.ok(tokenDetails.token, 'Check token obtained');
					cb(err);
				});
			},
			function(cb) {
				rest.auth.authorize(function(err, tokenDetails) {
					test.ok(tokenDetails.token, 'Check token obtained');
					cb(err);
				});
			}
		], function(err) {
			if(err) test.ok(false, "authorize returned an error: " + helper.displayError(err));
			test.done();
		});
	};

	/*
	 * Specify non-default ttl
	 */
	exports.authttl0 = function(test) {
		test.expect(1);
		rest.auth.requestToken({ttl:100*1000}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.equal(tokenDetails.expires, 100*1000 + tokenDetails.issued, 'Verify non-default expiry period');
			test.done();
		});
	};

	/*
	 * Excessive ttl
	 */
	exports.authttl1 = function(test) {
		test.expect(1);
		rest.auth.requestToken({ttl: 365*24*60*60*1000}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with excessive expiry');
				test.done();
				return;
			}
			test.ok(false, 'Excessive expiry, expected rejection');
			test.done();
		});
	};

	/*
	 * Negative ttl
	 */
	exports.authttl2 = function(test) {
		test.expect(1);
		rest.auth.requestToken({ttl: -1}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with negative expiry');
				test.done();
				return;
			}
			test.ok(false, 'Negative expiry, expected rejection');
			test.done();
		});
	};

	/*
	 * Invalid ttl
	 */
	exports.authttl3 = function(test) {
		test.expect(1);
		rest.auth.requestToken({ttl: 'notanumber'}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with invalid expiry');
				test.done();
				return;
			}
			test.ok(false, 'Invalid expiry, expected rejection');
			test.done();
		});
	};

	/*
	 * createTokenRequest uses the key it was initialized with if authOptions is null,
	 * and the token request includes all the fields it should include, but
	 * doesn't include ttl or capability by default
	 */
	exports.auth_createTokenRequest_given_key = function(test) {
		test.expect(6);
		rest.auth.createTokenRequest(null, null, function(err, tokenRequest) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.ok('mac' in tokenRequest, 'check tokenRequest contains a mac');
			test.ok('nonce' in tokenRequest, 'check tokenRequest contains a nonce');
			test.ok('timestamp' in tokenRequest, 'check tokenRequest contains a timestamp');
			test.ok(!('ttl' in tokenRequest), 'check tokenRequest does not contains a ttl by default');
			test.ok(!('capability' in tokenRequest), 'check tokenRequest does not contains capabilities by default');
			test.equal(tokenRequest.keyName, helper.getTestApp().keys[0].keyName);
			test.done();
		});
	};

	/*
	 * createTokenRequest: no authoptions, callback as 2nd param
	 */
	exports.auth_createTokenRequest_params0 = function(test) {
		test.expect(1);
		rest.auth.createTokenRequest(null, function(err, tokenRequest) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.equal(tokenRequest.keyName, helper.getTestApp().keys[0].keyName);
			test.done();
		});
	};

	/*
	 * createTokenRequest: no authoptions or tokenparams, callback as 1st param
	 */
	exports.auth_createTokenRequest_params1 = function(test) {
		test.expect(1);
		rest.auth.createTokenRequest(function(err, tokenRequest) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.equal(tokenRequest.keyName, helper.getTestApp().keys[0].keyName);
			test.done();
		});
	};

	/*
	 * createTokenRequest uses the key it was initialized with if authOptions does not have a "key" key
	 */
	exports.auth_createTokenRequest_given_key2 = function(test) {
		test.expect(1);
		rest.auth.createTokenRequest(function(err, tokenRequest) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.equal(tokenRequest.keyName, helper.getTestApp().keys[0].keyName);
			test.done();
		});
	};

	/*
	 * createTokenRequest given capability object JSON-stringifies it
	 */
	exports.auth_createTokenRequest_capability_object = function(test) {
		test.expect(1);
		var capability = {'*':['*']};
		rest.auth.createTokenRequest({capability: capability}, null, function(err, tokenRequest) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.deepEqual(JSON.parse(tokenRequest.capability), capability, 'Verify createTokenRequest has JSON-stringified capability');
			test.done();
		});
	};

	/* RSC1, RSC1a, RSC1c, RSA4f, RSA8c, RSA3d
	 * Tests the different combinations of authParams declared above, with valid keys
	 */
	exports.rest_jwt = testJWTAuthParams({});
	exports.rest_jwt_with_jwt_return_type = testJWTAuthParams({returnType: 'jwt'});
	/* The embedded tests rely on the echoserver getting a token from realtime, so won't work against a local realtime */
	if(globals.environment !== 'local') {
		exports.rest_jwt_embedded = testJWTAuthParams({jwtType: 'embedded', environment: globals.environment});
		exports.rest_jwt_embedded_encrypted = testJWTAuthParams({jwtType: 'embedded', environment: globals.environment});
	}

	function testJWTAuthParams(params) { return function(test) {
		test.expect(1);
		var currentKey = helper.getTestApp().keys[0];
		var keys = {keyName: currentKey.keyName, keySecret: currentKey.keySecret};
		var authParams = utils.mixin(keys, params);
		var authUrl = echoServer + '/createJWT' + utils.toQueryString(authParams);
		var restJWTRequester = helper.AblyRest({authUrl: authUrl});

		restJWTRequester.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var restClient = helper.AblyRest({token: tokenDetails.token});
			restClient.stats(function(err, stats) {
				if(err) {
					test.ok(false, err.message);
					test.done();
					return;
				}
				test.ok(true, 'Verify that stats request succeeded');
				test.done();
			});
		})
	}};

	/*
	 * Tests JWT request with invalid keys
	 */
	exports.rest_jwt_with_invalid_keys = function(test) {
		test.expect(2);
		var keys = {keyName: 'invalid.invalid', keySecret: 'invalidinvalid'};
		var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
		var restJWTRequester = helper.AblyRest({authUrl: authUrl});

		restJWTRequester.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var restClient = helper.AblyRest({token: tokenDetails.token});
			restClient.stats(function(err, stats) {
				test.strictEqual(err.code, 40400, 'Verify token is invalid because app id does not exist');
				test.strictEqual(err.statusCode, 404, 'Verify token is invalid because app id does not exist');
				test.done();
			});
		});
	};

	/* RSA8g
	 * Tests JWT with authCallback
	 */
	exports.rest_jwt_with_authCallback = function(test) {
		test.expect(2);
		var currentKey = helper.getTestApp().keys[0];
		var keys = {keyName: currentKey.keyName, keySecret: currentKey.keySecret};
		var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
		var restJWTRequester = helper.AblyRest({authUrl: authUrl});

		var authCallback = function(tokenParams, callback) {
			restJWTRequester.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					test.ok(false, err.message);
					test.done();
					return;
				}
				callback(null, tokenDetails.token);
			});
		};

		var restClient = helper.AblyRest({ authCallback: authCallback });
		restClient.stats(function(err, stats) {
			if(err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			test.strictEqual(err, null, 'Verify that the error is null');
			test.ok(true, 'Verify that stats request succeeded');
			test.done();
		});
	};

	/* RSA8g
	 * Tests JWT with authCallback and invalid keys
	 */
	exports.rest_jwt_with_authCallback_and_invalid_keys = function(test) {
		test.expect(2);
		var keys = {keyName: 'invalid.invalid', keySecret: 'invalidinvalid'};
		var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
		var restJWTRequester = helper.AblyRest({authUrl: authUrl});

		var authCallback = function(tokenParams, callback) {
			restJWTRequester.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					test.ok(false, err.message);
					test.done();
					return;
				}
				callback(null, tokenDetails.token);
			});
		};

		var restClient = helper.AblyRest({ authCallback: authCallback });
		restClient.stats(function(err, stats) {
			test.strictEqual(err.code, 40400, 'Verify code is 40400');
			test.strictEqual(err.statusCode, 404, 'Verify token is invalid because app id does not exist');
			test.done();
		});
	};

	exports.auth_concurrent = function(test) {
		var authCallbackInvocations = 0;
		function authCallback(tokenParams, callback) {
			authCallbackInvocations++;
			rest.auth.createTokenRequest(tokenParams, callback);
		}

		/* Example client-side using the token */
		var restClient = helper.AblyRest({ authCallback: authCallback });
		var channel = restClient.channels.get('auth_concurrent');

		async.parallel([
			channel.history.bind(channel),
			channel.history.bind(channel)
		], function(err) {
			test.ok(!err, err && helper.displayError(err));
			test.equal(authCallbackInvocations, 1, 'Check authCallback only invoked once -- was: ' + authCallbackInvocations)
			test.done();
			return;
		});
	};

	exports.auth_promises = function(test) {
		if(typeof Promise === 'undefined') {
			test.done();
			return;
		}
		test.expect(6);
		var rest = helper.AblyRest({promises: true});

		var promise1 = rest.auth.requestToken();
		var promise2 = rest.auth.requestToken({ttl: 100});
		var promise3 = rest.auth.requestToken({ttl: 100}, {key: helper.getTestApp().keys[1].keyStr});
		var promise4 = rest.auth.createTokenRequest();
		var promise5 = rest.auth.createTokenRequest({ttl: 100});
		var promise6 = rest.auth.requestToken({ttl: 100}, {key: 'bad'})['catch'](function(err) {
			test.ok(true, 'Token attempt with bad key was rejected')
		});

		Promise.all([promise1, promise2, promise3, promise4, promise5, promise6]).then(function(results) {
			for(var i=0; i<5; i++) {
				test.ok(results[i].token || results[i].nonce)
			}
			test.done();
		})['catch'](function(err) {
			test.ok(false, 'a token request failed with error: ' + displayError(err));
			test.done();
		});
	};

	return module.exports = helper.withTimeout(exports);
});
