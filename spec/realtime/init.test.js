"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};

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
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				test.ok(true, 'Verify init with key');
				test.done();
				realtime.close();
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, 'connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with key string */
	exports.init_key_string = function(test) {
		test.expect(1);
		try {
			var keyStr = helper.getTestApp().key0Str,
				realtime = new helper.Ably.Realtime(keyStr);

			realtime.close();
			test.equal(realtime.options.key, keyStr);
			test.done();
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with token string */
	exports.init_token_string = function(test) {
		test.expect(1);
		try {
			/* first generate a token ... */
			var rest = helper.AblyRest(),
				key1Id = helper.getTestApp().appId + '.' + helper.getTestApp().key1Id,
				testKeyOpts = { keyId: key1Id, keyValue: helper.getTestApp().key1Value };

			rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}

				var tokenStr = tokenDetails.id,
					realtime = new helper.Ably.Realtime(tokenStr);

				realtime.close();
				test.equal(realtime.options.authToken, tokenStr);
				test.done();
			});
		} catch(e) {
			test.ok(false, 'Init with token failed with exception: ' + e.stack);
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
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('disconnected');
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	return module.exports = helper.withTimeout(exports);
});
