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
		test.expect(2);
		var realtime;
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			realtime = new helper.Ably.Realtime({key: keyStr, useTokenAuth: true});
			test.equal(realtime.options.key, keyStr);
			test.equal(realtime.auth.method, 'token');
			closeAndFinish(test, realtime);
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
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
				disconnectedRetryFrequency: 123,
				suspendedRetryFrequency: 456,
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

	return module.exports = helper.withTimeout(exports);
});
