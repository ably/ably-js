"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	exports.setupInit = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				test.ok(true, 'app set up');
			}
			test.done();
		});
	};

	/*
	 * Base init case
	 */
	exports.initbase0 = function(test) {
		test.expect(1);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				test.ok(true, 'Verify init with key');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init with key string */
	exports.init_key_string = function(test) {
		test.expect(2);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = new helper.Ably.Realtime(keyStr);

			test.equal(realtime.options.key, keyStr);
			test.deepEqual(realtime.options, realtime.connection.connectionManager.options);
			closeAndFinish(test, realtime);
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init with token string */
	exports.init_token_string = function(test) {
		test.expect(2);
		try {
			/* first generate a token ... */
			var rest = helper.AblyRest();
			var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};

			rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}

				var tokenStr = tokenDetails.token,
					realtime = new helper.Ably.Realtime(tokenStr);

				test.equal(realtime.options.token, tokenStr);
				test.deepEqual(realtime.options, realtime.connection.connectionManager.options);
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'Init with token failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with key string and useTokenAuth: true */
	exports.init_key_with_usetokenauth = function(test) {
		test.expect(4);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true});
			test.equal(realtime.options.key, keyStr);
			test.equal(realtime.auth.method, 'token');
			test.equal(realtime.auth.clientId, null);
			/* Check that useTokenAuth by default results in an anonymous (and not wildcard) token */
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.tokenDetails.clientId, null);
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'Init with key and usetokenauth failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init with key string, useTokenAuth: true, and some defaultTokenParams to
	* request a wildcard clientId */
	exports.init_usetokenauth_defaulttokenparams_wildcard = function(test) {
		test.expect(4);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, defaultTokenParams: {clientId: '*', ttl: 12345}});
			test.equal(realtime.auth.clientId, null);
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.tokenDetails.clientId, '*');
				/* auth.clientId does not inherit the value '*'; it remains null as
				* client is not identified */
				test.equal(realtime.auth.clientId, null);
				test.equal(realtime.auth.tokenDetails.expires - realtime.auth.tokenDetails.issued, 12345);
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'init_usetokenauth_defaulttokenparams_wildcard failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init with using defaultTokenParams to set a non-wildcard clientId should set auth.clientId */
	exports.init_defaulttokenparams_nonwildcard = function(test) {
		test.expect(3);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, defaultTokenParams: {clientId: 'test'}});
			test.equal(realtime.auth.clientId, null);
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.tokenDetails.clientId, 'test');
				test.equal(realtime.auth.clientId, 'test');
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'init_defaulttokenparams_nonwildcard failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init when specifying clientId both in defaultTokenParams and in clientOptions: the latter takes precedence */
	exports.init_conflicting_clientids = function(test) {
		test.expect(2);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, clientId: 'yes', defaultTokenParams: {clientId: 'no'}});
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.tokenDetails.clientId, 'yes');
				test.equal(realtime.auth.clientId, 'yes');
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'init_conflicting_clientids failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* init with useTokenAuth: false with a clientId (should fail) */
	exports.init_with_usetokenauth_false_and_a_clientid = function(test) {
		test.expect(1);
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			test.throws(function(){
				realtime = new helper.Ably.Realtime({key: keyStr, useTokenAuth: false, clientId: "foo"});
			});
			test.done();
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* check default httpHost selection */
	exports.init_defaulthost = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime({ key: 'not_a.real:key' });
			var defaultHost = realtime.connection.connectionManager.httpHosts[0];
			var hostWithoutEnv = defaultHost.replace(/^\w+\-rest/, 'rest');
			test.equal(hostWithoutEnv, 'rest.ably.io', 'Verify correct default rest host chosen');
			realtime.connection.on('failed', function (state) {
				test.done();
				realtime.close();
			});
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* check changing the default timeouts */
	exports.init_timeouts = function(test) {
		test.expect(3);
		try {
			var realtime = helper.AblyRealtime({
				key: 'not_a.real:key',
				disconnectedRetryTimeout: 123,
				suspendedRetryTimeout: 456,
				httpRequestTimeout: 789,
			});
			/* Note: uses internal knowledge of connectionManager */
			test.equal(realtime.connection.connectionManager.states.disconnected.retryDelay, 123, 'Verify disconnected retry frequency is settable');
			test.equal(realtime.connection.connectionManager.states.suspended.retryDelay, 456, 'Verify suspended retry frequency is settable');
			test.equal(realtime.connection.connectionManager.options.timeouts.httpRequestTimeout, 789, 'Verify suspended retry frequency is settable');
			closeAndFinish(test, realtime);
		} catch(e) {
			test.ok(false, 'init_defaulthost failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* check changing the default fallback hosts and changing httpMaxRetryCount */
	exports.init_fallbacks = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime({
				key: 'not_a.real:key',
				restHost: 'a',
				httpMaxRetryCount: 2,
				fallbackHosts: ['b', 'c', 'd', 'e']
			});
			/* Note: uses internal knowledge of connectionManager */
			test.deepEqual(realtime.connection.connectionManager.httpHosts, ['a', 'b', 'c'], 'Verify hosts list is as expected');
			closeAndFinish(test, realtime);
		} catch(e) {
			test.ok(false, 'init_defaulthost failed with exception: ' + e.stack);
			test.done();
		}
	}

	/* Check that the connectionKey in ConnectionDetails takes precedence over connectionKey in ProtocolMessage,
	   and clientId in ConnectionDetails updates the client clientId */
	exports.init_and_connection_details = function(test) {
		test.expect(4);
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			var realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true, transports: ['web_socket'] });
			realtime.connection.connectionManager.once('transport.pending', function (state) {
				var transport = realtime.connection.connectionManager.pendingTransports[0],
						originalOnProtocolMessage = transport.onProtocolMessage;
				realtime.connection.connectionManager.pendingTransports[0].onProtocolMessage = function(message) {
					if(message.action === 4) {
						test.ok(message.connectionDetails.connectionKey);
						test.equal(message.connectionDetails.connectionKey, message.connectionKey, 'connection keys should match');
						message.connectionDetails.connectionKey = 'importantConnectionKey';
						message.connectionDetails.clientId = 'customClientId';
					}
					originalOnProtocolMessage.call(transport, message);
				};
			});
			realtime.connection.once('connected', function() {
				test.equal(realtime.auth.clientId, 'customClientId', 'clientId should be set on the Auth object from connectionDetails');
				test.equal(realtime.connection.key, 'importantConnectionKey', 'connection key from connectionDetails should be used');
				test.done();
				realtime.close();
			});
		} catch(e) {
			test.ok(false, 'Init with token failed with exception: ' + e.stack);
			test.done();
		}
	};

	return module.exports = helper.withTimeout(exports);
});
