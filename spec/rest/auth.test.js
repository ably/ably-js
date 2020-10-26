"use strict";

define(['ably', 'shared_helper', 'async', 'globals'], function(Ably, helper, async, globals) {
	helper.describeWithCounter('rest/auth', function (expect, counter) {
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

		it('setupauth', function(done) {
			counter.expect(1);
			helper.setupApp(function() {
				rest = helper.AblyRest({queryTime: true});
				getServerTime(function(err, time) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}
					currentTime = time;
					expect(true, 'Obtained time');
					counter.assert();
					done();
				});
			});
		});

		/*
		* Base token generation case
		*/
		it('authbase0', function(done) {
			counter.expect(1);
			rest.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(5);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(tokenDetails.expires).to.equal(60*60*1000 + tokenDetails.issued, 'Verify default expiry period');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal({'*':['*']}, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Base token generation with options
		*/
		it('authbase1', function(done) {
			counter.expect(1);
			rest.auth.requestToken(null, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(4);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal({'*':['*']}, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Generate token and init library with it
		*/
		it('authbase2', function(done) {
			counter.expect(1);
			rest.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect((tokenDetails.token), 'Verify token value');
				try {
					var restInit = helper.AblyRest({ token: tokenDetails.token });
					counter.assert();
					done();
				} catch(e) {
					expect(false, helper.displayError(e));
					done();
				}
			});
		});

		/*
		* Token generation with explicit timestamp
		*/
		it('authtime0', function(done) {
			counter.expect(1);
			getServerTime(function(err, serverTime) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				rest.auth.requestToken({timestamp: serverTime}, function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}
					counter.expect(4);
					expect((tokenDetails.token), 'Verify token value');
					expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
					expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({'*':['*']}, 'Verify token capability');
					counter.assert();
					done();
				});
			});
		});

		/*
		* Token generation with explicit timestamp (invalid)
		*/
		it('authtime1', function(done) {
			counter.expect(1);
			var badTime = utils.now() - 30*60*1000;
			rest.auth.requestToken({timestamp:badTime}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(401, 'Verify token request rejected with bad timestamp');
					done();
					return;
				}
				expect(false, 'Invalid timestamp, expected rejection');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation with system timestamp
		*/
		it('authtime2', function(done) {
			counter.expect(1);
			rest.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(4);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal({'*':['*']}, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation with duplicate nonce
		*/
		it('authnonce0', function(done) {
			counter.expect(1);
			getServerTime(function(err, serverTime) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				rest.auth.requestToken({timestamp:serverTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}
					rest.auth.requestToken({timestamp:serverTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
						if(err) {
							expect(err.statusCode).to.equal(401, 'Verify request rejected with duplicated nonce');
							counter.assert();
							done();
							return;
						}
						expect(false, 'Invalid nonce, expected rejection');
						done();
					});
				});
			});
		});

		/*
		* Token generation with clientId
		*/
		it('authclientid0', function(done) {
			counter.expect(1);
			var testClientId = 'test client id';
			rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(5);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(tokenDetails.clientId).to.equal(testClientId, 'Verify client id');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal({'*':['*']}, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation with empty string clientId should error
		*/
		it('authemptyclientid', function(done) {
			counter.expect(1);
			rest.auth.requestToken({clientId: ''}, function(err, tokenDetails) {
				if(err) {
					expect(err.code).to.equal(40012);
					counter.assert();
					done();
					return;
				}
				expect(false);
				done();
			});
		});

		/*
		* Token generation with capability that subsets key capability
		*/
		it('authcapability0', function(done) {
			counter.expect(1);
			var testCapability = {onlythischannel:['subscribe']};
			rest.auth.requestToken({capability:testCapability}, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(4);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation with specified key
		*/
		it('authkey0', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};
		var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
			rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(5);
				expect((tokenDetails.token), 'Verify token value');
				expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
				expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
				expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation with explicit auth
		*/
		it('authexplicit_simple', function(done) {
			counter.expect(1);
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				rest.auth.authOptions.requestHeaders = authHeaders;
				rest.auth.requestToken(function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}
					counter.expect(4);
					expect((tokenDetails.token), 'Verify token value');
					expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
					expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
					expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[0].keyName, 'Verify token key');
					counter.assert();
					done();
				});
			});
		});

		/*
		* Token generation with explicit auth, different key
		*/
		it('authexplicit_key', function(done) {
			counter.expect(1);
			rest.auth.getAuthHeaders(function(err, authHeaders) {
			var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};
			var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
				rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}
					counter.expect(5);
					expect((tokenDetails.token), 'Verify token value');
					expect((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
					expect((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
					expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
					counter.assert();
					done();
				});
			});
		});

		/*
		* Token generation with invalid mac
		*/
		it('authmac0', function(done) {
			counter.expect(1);
			rest.auth.requestToken({mac: '12345'}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(401, 'Verify request rejected with bad mac');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid mac, expected rejection');
				done();
			});
		});

		/*
		* Token generation with defaultTokenParams set and no tokenParams passed in
		*/
		it('authdefaulttokenparams0', function(done) {
			counter.expect(1);
			var rest1 = helper.AblyRest({defaultTokenParams: {ttl: 123, clientId: "foo"}});
			rest1.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				counter.expect(3);
				expect((tokenDetails.token), 'Verify token value');
				expect(tokenDetails.clientId).to.equal('foo', 'Verify client id from defaultTokenParams used');
				expect(tokenDetails.expires - tokenDetails.issued).to.equal(123, 'Verify ttl from defaultTokenParams used');
				counter.assert();
				done();
			});
		});

		/*
		* Token generation: if tokenParams passed in, defaultTokenParams should be ignored altogether, not merged
		*/
		it('authdefaulttokenparams1', function(done) {
			counter.expect(2);
			var rest1 = helper.AblyRest({defaultTokenParams: {ttl: 123, clientId: "foo"}});
			rest1.auth.requestToken({clientId: 'bar'}, null, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(tokenDetails.clientId).to.equal('bar', 'Verify client id passed in is used, not the one from defaultTokenParams');
				expect(tokenDetails.expires - tokenDetails.issued).to.equal(60 * 60 * 1000, 'Verify ttl from defaultTokenParams ignored completely, even though not overridden');
				counter.assert();
				done();
			});
		});

		/*
		* authorize with different args
		*/
		it('authauthorize', function(done) {
			counter.expect(3);
			async.parallel([
				function(cb) {
					rest.auth.authorize(null, null, function(err, tokenDetails) {
						expect(tokenDetails.token, 'Check token obtained');
						cb(err);
					});
				},
				function(cb) {
					rest.auth.authorize(null, function(err, tokenDetails) {
						expect(tokenDetails.token, 'Check token obtained');
						cb(err);
					});
				},
				function(cb) {
					rest.auth.authorize(function(err, tokenDetails) {
						expect(tokenDetails.token, 'Check token obtained');
						cb(err);
					});
				}
			], function(err) {
				if(err) done(false, "authorize returned an error: " + helper.displayError(err));
				counter.assert();
				done();
			});
		});

		/*
		* Specify non-default ttl
		*/
		it('authttl0', function(done) {
			counter.expect(1);
			rest.auth.requestToken({ttl:100*1000}, function(err, tokenDetails) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(tokenDetails.expires).to.equal(100*1000 + tokenDetails.issued, 'Verify non-default expiry period');
				done();
			});
		});

		/*
		* Excessive ttl
		*/
		it('authttl1', function(done) {
			counter.expect(1);
			rest.auth.requestToken({ttl: 365*24*60*60*1000}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with excessive expiry');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Excessive expiry, expected rejection');
				done();
			});
		});

		/*
		* Negative ttl
		*/
		it('authttl2', function(done) {
			counter.expect(1);
			rest.auth.requestToken({ttl: -1}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with negative expiry');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Negative expiry, expected rejection');
				done();
			});
		});

		/*
		* Invalid ttl
		*/
		it('authttl3', function(done) {
			counter.expect(1);
			rest.auth.requestToken({ttl: 'notanumber'}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with invalid expiry');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid expiry, expected rejection');
				done();
			});
		});

		/*
		* createTokenRequest uses the key it was initialized with if authOptions is null,
		* and the token request includes all the fields it should include, but
		* doesn't include ttl or capability by default
		*/
		it('auth_createTokenRequest_given_key', function(done) {
			counter.expect(6);
			rest.auth.createTokenRequest(null, null, function(err, tokenRequest) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect('mac' in tokenRequest, 'check tokenRequest contains a mac');
				expect('nonce' in tokenRequest, 'check tokenRequest contains a nonce');
				expect('timestamp' in tokenRequest, 'check tokenRequest contains a timestamp');
				expect(!('ttl' in tokenRequest), 'check tokenRequest does not contains a ttl by default');
				expect(!('capability' in tokenRequest), 'check tokenRequest does not contains capabilities by default');
				expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
				counter.assert();
				done();
			});
		});

		/*
		* createTokenRequest: no authoptions, callback as 2nd param
		*/
		it('auth_createTokenRequest_params0', function(done) {
			counter.expect(1);
			rest.auth.createTokenRequest(null, function(err, tokenRequest) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
				counter.assert();
				done();
			});
		});

		/*
		* createTokenRequest: no authoptions or tokenparams, callback as 1st param
		*/
		it('auth_createTokenRequest_params1', function(done) {
			counter.expect(1);
			rest.auth.createTokenRequest(function(err, tokenRequest) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
				counter.assert();
				done();
			});
		});

		/*
		* createTokenRequest uses the key it was initialized with if authOptions does not have a "key" key
		*/
		it('auth_createTokenRequest_given_key2', function(done) {
			counter.expect(1);
			rest.auth.createTokenRequest(function(err, tokenRequest) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
				counter.assert();
				done();
			});
		});

		/*
		* createTokenRequest given capability object JSON-stringifies it
		*/
		it('auth_createTokenRequest_capability_object', function(done) {
			counter.expect(1);
			var capability = {'*':['*']};
			rest.auth.createTokenRequest({capability: capability}, null, function(err, tokenRequest) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenRequest.capability)).to.deep.equal(capability, 'Verify createTokenRequest has JSON-stringified capability');
				counter.assert();
				done();
			});
		});

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

		function testJWTAuthParams(params) { return function(done) {
			counter.expect(1);
			var currentKey = helper.getTestApp().keys[0];
			var keys = {keyName: currentKey.keyName, keySecret: currentKey.keySecret};
			var authParams = utils.mixin(keys, params);
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(authParams);
			var restJWTRequester = helper.AblyRest({authUrl: authUrl});

			restJWTRequester.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, err.message);
					done();
					return;
				}
				var restClient = helper.AblyRest({token: tokenDetails.token});
				restClient.stats(function(err, stats) {
					if(err) {
						expect(false, err.message);
						done();
						return;
					}
					expect(true, 'Verify that stats request succeeded');
					counter.assert();
					done();
				});
			})
		}};

		/*
		* Tests JWT request with invalid keys
		*/
		it('rest_jwt_with_invalid_keys', function(done) {
			counter.expect(2);
			var keys = {keyName: 'invalid.invalid', keySecret: 'invalidinvalid'};
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({authUrl: authUrl});

			restJWTRequester.auth.requestToken(function(err, tokenDetails) {
				if(err) {
					expect(false, err.message);
					done();
					return;
				}
				var restClient = helper.AblyRest({token: tokenDetails.token});
				restClient.stats(function(err, stats) {
					expect(err.code).to.equal(40400, 'Verify token is invalid because app id does not exist');
					expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
					counter.assert();
					done();
				});
			});
		});

		/* RSA8g
		* Tests JWT with authCallback
		*/
		it('rest_jwt_with_authCallback', function(done) {
			counter.expect(2);
			var currentKey = helper.getTestApp().keys[0];
			var keys = {keyName: currentKey.keyName, keySecret: currentKey.keySecret};
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({authUrl: authUrl});

			var authCallback = function(tokenParams, callback) {
				restJWTRequester.auth.requestToken(function(err, tokenDetails) {
					if(err) {
						expect(false, err.message);
						done();
						return;
					}
					callback(null, tokenDetails.token);
				});
			};

			var restClient = helper.AblyRest({ authCallback: authCallback });
			restClient.stats(function(err, stats) {
				if(err) {
					expect(false, err.message);
					done();
					return;
				}
				expect(err).to.equal(null, 'Verify that the error is null');
				expect(true, 'Verify that stats request succeeded');
				counter.assert();
				done();
			});
		});

		/* RSA8g
		* Tests JWT with authCallback and invalid keys
		*/
		it('rest_jwt_with_authCallback_and_invalid_keys', function(done) {
			counter.expect(2);
			var keys = {keyName: 'invalid.invalid', keySecret: 'invalidinvalid'};
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({authUrl: authUrl});

			var authCallback = function(tokenParams, callback) {
				restJWTRequester.auth.requestToken(function(err, tokenDetails) {
					if(err) {
						expect(false, err.message);
						done();
						return;
					}
					callback(null, tokenDetails.token);
				});
			};

			var restClient = helper.AblyRest({ authCallback: authCallback });
			restClient.stats(function(err, stats) {
				expect(err.code).to.equal(40400, 'Verify code is 40400');
				expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
				counter.assert();
				done();
			});
		});

		it('auth_concurrent', function(done) {
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
				expect(!err, err && helper.displayError(err));
				expect(authCallbackInvocations).to.equal(1, 'Check authCallback only invoked once -- was: ' + authCallbackInvocations)
				done();
				return;
			});
		});

		it('auth_promises', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			counter.expect(6);
			var rest = helper.AblyRest({promises: true});

			var promise1 = rest.auth.requestToken();
			var promise2 = rest.auth.requestToken({ttl: 100});
			var promise3 = rest.auth.requestToken({ttl: 100}, {key: helper.getTestApp().keys[1].keyStr});
			var promise4 = rest.auth.createTokenRequest();
			var promise5 = rest.auth.createTokenRequest({ttl: 100});
			var promise6 = rest.auth.requestToken({ttl: 100}, {key: 'bad'})['catch'](function(err) {
				expect(true, 'Token attempt with bad key was rejected')
			});

			Promise.all([promise1, promise2, promise3, promise4, promise5, promise6]).then(function(results) {
				for(var i=0; i<5; i++) {
					expect(results[i].token || results[i].nonce)
				}
				counter.assert();
				done();
			})['catch'](function(err) {
				expect(false, 'a token request failed with error: ' + displayError(err));
				done();
			});
		});
	});
});
