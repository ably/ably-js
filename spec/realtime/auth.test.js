"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var currentTime, exports = {},
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
				test.ok(false, helper.displayError(err));
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
				test.ok(false, helper.displayError(err));
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
	 * Use authUrl for authentication with plain text token response
	 */
	exports.auth_useAuthUrl_plainText = function(test) {
		test.expect(1);

		var realtime, rest = helper.AblyRest();
		rest.auth.requestToken(null, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, helper.displayError(err));
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
			rest.auth.createTokenRequest(null, tokenParams, function(err, tokenRequest) {
				if(err) {
					test.ok(false, helper.displayError(err));
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
	 * Use authCallback for authentication with tokenDetails response
	 */
	exports.auth_useAuthCallback_tokenDetailsResponse = function(test) {
		test.expect(3);

		var realtime, rest = helper.AblyRest();
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken(null, tokenParams, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.ok("token" in tokenDetails);
				callback(null, tokenDetails);
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
	 * Use authCallback for authentication with token string response
	 */
	exports.auth_useAuthCallback_tokenStringResponse = function(test) {
		test.expect(3);

		var realtime, rest = helper.AblyRest();
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken(null, tokenParams, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
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
	 * and check that the connection inherits the clientId of the token
	 */
	exports.auth_clientid_inheritance = function(test) {
		test.expect(1);

		var rest = helper.AblyRest(),
		testClientId = 'testClientId';
		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken({clientId: testClientId}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				callback(null, tokenDetails);
			});
		};

		var realtime = helper.AblyRealtime({ authCallback: authCallback });

		realtime.connection.on('connected', function() {
			test.equal(realtime.clientId, testClientId);
			realtime.connection.close();
			test.done();
			return;
		});

		realtime.connection.on('failed', function(err) {
			realtime.close();
			test.ok(false, "Failed: " + err);
			test.done();
			return;
		});
	};

	/*
	 * Rest token generation with clientId, then connecting with a
	 * different clientId, should fail with a library-generated message
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

	return module.exports = helper.withTimeout(exports);
});
