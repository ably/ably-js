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

			var rest = helper.AblyRest();
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
			rest.auth.requestToken(null, tokenParams, function(err, tokenDetails) {
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

	/* RSA4c
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

	exports.authUrl_timeout = authCallback_failures({
		authUrl: helper.unroutableAddress,
		realtimeRequestTimeout: 100
	});

	exports.authUrl_404 = authCallback_failures({
		authUrl: 'http://example.com/404'
	});

	/*
	 * Check state change reason is propogated during a disconnect
	 * (when connecting with a token that expires while connected)
	 */
	testOnAllTransports(exports, 'auth_token_expires', function(realtimeOpts) { return function(test) {
		test.expect(4);
		var clientRealtime,
			rest = helper.AblyRest();

		rest.auth.requestToken({ ttl: 5000 }, { queryTime: true }, function(err, tokenDetails) {
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

		var rest = helper.AblyRest(),
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
				rest.auth.createTokenRequest({}, { queryTime: true }, function(err, tokenDetails) {
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
	 * use authorise({force: true}) to reauth with a token with a different set of capabilities
	 */
	testOnAllTransports(exports, 'reauth_tokendetails', function(realtimeOpts) { return function(test) {
		test.expect(2);
		var rest = helper.AblyRest(),
			realtime,
			channel,
			clientId = 'testClientId';

		var getFirstToken = function(callback) {
			rest.auth.requestToken({clientId: clientId, capability: {'wrongchannel': ['*']}}, null, function(err, tokenDetails) {
				callback(err, tokenDetails);
			});
		},

		connect = function(tokenDetails, callback) {
			realtime = helper.AblyRealtime(mixin(realtimeOpts, {tokenDetails: tokenDetails}));
			realtime.connection.once('connected', function() { callback() });
		},

		checkCantAttach = function(callback) {
			channel = realtime.channels.get('rightchannel');
			channel.attach(function(err) {
				test.ok(err && err.code === 40160, 'check channel is denied access')
				callback();
			});
		},

		getSecondToken = function(callback) {
			rest.auth.requestToken({clientId: clientId, capability: {'wrongchannel': ['*'], 'rightchannel': ['*']}}, null, function(err, tokenDetails) {
				callback(err, tokenDetails);
			});
		},

		reAuth = function(tokenDetails, callback) {
			realtime.auth.authorise(null, {force: true, tokenDetails: tokenDetails}, callback);
		},

		checkCanNowAttach = function(stateChange, callback) {
			channel.attach(function(err) {
				callback(err);
			});
		};

		async.waterfall([
			getFirstToken,
			connect,
			checkCantAttach,
			getSecondToken,
			reAuth,
			checkCanNowAttach,
		], function(err) {
			test.ok(!err, err && displayError(err));
			closeAndFinish(test, realtime);
		});
	}});

	/*
	 * use authorise({force: true}) to force a reauth using an existing authCallback
	 */
	testOnAllTransports(exports, 'reauth_authCallback', function(realtimeOpts) { return function(test) {
		test.expect(8);
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
				realtime.auth.authorise(null, {force: true}, function(err) {
					test.ok(!err, err && displayError(err));
				});

				/* statechanges due to the reauth */
				realtime.connection.once('disconnected', function(stateChange){
					test.ok(true, 'Verify connection disconnected');
					test.equal(stateChange.reason.code, 80003, 'Verify disconnect was client-initiated, not server-initiated (ie 40142)');
					realtime.connection.once('connected', function(){
						test.ok(true, 'Verify connection reconnected');

						channel.attach(function(err) {
							test.ok(!err, 'Check using second token, with channel attach capability');
							closeAndFinish(test, realtime);
						});
					});
				})
			});
		});

		monitorConnection(test, realtime);
	}});

	return module.exports = helper.withTimeout(exports);
});
