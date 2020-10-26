"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('realtime/init', function (expect, counter) {
			var exports = {},
			closeAndFinish = helper.closeAndFinish,
			monitorConnection = helper.monitorConnection;

		it('setupInit', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		/*
		* Base init case
		*/
		it('initbase0', function(done) {
			var realtime;
			try {
				/* Restrict to websocket or xhr streaming for the v= test as if stream=false the
				* recvRequest may not be the connectRequest by the time we check it. All comet
				* transports share the same connect uri generation code so should be adequately
				* tested by testing xhr_streaming */
				if(helper.bestTransport !== 'web_socket' && helper.bestTransport !== 'xhr_streaming') {
					done();
					return;
				}
				realtime = helper.AblyRealtime({transports: ['web_socket', 'xhr_streaming']});
				realtime.connection.on('connected', function() {
					expect(true, 'Verify init with key');
					/* check api version */
					var transport = realtime.connection.connectionManager.activeProtocol.transport;
					var connectUri = helper.isWebsocket(transport) ? transport.uri : transport.recvRequest.uri;
					expect(connectUri.indexOf('v=1.2') > -1, 'Check uri includes v=1.2');
					closeAndFinish(done, realtime);
				});
				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, 'Init with key failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init with key string */
		it('init_key_string', function(done) {
			counter.expect(2);
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = new helper.Ably.Realtime(keyStr);

				expect(realtime.options.key).to.equal(keyStr);
				expect(realtime.options).to.deep.equal(realtime.connection.connectionManager.options);
				counter.assert();
				closeAndFinish(done, realtime);
			} catch(e) {
				expect(false, 'Init with key failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init with token string */
		it('init_token_string', function(done) {
			counter.expect(2);
			try {
				/* first generate a token ... */
				var rest = helper.AblyRest();
				var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};

				rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}

					var tokenStr = tokenDetails.token,
						realtime = new helper.Ably.Realtime(tokenStr);

					expect(realtime.options.token).to.equal(tokenStr);
					expect(realtime.options).to.deep.equal(realtime.connection.connectionManager.options);
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'Init with token failed with exception: ' + e.stack);
				done();
			}
		});

		/* init with key string and useTokenAuth: true */
		it('init_key_with_usetokenauth', function(done) {
			counter.expect(4);
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true});
				expect(realtime.options.key).to.equal(keyStr);
				expect(realtime.auth.method).to.equal('token');
				expect(realtime.auth.clientId).to.equal(null);
				/* Check that useTokenAuth by default results in an anonymous (and not wildcard) token */
				realtime.connection.on('connected', function() {
					expect(realtime.auth.tokenDetails.clientId).to.equal(null);
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'Init with key and usetokenauth failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init with key string, useTokenAuth: true, and some defaultTokenParams to
		* request a wildcard clientId */
		it('init_usetokenauth_defaulttokenparams_wildcard', function(done) {
			counter.expect(4);
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, defaultTokenParams: {clientId: '*', ttl: 12345}});
				expect(realtime.auth.clientId).to.equal(null);
				realtime.connection.on('connected', function() {
					expect(realtime.auth.tokenDetails.clientId).to.equal('*');
					/* auth.clientId now does inherit the value '*' -- RSA7b4 */
					expect(realtime.auth.clientId).to.equal('*');
					expect(realtime.auth.tokenDetails.expires - realtime.auth.tokenDetails.issued).to.equal(12345);
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'init_usetokenauth_defaulttokenparams_wildcard failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init with using defaultTokenParams to set a non-wildcard clientId should set auth.clientId */
		it('init_defaulttokenparams_nonwildcard', function(done) {
			counter.expect(3);
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, defaultTokenParams: {clientId: 'test'}});
				expect(realtime.auth.clientId).to.equal(null);
				realtime.connection.on('connected', function() {
					expect(realtime.auth.tokenDetails.clientId).to.equal('test');
					expect(realtime.auth.clientId).to.equal('test');
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'init_defaulttokenparams_nonwildcard failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init when specifying clientId both in defaultTokenParams and in clientOptions: the latter takes precedence */
		it('init_conflicting_clientids', function(done) {
			counter.expect(2);
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({key: keyStr, useTokenAuth: true, clientId: 'yes', defaultTokenParams: {clientId: 'no'}});
				realtime.connection.on('connected', function() {
					expect(realtime.auth.tokenDetails.clientId).to.equal('yes');
					expect(realtime.auth.clientId).to.equal('yes');
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'init_conflicting_clientids failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* init with useTokenAuth: false with a clientId (should fail) */
		it('init_with_usetokenauth_false_and_a_clientid', function(done) {
			counter.expect(1);
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				expect(function(){
					realtime = new helper.Ably.Realtime({key: keyStr, useTokenAuth: false, clientId: "foo"});
				}).to.throw();
				counter.assert();
				done();
			} catch(e) {
				expect(false, 'Init with key failed with exception: ' + e.stack);
				done();
			}
		});

		/* check default httpHost selection */
		it('init_defaulthost', function(done) {
			counter.expect(1);
			try {
				/* want to check the default host when no custom environment or custom
				* host set, so not using helpers.realtime this time, which will use a
				* test env */
				var realtime = new Ably.Realtime({ key: 'not_a.real:key', autoConnect: false });
				var defaultHost = realtime.connection.connectionManager.httpHosts[0];
				expect(defaultHost).to.equal('rest.ably.io', 'Verify correct default rest host chosen');
				realtime.close();
				counter.assert();
				done();
			} catch(e) {
				expect(false, 'Init with key failed with exception: ' + e.stack);
				done();
			}
		});

		/* check changing the default timeouts */
		it('init_timeouts', function(done) {
			counter.expect(3);
			try {
				var realtime = helper.AblyRealtime({
					key: 'not_a.real:key',
					disconnectedRetryTimeout: 123,
					suspendedRetryTimeout: 456,
					httpRequestTimeout: 789
				});
				/* Note: uses internal knowledge of connectionManager */
				expect(realtime.connection.connectionManager.states.disconnected.retryDelay).to.equal(123, 'Verify disconnected retry frequency is settable');
				expect(realtime.connection.connectionManager.states.suspended.retryDelay).to.equal(456, 'Verify suspended retry frequency is settable');
				expect(realtime.connection.connectionManager.options.timeouts.httpRequestTimeout).to.equal(789, 'Verify suspended retry frequency is settable');
				counter.assert();
				closeAndFinish(done, realtime);
			} catch(e) {
				expect(false, 'init_defaulthost failed with exception: ' + e.stack);
				done();
			}
		});

		/* check changing the default fallback hosts and changing httpMaxRetryCount */
		it('init_fallbacks', function(done) {
			counter.expect(6);
			try {
				var realtime = helper.AblyRealtime({
					key: 'not_a.real:key',
					restHost: 'a',
					httpMaxRetryCount: 2,
					autoConnect: false,
					fallbackHosts: ['b', 'c', 'd', 'e']
				});
				/* Note: uses internal knowledge of connectionManager */
				expect(realtime.connection.connectionManager.httpHosts.length).to.equal(3, 'Verify hosts list is the expected length');
				expect(realtime.connection.connectionManager.httpHosts[0]).to.equal('a', 'Verify given restHost is first');
				/* Replace chooseTransportForHost with a spy, then try calling
				* chooseHttpTransport to see what host is picked */
				realtime.connection.connectionManager.tryATransport = function(transportParams, transport, cb) {
					switch(transportParams.host) {
						case 'a':
							expect(true, 'Tries first with restHost');
							cb(false);
							break;
						case 'b':
						case 'c':
						case 'd':
						case 'e':
							/* should be called twice */
							expect(true, 'Tries each of the fallback hosts in turn');
							cb(false);
					}
				};
				realtime.connection.on('disconnected', function(stateChange) {
					expect(stateChange.reason.code).to.equal(80003, 'Expected error code after no fallback host works');
					counter.assert();
					closeAndFinish(done, realtime);
				})
				realtime.connection.connect();
			} catch(e) {
				expect(false, 'init_defaulthost failed with exception: ' + e.stack);
				done();
			}
		})

		/* Check base and upgrade transports (nodejs only; browser tests in their own section) */
		if(!isBrowser) {
			it('node_transports', function(done) {
				counter.expect(2);
				var realtime;
				try {
					realtime = helper.AblyRealtime({transports: helper.availableTransports});
					expect(realtime.connection.connectionManager.baseTransport).to.equal('comet');
					expect(realtime.connection.connectionManager.upgradeTransports).to.deep.equal(['web_socket']);
					counter.assert();
					closeAndFinish(done, realtime);
				} catch(e) {
					expect(false, 'Init with key failed with exception: ' + e.stack);
					closeAndFinish(done, realtime);
				}
			});
		}

		/* Check that the connectionKey in ConnectionDetails takes precedence over connectionKey in ProtocolMessage,
			and clientId in ConnectionDetails updates the client clientId */
		it('init_and_connection_details', function(done) {
			counter.expect(4);
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				var realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true });
				realtime.connection.connectionManager.once('transport.pending', function (state) {
					var transport = realtime.connection.connectionManager.pendingTransports[0],
							originalOnProtocolMessage = transport.onProtocolMessage;
					realtime.connection.connectionManager.pendingTransports[0].onProtocolMessage = function(message) {
						if(message.action === 4) {
							expect(message.connectionDetails.connectionKey);
							expect(message.connectionDetails.connectionKey).to.equal(message.connectionKey, 'connection keys should match');
							message.connectionDetails.connectionKey = 'importantConnectionKey';
							message.connectionDetails.clientId = 'customClientId';
						}
						originalOnProtocolMessage.call(transport, message);
					};
				});
				realtime.connection.once('connected', function() {
					expect(realtime.auth.clientId).to.equal('customClientId', 'clientId should be set on the Auth object from connectionDetails');
					expect(realtime.connection.key).to.equal('importantConnectionKey', 'connection key from connectionDetails should be used');
					counter.assert();
					done();
					realtime.close();
				});
			} catch(e) {
				expect(false, 'Init with token failed with exception: ' + e.stack);
				done();
			}
		});

		it('init_fallbacks_once_connected', function(done) {
			var realtime = helper.AblyRealtime({
				httpMaxRetryCount: 3,
				fallbackHosts: ['a', 'b', 'c']
			});
			realtime.connection.once('connected', function() {
				var hosts = Ably.Rest.Http._getHosts(realtime);
				/* restHost rather than realtimeHost as that's what connectionManager
				* knows about; converted to realtimeHost by the websocketTransport */
				expect(hosts[0]).to.equal(realtime.options.restHost, 'Check connected realtime host is the first option');
				expect(hosts.length).to.equal(4, 'Check also have three fallbacks');
				closeAndFinish(done, realtime);
			})
		});

		it('init_fallbacks_once_connected_2', function(done) {
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
				expect(hosts[0]).to.equal(goodHost, 'Check connected realtime host is the first option');
				closeAndFinish(done, realtime);
			})
		})

		it('init_callbacks_promises', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}

			var realtime,
				keyStr = helper.getTestApp().keys[0].keyStr,
				getOptions = function() { return {key: keyStr, autoConnect: false}; };

			realtime = new Ably.Realtime(getOptions());
			expect(!realtime.options.promises, 'Check promises defaults to false');

			realtime = new Ably.Realtime.Promise(getOptions());
			expect(realtime.options.promises, 'Check promises default to true with promise constructor');

			if(!isBrowser && typeof require == 'function') {
				realtime = new require('../../promises').Realtime(getOptions());
				expect(realtime.options.promises, 'Check promises default to true with promise require target');

				realtime = new require('../../callbacks').Realtime(getOptions());
				expect(!realtime.options.promises, 'Check promises default to false with callback require target');
			}
			done();
		});
	});
});
