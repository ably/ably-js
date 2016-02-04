"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var currentTime, exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

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
	 * also check that clientId lib is initialised with is passed through
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
				test.deepEqual(stateChange.reason, {statusCode: 401, code: 40102, message: 'ClientId in token was ' + testClientId + ', but library was instantiated with clientId WRONG' })
				clientRealtime.close();
				test.done();
			})
			// Workaround for ably-js issue 101 (comet transport goes into disconnected
			// rather than failed). TODO remove next 5 lines when that's fixed
			clientRealtime.connection.once('disconnected', function(stateChange){
				test.ok(true, 'Verify connection failed');
				test.deepEqual(stateChange.reason, {statusCode: 401, code: 40102, message: 'ClientId in token was ' + testClientId + ', but library was instantiated with clientId WRONG' })
				clientRealtime.close();
				test.done();
			})
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

	/*
	 * Check state change reason is propogated during a disconnect
	 * (when connecting with a token that expires while connected)
	 */
	exports.auth_token_expires = function(test) {
		test.expect(4);
		var clientRealtime,
			rest = helper.AblyRest();

		rest.auth.requestToken({ ttl: 5000 }, { queryTime: true }, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			clientRealtime = helper.AblyRealtime({ tokenDetails: tokenDetails, queryTime: true });
			monitorConnection(test, clientRealtime);

			clientRealtime.connection.once('connected', function(){
				test.ok(true, 'Verify connection connected');
				clientRealtime.connection.once('disconnected', function(stateChange){
					test.ok(true, 'Verify connection disconnected');
					test.equal(stateChange.reason.statusCode, 401, 'Verify correct disconnect statusCode');
					test.equal(stateChange.reason.code, 40142, 'Verify correct disconnect code');
					clientRealtime.close();
					test.done();
				});
			});
		});
	};

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
	exports.auth_tokenDetails_expiry_with_authcallback = function(test) {
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

		realtime = helper.AblyRealtime({ authCallback: authCallback, clientId: clientId });
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
	};

	/*
	 * Same as previous but with just a token, so ably-js doesn't know that the
	 * token's expired
	 */
	exports.auth_token_string_expiry_with_authcallback = function(test) {
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

		realtime = helper.AblyRealtime({ authCallback: authCallback, clientId: clientId });
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
	};

	/*
	 * Same as previous but with no way to generate a new token
	 */
	exports.auth_token_string_expiry_with_token = function(test) {
		test.expect(5);

		var realtime, rest = helper.AblyRest();
		var clientId = "test clientid";
		rest.auth.requestToken({ttl: 5000, clientId: clientId}, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			realtime = helper.AblyRealtime({ token: tokenDetails.token, clientId: clientId });
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
	};

	return module.exports = helper.withTimeout(exports);
});
