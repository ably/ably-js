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
				/* auth.clientId now does inherit the value '*' -- RSA7b4 */
				test.equal(realtime.auth.clientId, '*');
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
			/* want to check the default host when no custom environment or custom
			 * host set, so not using helpers.realtime this time, which will use a
			 * test env */
			var realtime = new Ably.Realtime({ key: 'not_a.real:key', autoConnect: false });
			var defaultHost = realtime.connection.connectionManager.httpHosts[0];
			test.equal(defaultHost, 'rest.ably.io', 'Verify correct default rest host chosen');
			realtime.close();
			test.done();
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
				httpRequestTimeout: 789
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
		test.expect(6);
		try {
			var realtime = helper.AblyRealtime({
				key: 'not_a.real:key',
				restHost: 'a',
				httpMaxRetryCount: 2,
				autoConnect: false,
				fallbackHosts: ['b', 'c', 'd', 'e']
			});
			/* Note: uses internal knowledge of connectionManager */
			test.equal(realtime.connection.connectionManager.httpHosts.length, 3, 'Verify hosts list is the expected length');
			test.equal(realtime.connection.connectionManager.httpHosts[0], 'a', 'Verify given restHost is first');
			/* Replace chooseTransportForHost with a spy, then try calling
			* chooseHttpTransport to see what host is picked */
			realtime.connection.connectionManager.tryATransport = function(transportParams, transport, cb) {
				switch(transportParams.host) {
					case 'a':
						test.ok(true, 'Tries first with restHost');
						cb(false);
						break;
					case 'b':
					case 'c':
					case 'd':
					case 'e':
						/* should be called twice */
						test.ok(true, 'Tries each of the fallback hosts in turn');
						cb(false);
				}
			};
			realtime.connection.on('disconnected', function(stateChange) {
				test.equal(stateChange.reason.code, 80003, 'Expected error code after no fallback host works');
				closeAndFinish(test, realtime);
			})
			realtime.connection.connect();
		} catch(e) {
			test.ok(false, 'init_defaulthost failed with exception: ' + e.stack);
			test.done();
		}
	}

	/* Check base and upgrade transports (nodejs only; browser tests in their own section) */
	if(!isBrowser) {
		exports.node_transports = function(test) {
			test.expect(2);
			var realtime;
			try {
				realtime = helper.AblyRealtime({transports: helper.availableTransports});
				test.equal(realtime.connection.connectionManager.baseTransport, 'comet');
				test.deepEqual(realtime.connection.connectionManager.upgradeTransports, ['web_socket']);
				closeAndFinish(test, realtime);
			} catch(e) {
				test.ok(false, 'Init with key failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};
	}

	/* Check that the connectionKey in ConnectionDetails takes precedence over connectionKey in ProtocolMessage,
	   and clientId in ConnectionDetails updates the client clientId */
	exports.init_and_connection_details = function(test) {
		test.expect(4);
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr;
			var realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true });
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

	exports.init_fallbacks_once_connected = function(test) {
		var realtime = helper.AblyRealtime({
			httpMaxRetryCount: 3,
			fallbackHosts: ['a', 'b', 'c']
		});
		realtime.connection.once('connected', function() {
			var hosts = Ably.Rest.Http._getHosts(realtime);
			/* restHost rather than realtimeHost as that's what connectionManager
			 * knows about; converted to realtimeHost by the websocketTransport */
			test.equal(hosts[0], realtime.options.restHost, 'Check connected realtime host is the first option');
			test.equal(hosts.length, 4, 'Check also have three fallbacks');
			closeAndFinish(test, realtime);
		})
	};

	exports.init_fallbacks_once_connected_2 = function(test) {
		var goodHost = helper.AblyRest().options.realtimeHost;
		var realtime = helper.AblyRealtime({
			httpMaxRetryCount: 3,
			restHost: 'a',
			fallbackHosts: [goodHost, 'b', 'c']
		});
		realtime.connection.once('connected', function() {
			var hosts = Ably.Rest.Http._getHosts(realtime);
			/* restHost rather than realtimeHost as that's what connectionManager
			 * knows about; converted to realtimeHost by the websocketTransport */
			test.equal(hosts[0], goodHost, 'Check connected realtime host is the first option');
			closeAndFinish(test, realtime);
		})
	}

	exports.init_callbacks_promises = function(test) {
		if(typeof Promise === 'undefined') {
			test.done();
			return;
		}

		var realtime,
			keyStr = helper.getTestApp().keys[0].keyStr,
			getOptions = function() { return {key: keyStr, autoConnect: false}; };

		realtime = new Ably.Realtime(getOptions());
		test.ok(!realtime.options.promises, 'Check promises defaults to false');

		realtime = new Ably.Realtime.Promise(getOptions());
		test.ok(realtime.options.promises, 'Check promises default to true with promise constructor');

		if(!isBrowser && typeof require == 'function') {
			realtime = new require('../../promises').Realtime(getOptions());
			test.ok(realtime.options.promises, 'Check promises default to true with promise require target');

			realtime = new require('../../callbacks').Realtime(getOptions());
			test.ok(!realtime.options.promises, 'Check promises default to false with callback require target');
		}
		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});
