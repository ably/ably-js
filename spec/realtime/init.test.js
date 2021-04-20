'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
	var expect = chai.expect;
	var closeAndFinish = helper.closeAndFinish;
	var monitorConnection = helper.monitorConnection;

	describe('realtime/init', function () {
		this.timeout(60 * 1000);
		before(function (done) {
			helper.setupApp(function (err) {
				if (err) {
					done(err);
					return;
				}
				done();
			});
		});

		/* Restrict to websocket or xhr streaming for the v= test as if stream=false the
		 * recvRequest may not be the connectRequest by the time we check it. All comet
		 * transports share the same connect uri generation code so should be adequately
		 * tested by testing xhr_streaming */
		if (helper.bestTransport === 'web_socket' || helper.bestTransport === 'xhr_streaming') {
			/*
			 * Base init case
			 */
			it('initbase0', function (done) {
				var realtime;
				try {
					realtime = helper.AblyRealtime({ transports: ['web_socket', 'xhr_streaming'] });
					realtime.connection.on('connected', function () {
						/* check api version */
						var transport = realtime.connection.connectionManager.activeProtocol.transport;
						var connectUri = helper.isWebsocket(transport) ? transport.uri : transport.recvRequest.uri;
						try {
							expect(connectUri.indexOf('v=1.2') > -1, 'Check uri includes v=1.2').to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});
		}

		/* init with key string */
		it('init_key_string', function (done) {
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = new helper.Ably.Realtime(keyStr);

				try {
					expect(realtime.options.key).to.equal(keyStr);
					expect(realtime.options).to.deep.equal(realtime.connection.connectionManager.options);
				} catch (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				closeAndFinish(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* init with token string */
		it('init_token_string', function (done) {
			try {
				/* first generate a token ... */
				var rest = helper.AblyRest();
				var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };

				rest.auth.requestToken(null, testKeyOpts, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}

					var tokenStr = tokenDetails.token,
						realtime = new helper.Ably.Realtime(tokenStr);

					try {
						expect(realtime.options.token).to.equal(tokenStr);
						expect(realtime.options).to.deep.equal(realtime.connection.connectionManager.options);
						closeAndFinish(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				});
			} catch (err) {
				done(err);
			}
		});

		/* init with key string and useTokenAuth: true */
		it('init_key_with_usetokenauth', function (done) {
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true });
				expect(realtime.options.key).to.equal(keyStr);
				expect(realtime.auth.method).to.equal('token');
				expect(realtime.auth.clientId).to.equal(undefined);
				/* Check that useTokenAuth by default results in an anonymous (and not wildcard) token */
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.tokenDetails.clientId).to.equal(undefined);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* init with key string, useTokenAuth: true, and some defaultTokenParams to
		 * request a wildcard clientId */
		it('init_usetokenauth_defaulttokenparams_wildcard', function (done) {
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({
					key: keyStr,
					useTokenAuth: true,
					defaultTokenParams: { clientId: '*', ttl: 12345 }
				});
				expect(realtime.auth.clientId).to.equal(undefined);
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.tokenDetails.clientId).to.equal('*');
						/* auth.clientId now does inherit the value '*' -- RSA7b4 */
						expect(realtime.auth.clientId).to.equal('*');
						expect(realtime.auth.tokenDetails.expires - realtime.auth.tokenDetails.issued).to.equal(12345);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* init with using defaultTokenParams to set a non-wildcard clientId should set auth.clientId */
		it('init_defaulttokenparams_nonwildcard', function (done) {
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true, defaultTokenParams: { clientId: 'test' } });
				expect(realtime.auth.clientId).to.equal(undefined);
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.tokenDetails.clientId).to.equal('test');
						expect(realtime.auth.clientId).to.equal('test');
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* init when specifying clientId both in defaultTokenParams and in clientOptions: the latter takes precedence */
		it('init_conflicting_clientids', function (done) {
			var realtime;
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				realtime = helper.AblyRealtime({
					key: keyStr,
					useTokenAuth: true,
					clientId: 'yes',
					defaultTokenParams: { clientId: 'no' }
				});
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.tokenDetails.clientId).to.equal('yes');
						expect(realtime.auth.clientId).to.equal('yes');
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* init with useTokenAuth: false with a clientId (should fail) */
		it('init_with_usetokenauth_false_and_a_clientid', function (done) {
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				expect(function () {
					realtime = new helper.Ably.Realtime({ key: keyStr, useTokenAuth: false, clientId: 'foo' });
				}).to.throw;
				done();
			} catch (err) {
				done(err);
			}
		});

		/* check default httpHost selection */
		it('init_defaulthost', function (done) {
			try {
				/* want to check the default host when no custom environment or custom
				 * host set, so not using helpers.realtime this time, which will use a
				 * test env */
				var realtime = new Ably.Realtime({ key: 'not_a.real:key', autoConnect: false });
				var defaultHost = realtime.connection.connectionManager.httpHosts[0];
				expect(defaultHost).to.equal('rest.ably.io', 'Verify correct default rest host chosen');
				realtime.close();
				done();
			} catch (err) {
				done(err);
			}
		});

		/* check changing the default timeouts */
		it('init_timeouts', function (done) {
			try {
				var realtime = helper.AblyRealtime({
					key: 'not_a.real:key',
					disconnectedRetryTimeout: 123,
					suspendedRetryTimeout: 456,
					httpRequestTimeout: 789
				});
				/* Note: uses internal knowledge of connectionManager */
				try {
					expect(realtime.connection.connectionManager.states.disconnected.retryDelay).to.equal(
						123,
						'Verify disconnected retry frequency is settable'
					);
					expect(realtime.connection.connectionManager.states.suspended.retryDelay).to.equal(
						456,
						'Verify suspended retry frequency is settable'
					);
					expect(realtime.connection.connectionManager.options.timeouts.httpRequestTimeout).to.equal(
						789,
						'Verify suspended retry frequency is settable'
					);
				} catch (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				closeAndFinish(done, realtime);
			} catch (err) {
				done(err);
			}
		});

		/* check changing the default fallback hosts and changing httpMaxRetryCount */
		it('init_fallbacks', function (done) {
			try {
				var realtime = helper.AblyRealtime({
					key: 'not_a.real:key',
					restHost: 'a',
					httpMaxRetryCount: 2,
					autoConnect: false,
					fallbackHosts: ['b', 'c', 'd', 'e']
				});
				/* Note: uses internal knowledge of connectionManager */
				expect(realtime.connection.connectionManager.httpHosts.length).to.equal(
					3,
					'Verify hosts list is the expected length'
				);
				expect(realtime.connection.connectionManager.httpHosts[0]).to.equal('a', 'Verify given restHost is first');
				/* Replace chooseTransportForHost with a spy, then try calling
				 * chooseHttpTransport to see what host is picked */
				realtime.connection.connectionManager.tryATransport = function (transportParams, transport, cb) {
					switch (transportParams.host) {
						case 'a':
							cb(false);
							break;
						case 'b':
						case 'c':
						case 'd':
						case 'e':
							/* should be called twice */
							cb(false);
					}
				};
				realtime.connection.on('disconnected', function (stateChange) {
					try {
						expect(stateChange.reason.code).to.equal(80003, 'Expected error code after no fallback host works');
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
				realtime.connection.connect();
			} catch (err) {
				done(err);
			}
		});

		/* Check base and upgrade transports (nodejs only; browser tests in their own section) */
		if (!isBrowser) {
			it('node_transports', function (done) {
				var realtime;
				try {
					realtime = helper.AblyRealtime({ transports: helper.availableTransports });
					expect(realtime.connection.connectionManager.baseTransport).to.equal('comet');
					expect(realtime.connection.connectionManager.upgradeTransports).to.deep.equal(['web_socket']);
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});
		}

		/* Check that the connectionKey in ConnectionDetails takes precedence over connectionKey in ProtocolMessage,
	   and clientId in ConnectionDetails updates the client clientId */
		it('init_and_connection_details', function (done) {
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr;
				var realtime = helper.AblyRealtime({ key: keyStr, useTokenAuth: true });
				realtime.connection.connectionManager.once('transport.pending', function (state) {
					var transport = realtime.connection.connectionManager.pendingTransports[0],
						originalOnProtocolMessage = transport.onProtocolMessage;
					realtime.connection.connectionManager.pendingTransports[0].onProtocolMessage = function (message) {
						try {
							if (message.action === 4) {
								expect(message.connectionDetails.connectionKey).to.be.ok;
								expect(message.connectionDetails.connectionKey).to.equal(
									message.connectionKey,
									'connection keys should match'
								);
								message.connectionDetails.connectionKey = 'importantConnectionKey';
								message.connectionDetails.clientId = 'customClientId';
							}
							originalOnProtocolMessage.call(transport, message);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					};
				});
				realtime.connection.once('connected', function () {
					try {
						expect(realtime.auth.clientId).to.equal(
							'customClientId',
							'clientId should be set on the Auth object from connectionDetails'
						);
						expect(realtime.connection.key).to.equal(
							'importantConnectionKey',
							'connection key from connectionDetails should be used'
						);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					closeAndFinish(done, realtime);
				});
			} catch (err) {
				done(err);
			}
		});

		it('init_fallbacks_once_connected', function (done) {
			var realtime = helper.AblyRealtime({
				httpMaxRetryCount: 3,
				fallbackHosts: ['a', 'b', 'c']
			});
			realtime.connection.once('connected', function () {
				try {
					var hosts = Ably.Rest.Http._getHosts(realtime);
					/* restHost rather than realtimeHost as that's what connectionManager
					 * knows about; converted to realtimeHost by the websocketTransport */
					expect(hosts[0]).to.equal(realtime.options.restHost, 'Check connected realtime host is the first option');
					expect(hosts.length).to.equal(4, 'Check also have three fallbacks');
				} catch (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				closeAndFinish(done, realtime);
			});
		});

		it('init_fallbacks_once_connected_2', function (done) {
			var goodHost = helper.AblyRest().options.realtimeHost;
			var realtime = helper.AblyRealtime({
				httpMaxRetryCount: 3,
				restHost: 'a',
				fallbackHosts: [goodHost, 'b', 'c']
			});
			realtime.connection.once('connected', function () {
				var hosts = Ably.Rest.Http._getHosts(realtime);
				/* restHost rather than realtimeHost as that's what connectionManager
				 * knows about; converted to realtimeHost by the websocketTransport */
				try {
					expect(hosts[0]).to.equal(goodHost, 'Check connected realtime host is the first option');
				} catch (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				closeAndFinish(done, realtime);
			});
		});

		if (typeof Promise === 'undefined') {
			it('init_callbacks_promises', function (done) {
				try {
					var realtime,
						keyStr = helper.getTestApp().keys[0].keyStr,
						getOptions = function () {
							return { key: keyStr, autoConnect: false };
						};

					realtime = new Ably.Realtime(getOptions());
					expect(!realtime.options.promises, 'Check promises defaults to false').to.be.ok;

					realtime = new Ably.Realtime.Promise(getOptions());
					expect(realtime.options.promises, 'Check promises default to true with promise constructor').to.be.ok;

					if (!isBrowser && typeof require == 'function') {
						realtime = new require('../../promises').Realtime(getOptions());
						expect(realtime.options.promises, 'Check promises default to true with promise require target').to.be.ok;

						realtime = new require('../../callbacks').Realtime(getOptions());
						expect(!realtime.options.promises, 'Check promises default to false with callback require target').to.be.ok;
					}
					done();
				} catch (err) {
					done(err);
				}
			});
		}
	});
});
