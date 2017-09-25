"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var currentTime, exports = {},
		_exports = {},
		utils = helper.Utils,
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		testOnAllTransports = helper.testOnAllTransports,
		mixin = helper.Utils.mixin;

	exports.setupauth = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			var rest = helper.AblyRest({ queryTime: true });
			rest.time(function(err, time) {
				if(err) {
					test.ok(false, helper.displayError(err));
				} else {
					currentTime = time;
					test.ok(true, 'Obtained time via REST');
				}
				test.done();
			});
		});
	};

	/*
	 * Base token generation case
	 */
	exports.authbase0 = function(test) {
		test.expect(1);
		var realtime = helper.AblyRealtime();
		realtime.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			test.expect(5);
			test.ok((tokenDetails.token), 'Verify token value');
			test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
			test.equal(tokenDetails.expires, 60*60*1000 + tokenDetails.issued, 'Verify default expiry period');
			test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
			closeAndFinish(test, realtime);
		});
	};

	/*
	 * Use authUrl for authentication with JSON TokenDetails response
	 */
	exports.auth_useAuthUrl_json = function(test) {
		test.expect(1);

		var realtime, rest = helper.AblyRest();
		rest.auth.requestToken(null, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			var authPath = "http://echo.ably.io/?type=json&body=" + encodeURIComponent(JSON.stringify(tokenDetails));

			realtime = helper.AblyRealtime({ authUrl: authPath });

			realtime.connection.on('connected', function() {
				test.ok(true, 'Connected to Ably using authUrl with TokenDetails JSON payload');
				closeAndFinish(test, realtime);
				return;
			});

			monitorConnection(test, realtime);
		});
	};

	/*
	 * Use authUrl for authentication with JSON TokenDetails response, with authMethod=POST
	 */
	exports.auth_useAuthUrl_post_json = function(test) {
		test.expect(1);

		var realtime, rest = helper.AblyRest();
		rest.auth.requestToken(null, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			var authUrl = "http://echo.ably.io/?type=json&";

			realtime = helper.AblyRealtime({ authUrl: authUrl, authMethod: "POST", authParams: tokenDetails});

			realtime.connection.on('connected', function() {
				test.ok(true, 'Connected to Ably using authUrl with TokenDetails JSON payload');
				closeAndFinish(test, realtime);
				return;
			});

			monitorConnection(test, realtime);
		});
	};

	/*
	 * Use authUrl for authentication with plain text token response
	 */
	exports.auth_useAuthUrl_plainText = function(test) {
		test.expect(1);

		var realtime, rest = helper.AblyRest();
		rest.auth.requestToken(null, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			var authPath = "http://echo.ably.io/?type=text&body=" + tokenDetails['token'];

			realtime = helper.AblyRealtime({ authUrl: authPath });

			realtime.connection.on('connected', function() {
				test.ok(true, 'Connected to Ably using authUrl with TokenDetails JSON payload');
				closeAndFinish(test, realtime);
				return;
			});

			monitorConnection(test, realtime);
		});
	};

	/*
	 * Use authCallback for authentication with tokenRequest response
	 */
	exports.auth_useAuthCallback_tokenRequestResponse = function(test) {
		test.expect(3);

		var realtime, rest = helper.AblyRest();
		var authCallback = function(tokenParams, callback) {
			rest.auth.createTokenRequest(tokenParams, null, function(err, tokenRequest) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.ok("nonce" in tokenRequest);
				callback(null, tokenRequest);
			});
		};

		realtime = helper.AblyRealtime({ authCallback: authCallback });

		realtime.connection.on('connected', function() {
			test.equal(realtime.auth.method, 'token');
			test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
			closeAndFinish(test, realtime);
			return;
		});

		monitorConnection(test, realtime);
	};

	/*
	 * Use authCallback for authentication with tokenDetails response,
	 * also check that clientId lib is initialized with is passed through
	 * to the auth callback
	 */
	exports.auth_useAuthCallback_tokenDetailsResponse = function(test) {
		test.expect(4);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.ok("token" in tokenDetails);
				test.equal(tokenDetails.clientId, clientId);
				callback(null, tokenDetails);
			});
		};

		realtime = helper.AblyRealtime({ authCallback: authCallback, clientId: clientId });

		realtime.connection.on('connected', function() {
			test.equal(realtime.auth.method, 'token');
			test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
			closeAndFinish(test, realtime);
			return;
		});

		monitorConnection(test, realtime);
	};

	/*
	 * Use authCallback for authentication with token string response
	 */
	exports.auth_useAuthCallback_tokenStringResponse = function(test) {
		test.expect(3);

		var realtime, rest = helper.AblyRest();
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.ok("token" in tokenDetails);
				callback(null, tokenDetails.token);
			});
		};

		realtime = helper.AblyRealtime({ authCallback: authCallback });

		realtime.connection.on('connected', function() {
			test.equal(realtime.auth.method, 'token');
			test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
			closeAndFinish(test, realtime);
			return;
		});

		monitorConnection(test, realtime);
	};

	/*
	 * RSA8c1c -- If the given authUrl includes any querystring params, they
	 * should be preserved, and in the GET case, authParams/tokenParams should be
	 * merged with them. If a name conflict occurs, authParams/tokenParams should
	 * take precedence
	 */
	exports.auth_useAuthUrl_mixed_authParams_qsParams = function(test) {
		test.expect(1);

		var realtime, rest = helper.AblyRest();
		rest.auth.createTokenRequest(null, null, function(err, tokenRequest) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			/* Complete token request requires both parts to be combined, and
			 * requires the keyName in the higherPrecence part to take precedence
			 * over the wrong keyName */
			var lowerPrecedenceTokenRequestParts = {
				keyName: "WRONG",
				timestamp: tokenRequest.timestamp,
				nonce: tokenRequest.nonce
			};
			var higherPrecedenceTokenRequestParts = {
				keyName: tokenRequest.keyName,
				mac: tokenRequest.mac
			};
			var authPath = "http://echo.ably.io/qs_to_body" + utils.toQueryString(lowerPrecedenceTokenRequestParts);

			realtime = helper.AblyRealtime({ authUrl: authPath, authParams: higherPrecedenceTokenRequestParts });

			realtime.connection.on('connected', function() {
				test.ok(true, 'Connected to Ably');
				closeAndFinish(test, realtime);
				return;
			});
		});
	};

	/*
	 * Request a token using clientId, then initialize a connection without one,
	 * and check that the connection inherits the clientId from the tokenDetails
	 */
	exports.auth_clientid_inheritance = function(test) {
		test.expect(1);

		var rest = helper.AblyRest(),
		testClientId = 'testClientId';
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken({clientId: testClientId}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				callback(null, tokenDetails);
			});
		};

		var realtime = helper.AblyRealtime({ authCallback: authCallback });

		realtime.connection.on('connected', function() {
			test.equal(realtime.auth.clientId, testClientId);
			realtime.connection.close();
			test.done();
			return;
		});

		realtime.connection.on('failed', function(err) {
			realtime.close();
			test.ok(false, "Failed: " + displayError(err));
			test.done();
			return;
		});
	};

	/*
	 * Rest token generation with clientId, then connecting with a
	 * different clientId, should fail with a library-generated message
	 * (RSA15a, RSA15c)
	 */
	exports.auth_clientid_inheritance2 = function(test) {
		test.expect(2);
		var clientRealtime,
			testClientId = 'test client id';
		var rest = helper.AblyRest();
		rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			clientRealtime = helper.AblyRealtime({token: tokenDetails, clientId: 'WRONG'});
			clientRealtime.connection.once('failed', function(stateChange){
				test.ok(true, 'Verify connection failed');
				test.equal(stateChange.reason.code, 40102);
				clientRealtime.close();
				test.done();
			});
		});
	};

	/*
	 * Rest token generation with clientId '*', then connecting with just the
	 * token string and a different clientId, should succeed (RSA15b)
	 */
	exports.auth_clientid_inheritance3 = function(test) {
		test.expect(1);
		var realtime,
			testClientId = 'test client id';
		var rest = helper.AblyRest();
		rest.auth.requestToken({clientId: '*'}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			realtime = helper.AblyRealtime({token: tokenDetails.token, clientId: 'test client id'});
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.clientId, testClientId);
				realtime.connection.close();
				test.done();
				return;
			});
			monitorConnection(test, realtime);
		});
	};

	/*
	 * Rest token generation with clientId '*', then connecting with
	 * tokenDetails and a clientId, should succeed (RSA15b)
	 */
	exports.auth_clientid_inheritance4 = function(test) {
		test.expect(1);
		var realtime,
			testClientId = 'test client id';
		var rest = helper.AblyRest();
		rest.auth.requestToken({clientId: '*'}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			realtime = helper.AblyRealtime({token: tokenDetails, clientId: 'test client id'});
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.clientId, testClientId);
				realtime.connection.close();
				test.done();
				return;
			});
			monitorConnection(test, realtime);
		});
	};

	/*
	 * Request a token using clientId, then initialize a connection using just the token string,
	 * and check that the connection inherits the clientId from the connectionDetails
	 */
	exports.auth_clientid_inheritance5 = function(test) {
		test.expect(1);
		var clientRealtime,
			testClientId = 'test client id';
		var rest = helper.AblyRest();
		rest.auth.requestToken({clientId: testClientId}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			clientRealtime = helper.AblyRealtime({token: tokenDetails.token});
			clientRealtime.connection.on('connected', function() {
				test.equal(clientRealtime.auth.clientId, testClientId);
				closeAndFinish(test, clientRealtime)
				return;
			});
			monitorConnection(test, clientRealtime);
		});
	};

	/* RSA4c, RSA4e
	 * Try to connect with an authCallback that fails in various ways (calling back with an error, calling back with nothing, timing out, etc) should go to disconnected, not failed, and wrapped in a 80019 error code
	 */
	function authCallback_failures(realtimeOptions) {
		return function(test) {
			test.expect(2);

			var realtime = helper.AblyRealtime(realtimeOptions);
			realtime.connection.on(function(stateChange) {
				if(stateChange.previous !== 'initialized') {
					test.equal(stateChange.current, 'disconnected', 'Check connection goes to disconnected, not failed');
					test.equal(stateChange.reason.code, 80019, 'Check correct error code');
					realtime.connection.off();
					closeAndFinish(test, realtime);
				}
			});
		};
	}

	exports.authCallback_error = authCallback_failures({authCallback: function(tokenParams, callback) {
		callback(new Error("An error from client code that the authCallback might return"));
	}});

	exports.authCallback_timeout = authCallback_failures({
		authCallback: function() { /* (^._.^)ﾉ */ },
		realtimeRequestTimeout: 100});

	exports.authCallback_nothing = authCallback_failures({authCallback: function(tokenParams, callback) {
		callback();
	}});

	exports.authCallback_malformed = authCallback_failures({authCallback: function(tokenParams, callback) {
		callback(null, { horse: 'ebooks' });
	}});

	exports.authCallback_too_long_string = authCallback_failures({authCallback: function(tokenParams, callback) {
		var token = '';
		for(var i=0; i<390; i++) {
			token = token + 'a';
		}
		callback(null, token);
	}});

	exports.authUrl_timeout = authCallback_failures({
		authUrl: helper.unroutableAddress,
		realtimeRequestTimeout: 100
	});

	exports.authUrl_404 = authCallback_failures({
		authUrl: 'http://example.com/404'
	});

	exports.authUrl_wrong_content_type = authCallback_failures({
		authUrl: 'http://example.com/'
	});

	/*
	 * Check state change reason is propogated during a disconnect
	 * (when connecting with a token that expires while connected)
	 */
	testOnAllTransports(exports, 'auth_token_expires', function(realtimeOpts) { return function(test) {
		test.expect(4);
		var clientRealtime,
			rest = helper.AblyRest();

		rest.auth.requestToken({ ttl: 5000 }, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			clientRealtime = helper.AblyRealtime(mixin(realtimeOpts, { tokenDetails: tokenDetails, queryTime: true }));

			clientRealtime.connection.on('failed', function(){
				test.ok(false, 'Failed to connect before token expired');
				closeAndFinish(test, clientRealtime);
			});
			clientRealtime.connection.once('connected', function(){
				clientRealtime.connection.off('failed');
				test.ok(true, 'Verify connection connected');
				clientRealtime.connection.once('disconnected', function(stateChange){
					test.ok(true, 'Verify connection disconnected');
					test.equal(stateChange.reason.statusCode, 401, 'Verify correct disconnect statusCode');
					test.equal(stateChange.reason.code, 40142, 'Verify correct disconnect code');
					closeAndFinish(test, clientRealtime);
				});
			});
		});
	}});

	/*
	 * Check that when the queryTime option is provided
	 * that the time from the server is only requested once
	 * and all subsequent requests use the time offset
	 */
	exports.auth_query_time_once = function(test) {
		test.expect(12);

		var rest = helper.AblyRest({ queryTime: true }),
			timeRequestCount = 0,
			offset = 1000,
			originalTime = rest.time;

		/* stub time */
		rest.time = function(callback) {
			timeRequestCount += 1;
			originalTime.call(rest, callback);
		}

		test.ok(isNaN(parseInt(rest.serverTimeOffset)) && !rest.serverTimeOffset, 'Server time offset is empty and falsey until a time request has been made');

		var asyncFns = [];
		for(var i = 0; i < 10; i++) {
			asyncFns.push(function(callback) {
				rest.auth.createTokenRequest({}, null, function(err, tokenDetails) {
					if(err) { return callback(err); }
					test.ok(!isNaN(parseInt(rest.serverTimeOffset)), 'Server time offset is configured when time is requested');
					callback();
				});
			});
		}

		async.series(asyncFns, function(err) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}

			test.equals(1, timeRequestCount, 'Time function is only called once per instance');
			test.done();
		});
	};


	/*
	 * If using authcallback when a token expires, should automatically request a
	 * new token
	 */
	testOnAllTransports(exports, 'auth_tokenDetails_expiry_with_authcallback', function(realtimeOpts) { return function(test) {
		test.expect(4);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		var authCallback = function(tokenParams, callback) {
			tokenParams.ttl = 5000;
			rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				callback(null, tokenDetails);
			});
		};

		realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback, clientId: clientId }));
		monitorConnection(test, realtime);
		realtime.connection.once('connected', function(){
			test.ok(true, 'Verify connection connected');
			realtime.connection.once('disconnected', function(stateChange){
				test.ok(true, 'Verify connection disconnected');
				test.equal(stateChange.reason.code, 40142, 'Verify correct disconnect code');
				realtime.connection.once('connected', function(){
					test.ok(true, 'Verify connection reconnected');
					realtime.close();
					test.done();
				});
			});
		});

		monitorConnection(test, realtime);
	}});

	/*
	 * Same as previous but with just a token, so ably-js doesn't know that the
	 * token's expired
	 */
	testOnAllTransports(exports, 'auth_token_string_expiry_with_authcallback', function(realtimeOpts) { return function(test) {
		test.expect(4);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		var authCallback = function(tokenParams, callback) {
			tokenParams.ttl = 5000;
			rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				callback(null, tokenDetails.token);
			});
		};

		realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback, clientId: clientId }));
		monitorConnection(test, realtime);
		realtime.connection.once('connected', function(){
			test.ok(true, 'Verify connection connected');
			realtime.connection.once('disconnected', function(stateChange){
				test.ok(true, 'Verify connection disconnected');
				test.equal(stateChange.reason.code, 40142, 'Verify correct disconnect code');
				realtime.connection.once('connected', function(){
					test.ok(true, 'Verify connection reconnected');
					realtime.close();
					test.done();
				});
			});
		});

		monitorConnection(test, realtime);
	}});

	/*
	 * Same as previous but with no way to generate a new token
	 */
	testOnAllTransports(exports, 'auth_token_string_expiry_with_token', function(realtimeOpts) { return function(test) {
		test.expect(5);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		rest.auth.requestToken({ttl: 5000, clientId: clientId}, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			realtime = helper.AblyRealtime(mixin(realtimeOpts, { token: tokenDetails.token, clientId: clientId }));
			realtime.connection.once('connected', function(){
				test.ok(true, 'Verify connection connected');
				realtime.connection.once('disconnected', function(stateChange){
					test.ok(true, 'Verify connection disconnected');
					test.equal(stateChange.reason.code, 40142, 'Verify correct disconnect code');
					realtime.connection.once('failed', function(stateChange){
						/* Library has no way to generate a new token, so should fail */
						test.ok(true, 'Verify connection failed');
						test.equal(stateChange.reason.code, 40101, 'Verify correct failure code');
						realtime.close();
						test.done();
					});
				});
			});
		});
	}});

	/*
	 * Try to connect with an expired token string
	 */
	testOnAllTransports(exports, 'auth_expired_token_string', function(realtimeOpts) { return function(test) {
		test.expect(2);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		rest.auth.requestToken({ttl: 1, clientId: clientId}, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			setTimeout(function() {
				realtime = helper.AblyRealtime(mixin(realtimeOpts, { token: tokenDetails.token, clientId: clientId }));
				realtime.connection.once('failed', function(stateChange){
					test.ok(true, 'Verify connection failed');
					test.equal(stateChange.reason.code, 40101, 'Verify correct failure code');
					realtime.close();
					test.done();
				});
				/* Note: ws transport indicates viability when websocket is
				* established, before realtime sends error response. So token error
				* goes through the same path as a connected transport, so goes to
				* disconnected first */
				utils.arrForEach(['connected', 'suspended'], function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, 'State changed to ' + state + ', should have gone to failed');
						test.done();
						realtime.close();
					});
				});
			}, 100)
		});
	}});

	/*
	 * use authorize() to force a reauth using an existing authCallback
	 */
	testOnAllTransports(exports, 'reauth_authCallback', function(realtimeOpts) { return function(test) {
		test.expect(5);
		var realtime, rest = helper.AblyRest();
		var firstTime = true;
		var authCallback = function(tokenParams, callback) {
			tokenParams.clientId = '*';
			tokenParams.capability = firstTime ? {'wrong': ['*']} : {'right': ['*']};
			firstTime = false;
			rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				callback(null, tokenDetails);
			});
		};

		realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback }));
		realtime.connection.once('connected', function(){
			test.ok(true, 'Verify connection connected');
			var channel = realtime.channels.get('right');
			channel.attach(function(err) {
				test.ok(err, 'Check using first token, without channel attach capability');
				test.equal(err.code, 40160, 'Check expected error code');

				/* soon after connected, reauth */
				realtime.auth.authorize(null, null, function(err) {
					test.ok(!err, err && displayError(err));
					channel.attach(function(err) {
						test.ok(!err, 'Check using second token, with channel attach capability');
						closeAndFinish(test, realtime);
					});
				});
			});
		});
		monitorConnection(test, realtime);
	}});

	/* RSA10j */
	exports.authorize_updates_stored_details = function(test) {
		test.expect(8);
		var realtime = helper.AblyRealtime({autoConnect: false, defaultTokenParams: {version: 1}, token: '1', authUrl: '1'});

		test.equal(realtime.auth.tokenParams.version, 1, 'Check initial defaultTokenParams stored');
		test.equal(realtime.auth.tokenDetails.token, '1', 'Check initial token stored');
		test.equal(realtime.auth.authOptions.authUrl, '1', 'Check initial authUrl stored');
		realtime.auth.authorize({version: 2}, {authUrl: '2', token: '2'});
		test.equal(realtime.auth.tokenParams.version, 2, 'Check authorize updated the stored tokenParams');
		test.equal(realtime.auth.tokenDetails.token, '2', 'Check authorize updated the stored tokenDetails');
		test.equal(realtime.auth.authOptions.authUrl, '2', 'Check authorize updated the stored authOptions');
		realtime.auth.authorize(null, {token: '3'});
		test.equal(realtime.auth.authOptions.authUrl, undefined, 'Check authorize completely replaces stored authOptions with passed in ones');

		/* TODO remove for lib version 1.0 */
		realtime.auth.authorize(null, {authUrl: 'http://invalid'});
		realtime.auth.authorize(null, {force: true});
		test.equal(realtime.auth.authOptions.authUrl, 'http://invalid', 'Check authorize does *not* replace stored authOptions when the only option is "force" in 0.9, for compatibility with 0.8');

		closeAndFinish(test, realtime);
	};

	/* RTN22
	 * Inject a fake AUTH message from realtime, check that we reauth and send our own in reply
	 */
	exports.mocked_reauth = function(test) {
		test.expect(4);
		var rest = helper.AblyRest(),
			authCallback = function(tokenParams, callback) {
				test.ok(true, 'Requested a token (should happen twice)');
				rest.auth.requestToken(tokenParams, null, function(err, tokenDetails) {
					if(err) {
						test.ok(false, displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					callback(null, tokenDetails);
				});
			},
			realtime = helper.AblyRealtime({authCallback: authCallback, transports: [helper.bestTransport]});

		realtime.connection.once('connected', function(){
			test.ok(true, 'Verify connection connected');
			var transport = realtime.connection.connectionManager.activeProtocol.transport,
				originalSend = transport.send;
			/* Spy on transport.send to detect the outgoing AUTH */
			transport.send = function(message) {
				if(message.action === 17) {
					test.ok(message.auth.accessToken, 'Check AUTH message structure is as expected');
					closeAndFinish(test, realtime);
				} else {
					originalSend.call(this, message);
				}
			};
			/* Inject a fake AUTH from realtime */
			transport.onProtocolMessage({action: 17});
		});
	};

	return module.exports = helper.withTimeout(exports);
});
