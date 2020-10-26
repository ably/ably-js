"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('realtime/failure', function (expect, counter) {
		var exports = {},
			_exports = {},
			closeAndFinish = helper.closeAndFinish,
			monitorConnection = helper.monitorConnection,
			utils = helper.Utils,
			noop = function() {},
			simulateDroppedConnection = helper.simulateDroppedConnection,
			createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
			availableTransports = helper.availableTransports;

		it('setupFailure', function(done) {
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
		* Connect with invalid credentials on various transports; connection state should be 'failed'
		*/
		it('invalid_cred_failure', function(done) {
			counter.expect((availableTransports.length + 1)*4);
			try {
				var failure_test = function(transports) {
					return function(cb) {
						var realtime = helper.AblyRealtime({key: "this.is:wrong", transports: transports});
						realtime.connection.on('failed', function(connectionStateChange) {
							expect(true, 'connection state for ' + transports + ' was failed, as expected');
							expect(realtime.connection.errorReason.code).to.equal(40400, 'wrong error reason code on connection.');
							expect(connectionStateChange.reason.code).to.equal(40400, 'wrong error reason code on connectionStateChange');
							expect(connectionStateChange.reason).to.deep.equal(realtime.connection.errorReason, 'error reason was not equally set on connection and connectionStateChange');
							cb(null, realtime);
						});
						realtime.connection.on('disconnected', function() {
							expect(false, 'connection state for transports ' + transports + ' should be failed, not disconnected');
							cb(null, realtime);
						});
					};
				};
				async.parallel(
					utils.arrMap(availableTransports, function(transport) {
						return failure_test([transport]);
					}).concat(failure_test(null)), // to test not specifying a transport (so will use upgrade mechanism)
					function(err, realtimes) {
						if(err) {
							expect(false, helper.displayError(err));
						}
						counter.assert();
						closeAndFinish(done, realtimes);
					}
				);
			} catch(e) {
				expect(false, 'connection failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/*
		* Connect with various transports, forcibly break the transport, connection state
		* should be 'disconnected'
		*/
		it('break_transport', function(done) {
			counter.expect(availableTransports.length + 1);
			try {
				var break_test = function(transports) {
					return function(cb) {
						var realtime = helper.AblyRealtime({transports: transports});
						realtime.connection.once('connected', function() {
							realtime.connection.once('disconnected', function() {
								expect(true, 'connection state for ' + transports + ' was disconnected, as expected');
								cb(null, realtime);
							});
							realtime.connection.on('failed', function() {
								expect(false, 'connection state for transports ' + transports + ' should be disconnected, not failed');
								cb(null, realtime);
							});
							simulateDroppedConnection(realtime);
						});
					};
				};
				async.parallel(
					utils.arrMap(availableTransports, function(transport) {
						return break_test([transport]);
					}).concat(break_test(null)), // to test not specifying a transport (so will use upgrade mechanism)
					function(err, realtimes) {
						if(err) {
							expect(false, helper.displayError(err));
						}
						counter.assert();
						closeAndFinish(done, realtimes);
					}
				);
			} catch(e) {
				expect(false, 'connection failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/*
		* Connect with various transports with a bad host, check that
		* the connecting/disconnecting/suspended cycle works as expected
		*/
		it('no_connection_lifecycle', function(done) {
			counter.expect(availableTransports.length + 1);

			try {
				var lifecycleTest = function(transports) {
					return function(cb) {
						var connectionEvents = [];
						var realtime = helper.AblyRealtime({
							transports: transports,
							realtimeHost: 'invalid',
							restHost: 'invalid',
							/* Timings note: some transports fail immediately with an invalid
							* host, others take longer; so set the realtimeRequestTimeout to be
							* small enough that the max difference is never large enough that
							* the suspended timeout trips before three connection cycles */
							disconnectedRetryTimeout: 1000,
							realtimeRequestTimeout: 50,
							preferenceConnectTimeout: 50,
							suspendedRetryTimeout: 1000,
							connectionStateTtl: 2900
						});
						realtime.connection.on(function() {
							connectionEvents.push(this.event);
						});

						/* After 4s, has been through three connecting/disconnected cycles
						* and one connecting/suspended cycles */
						var expectedConnectionEvents = [
							'connecting','disconnected', // immediately
							'connecting','disconnected', // at 1s
							'connecting','disconnected', // at 2s
							'suspended',                 // at 2.9s
							'connecting', 'suspended'    // at 3.9s
						];
						setTimeout(function() {
							realtime.close();
							expect(connectionEvents).to.deep.equal(expectedConnectionEvents, 'connection state for ' + transports + ' was ' + connectionEvents + ', expected ' + expectedConnectionEvents);
							cb(null, realtime);
						}, 4800);
					};
				};
				async.parallel(
					utils.arrMap(availableTransports, function(transport) {
						return lifecycleTest([transport]);
					}).concat(lifecycleTest(null)), // to test not specifying a transport (so will use upgrade mechanism)
					function(err, realtimes) {
						counter.assert();
						closeAndFinish(done, realtimes);
					}
				);
			} catch(e) {
				expect(false, 'connection failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/*
		* Check operations on a failed channel give the right errors
		*/
		it('failed_channel', function(done) {
			counter.expect(16);
			var realtime = helper.AblyRealtime();
			var failChan;
			var channelFailedCode = 90001;

			var tests = [
				function(callback) {
					failChan.publish('event', 'data', function(err) {
						expect(err, "publish failed");
						expect(err.code).to.equal(channelFailedCode, "publish failure code");
						callback();
					});
				},
				function(callback) {
					failChan.subscribe('event', noop, function(err) {
						expect(err, "subscribe failed");
						expect(err.code).to.equal(channelFailedCode, "subscribe failure code");
						callback();
					});
				},
				function(callback) {
					failChan.presence.enterClient('clientId', function(err) {
						expect(err, "presence enter failed");
						expect(err.code).to.equal(channelFailedCode, "presence enter failure code");
						callback();
					});
				},
				function(callback) {
					failChan.presence.leaveClient('clientId', function(err) {
						expect(err, "presence leave failed");
						expect(err.code).to.equal(channelFailedCode, "presence leave failure code");
						callback();
					});
				},
				function(callback) {
					failChan.presence.subscribe('event', noop, function(err) {
						expect(err, "presence subscribe failed");
						expect(err.code).to.equal(channelFailedCode, "subscribe failure code");
						callback();
					});
				},
				function(callback) {
					failChan.presence.subscribe('event', noop, function(err) {
						expect(err, "presence unsubscribe failed");
						expect(err.code).to.equal(channelFailedCode, "subscribe failure code");
						callback();
					});
				},
				function(callback) {
					failChan.presence.get(function(err) {
						expect(err, "presence get failed");
						expect(err.code).to.equal(channelFailedCode, "presence get failure code");
						callback();
					});
				}
			];

			try {
				realtime.connection.once('connected', function() {
					failChan = realtime.channels.get("::");
					failChan.attach(function(err) {
						expect(err, "channel attach failed");
						expect(failChan.state).to.equal("failed", "channel in failed state");
						async.parallel(tests, function() {
							counter.assert();
							closeAndFinish(done, realtime);
						});
					});
				});
			} catch(e) {
				expect(false, 'caught exception: ' + e.message + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('attach_timeout', function(done) {
			var realtime = helper.AblyRealtime({realtimeRequestTimeout: 10, channelRetryTimeout: 10}),
				channel = realtime.channels.get('failed_attach'),
				originalOnMessage = channel.onMessage.bind(channel);

			channel.onMessage = function(message) {
					if(message.action === 11) { return; }
					originalOnMessage(message);
				};

			counter.expect(4);
			realtime.connection.once('connected', function() {
				channel.attach(function(err) {
					expect(err.code).to.equal(90007, 'check channel error code');
					expect(err.statusCode).to.equal(408, 'check timeout statusCode');
					expect(channel.state).to.equal('suspended', 'check channel goes into suspended state');
					channel.once(function(stateChange) {
						expect(stateChange.current).to.equal('attaching', 'check channel tries to attach again');
						counter.assert();
						closeAndFinish(done, realtime);
					});
				});
			});
		});

		/* RTN7c
		* Publish a message, then before it receives an ack, disconnect the
		* transport, and let the connection go into some terminal failure state.
		* Check that the publish callback is called with an error.
		*/
		function nack_on_connection_failure(failureFn, expectedRealtimeState, expectedNackCode) {
			return function(done) {
				counter.expect(3)
				/* Use one transport because stubbing out transport#onProtocolMesage */
				var realtime = helper.AblyRealtime({transports: [helper.bestTransport]}),
					channel = realtime.channels.get('nack_on_connection_failure');

				async.series([
					function(cb) { realtime.connection.once('connected', function() { cb(); }); },
					function(cb) { channel.attach(cb); },
					function(cb) {
						var transport = realtime.connection.connectionManager.activeProtocol.transport,
							originalOnProtocolMessage = transport.onProtocolMessage;

						transport.onProtocolMessage = function(message) {
							/* make sure we don't get an ack! */
							if(message.action !== 1) {
								originalOnProtocolMessage.apply(this, arguments);
							}
						};
						channel.publish('foo', 'bar', function(err) {
							expect(err, 'Publish failed as expected');
							expect(realtime.connection.state).to.equal(expectedRealtimeState, 'check realtime state is ' + expectedRealtimeState);
							expect(err.code).to.equal(expectedNackCode, 'Check error code was ' + expectedNackCode);
							counter.assert();
							cb();
						});
						helper.Utils.nextTick(function() {
							failureFn(realtime);
						});
					}
				], function(err) {
					if(err) expect(false, helper.displayError(err));
					closeAndFinish(done, realtime);
				});
			};
		}

		it('nack_on_connection_suspended', nack_on_connection_failure(
			function(realtime) { helper.becomeSuspended(realtime); },
			'suspended',
			80002
		));

		it('nack_on_connection_failed', nack_on_connection_failure(
			function(realtime) {
				realtime.connection.connectionManager.activeProtocol.transport.onProtocolMessage({
					action: 9,
					error: {statusCode: 401, code: 40100, message: "connection failed because reasons"}
				});},
			'failed',
			40100
		));

		it('nack_on_connection_closed', nack_on_connection_failure(
			function(realtime) { realtime.close(); },
			'closed',
			80017
		));

		it('idle_transport_timeout', function(done) {
			var realtime = helper.AblyRealtime({realtimeRequestTimeout: 100}),
				originalOnProtocolMessage;

			counter.expect(3);

			realtime.connection.connectionManager.on('transport.pending', function(transport) {
				originalOnProtocolMessage = transport.onProtocolMessage;
				transport.onProtocolMessage = function(message) {
					if(message.action === 4) {
						message.connectionDetails.maxIdleInterval = 100;
					}
					originalOnProtocolMessage.call(this, message);
				};
			});

			realtime.connection.once('connected', function() {
				realtime.connection.once(function(statechange) {
					/* will go to connecting if there's another transport scheduled for activation */
					expect(statechange.current === 'disconnected' || statechange.current === 'connecting', 'check connection goes to disconnected/connecting');
					expect(statechange.reason.code).to.equal(80003, 'check code');
					expect(statechange.reason.statusCode).to.equal(408, 'check statusCode');
					counter.assert();
					closeAndFinish(done, realtime);
				});
			});
		});

		/* RTN14d last sentence: Check that if we received a 5xx disconnected, when
		* we try again we use a fallback host */
		helper.testOnAllTransports('try_fallback_hosts_on_placement_constraint', function(realtimeOpts) { return function(done) {
			/* Use the echoserver as a fallback host because it doesn't support
			* websockets, so it'll fail to connect, which we can detect */
			var realtime = helper.AblyRealtime(utils.mixin({fallbackHosts: ['echo.ably.io']}, realtimeOpts)),
				connection = realtime.connection,
				connectionManager = connection.connectionManager;

			counter.expect(1);
			connection.once('connected', function() {
				connection.once('connecting', function() {
					connection.once(function(stateChange) {
						expect(stateChange.current).to.equal('disconnected', 'expect next connection attempt to fail due to using the (bad) fallback host')
						counter.assert();
						closeAndFinish(done, realtime);
					});
				});
				connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
					action: 6,
					error: {
						message: "fake placement constraint",
						code: 50320,
						statusCode: 503
					}
				}));
			});
		}});

		// RTL 17
		it('no_messages_if_not_attached', function(done) {
			
			var testName = 'no_messages_if_not_attached';
			var testMessage = { foo: 'bar', count: 1, status: 'active' };
			var testMessage2 = { foo: 'bar', count: 2, status: 'active' };
			
			counter.expect(2);
			
			try {

				var sender_realtime = helper.AblyRealtime();
				var sender_channel = sender_realtime.channels.get(testName);

				var messageReceived = false;
				
				sender_channel.subscribe(function(message) {

					if(messageReceived) {
						expect(false, 'Message received when channel not in ATTACHED state.');
					}

					messageReceived = true;
					expect(testMessage).to.deep.equal(message.data, 'Check first message received');
					
					var connectionManager = sender_realtime.connection.connectionManager;

					var onChannelMsgOrig = connectionManager.onChannelMessage;
					connectionManager.onChannelMessage = function(msg, transport) {
						if(msg.action === 15) {
							sender_channel.requestState('attaching');
						}
						onChannelMsgOrig.call(connectionManager, msg, transport);
					};
					
					sender_channel.publish('1', testMessage2);

					var success = setTimeout(function () {
						expect(true);
						counter.assert();
						closeAndFinish(done, sender_realtime);
					}, 7000);
					
				});

				sender_realtime.connection.on('connected', function() {
					sender_channel.publish('0', testMessage);
				});
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, sender_realtime); }
		});
	});
});
