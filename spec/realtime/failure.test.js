"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		utils = helper.Utils,
		noop = function() {},
		simulateDroppedConnection = helper.simulateDroppedConnection,
		createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
		availableTransports = helper.availableTransports;

	exports.setupFailure = function(test) {
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
	 * Connect with invalid credentials on various transports; connection state should be 'failed'
	 */
	exports.invalid_cred_failure = function(test) {
		test.expect((availableTransports.length + 1)*4);
		try {
			var failure_test = function(transports) {
				return function(cb) {
					var realtime = helper.AblyRealtime({key: "this.is:wrong", transports: transports});
					realtime.connection.on('failed', function(connectionStateChange) {
						test.ok(true, 'connection state for ' + transports + ' was failed, as expected');
						test.equal(realtime.connection.errorReason.code, '40400', 'wrong error reason code on connection.');
						test.equal(connectionStateChange.reason.code, '40400', 'wrong error reason code on connectionStateChange');
						test.deepEqual(connectionStateChange.reason, realtime.connection.errorReason, 'error reason was not equally set on connection and connectionStateChange');
						cb(null, realtime);
					});
					realtime.connection.on('disconnected', function() {
						test.ok(false, 'connection state for transports ' + transports + ' should be failed, not disconnected');
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
						test.ok(false, helper.displayError(err));
					}
					closeAndFinish(test, realtimes);
				}
			);
		} catch(e) {
			test.ok(false, 'connection failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Connect with various transports, forcibly break the transport, connection state
	 * should be 'disconnected'
	 */
	exports.break_transport = function(test) {
		test.expect(availableTransports.length + 1);
		try {
			var break_test = function(transports) {
				return function(cb) {
					var realtime = helper.AblyRealtime({transports: transports});
					realtime.connection.once('connected', function() {
						realtime.connection.once('disconnected', function() {
							test.ok(true, 'connection state for ' + transports + ' was disconnected, as expected');
							cb(null, realtime);
						});
						realtime.connection.on('failed', function() {
							test.ok(false, 'connection state for transports ' + transports + ' should be disconnected, not failed');
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
						test.ok(false, helper.displayError(err));
					}
					closeAndFinish(test, realtimes);
				}
			);
		} catch(e) {
			test.ok(false, 'connection failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Connect with various transports with a bad host, check that
	 * the connecting/disconnecting/suspended cycle works as expected
	 */
	exports.no_connection_lifecycle = function(test) {
		test.expect(availableTransports.length + 1);

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
						test.deepEqual(connectionEvents, expectedConnectionEvents, 'connection state for ' + transports + ' was ' + connectionEvents + ', expected ' + expectedConnectionEvents);
						cb(null, realtime);
					}, 4800);
				};
			};
			async.parallel(
				utils.arrMap(availableTransports, function(transport) {
					return lifecycleTest([transport]);
				}).concat(lifecycleTest(null)), // to test not specifying a transport (so will use upgrade mechanism)
				function(err, realtimes) {
					closeAndFinish(test, realtimes);
				}
			);
		} catch(e) {
			test.ok(false, 'connection failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check operations on a failed channel give the right errors
	 */
	exports.failed_channel = function(test) {
		test.expect(16);
		var realtime = helper.AblyRealtime();
		var failChan;
		var channelFailedCode = 90001;

		var tests = [
			function(callback) {
				failChan.publish('event', 'data', function(err) {
					test.ok(err, "publish failed");
					test.equal(err.code, channelFailedCode, "publish failure code");
					callback();
				});
			},
			function(callback) {
				failChan.subscribe('event', noop, function(err) {
					test.ok(err, "subscribe failed");
					test.equal(err.code, channelFailedCode, "subscribe failure code");
					callback();
				});
			},
			function(callback) {
				failChan.presence.enterClient('clientId', function(err) {
					test.ok(err, "presence enter failed");
					test.equal(err.code, channelFailedCode, "presence enter failure code");
					callback();
				});
			},
			function(callback) {
				failChan.presence.leaveClient('clientId', function(err) {
					test.ok(err, "presence leave failed");
					test.equal(err.code, channelFailedCode, "presence leave failure code");
					callback();
				});
			},
			function(callback) {
				failChan.presence.subscribe('event', noop, function(err) {
					test.ok(err, "presence subscribe failed");
					test.equal(err.code, channelFailedCode, "subscribe failure code");
					callback();
				});
			},
			function(callback) {
				failChan.presence.subscribe('event', noop, function(err) {
					test.ok(err, "presence unsubscribe failed");
					test.equal(err.code, channelFailedCode, "subscribe failure code");
					callback();
				});
			},
			function(callback) {
				failChan.presence.get(function(err) {
					test.ok(err, "presence get failed");
					test.equal(err.code, channelFailedCode, "presence get failure code");
					callback();
				});
			}
		];

		try {
			realtime.connection.once('connected', function() {
				failChan = realtime.channels.get("::");
				failChan.attach(function(err) {
					test.ok(err, "channel attach failed");
					test.equal(failChan.state, "failed", "channel in failed state");
					async.parallel(tests, function() {
						closeAndFinish(test, realtime);
					});
				});
			});
		} catch(e) {
			test.ok(false, 'caught exception: ' + e.message + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.attach_timeout = function(test) {
		var realtime = helper.AblyRealtime({realtimeRequestTimeout: 10, channelRetryTimeout: 10}),
			channel = realtime.channels.get('failed_attach'),
			originalOnMessage = channel.onMessage.bind(channel);

		channel.onMessage = function(message) {
				if(message.action === 11) { return; }
				originalOnMessage(message);
			};

		test.expect(4);
		realtime.connection.once('connected', function() {
			channel.attach(function(err) {
				test.equal(err.code, 90007, 'check channel error code');
				test.equal(err.statusCode, 408, 'check timeout statusCode');
				test.equal(channel.state, 'suspended', 'check channel goes into suspended state');
				channel.once(function(stateChange) {
					test.equal(stateChange.current, 'attaching', 'check channel tries to attach again');
					closeAndFinish(test, realtime);
				});
			});
		});
	};

	/* RTN7c
	 * Publish a message, then before it receives an ack, disconnect the
	 * transport, and let the connection go into some terminal failure state.
	 * Check that the publish callback is called with an error.
	 */
	function nack_on_connection_failure(failureFn, expectedRealtimeState, expectedNackCode) {
		return function(test) {
			test.expect(3)
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
						test.ok(err, 'Publish failed as expected');
						test.equal(realtime.connection.state, expectedRealtimeState, 'check realtime state is ' + expectedRealtimeState);
						test.equal(err.code, expectedNackCode, 'Check error code was ' + expectedNackCode);
						cb();
					});
					helper.Utils.nextTick(function() {
						failureFn(realtime);
					});
				}
			], function(err) {
				if(err) test.ok(false, helper.displayError(err));
				closeAndFinish(test, realtime);
			});
		};
	}

	exports.nack_on_connection_suspended = nack_on_connection_failure(
		function(realtime) { helper.becomeSuspended(realtime); },
		'suspended',
		80002
	);

	exports.nack_on_connection_failed = nack_on_connection_failure(
		function(realtime) {
			realtime.connection.connectionManager.activeProtocol.transport.onProtocolMessage({
				action: 9,
				error: {statusCode: 401, code: 40100, message: "connection failed because reasons"}
			});},
		'failed',
		40100
	);

	exports.nack_on_connection_closed = nack_on_connection_failure(
		function(realtime) { realtime.close(); },
		'closed',
		80017
	);

	exports.idle_transport_timeout = function(test) {
		var realtime = helper.AblyRealtime({realtimeRequestTimeout: 100}),
			originalOnProtocolMessage;

		test.expect(3);

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
				test.ok(statechange.current === 'disconnected' || statechange.current === 'connecting', 'check connection goes to disconnected/connecting');
				test.equal(statechange.reason.code, 80003, 'check code');
				test.equal(statechange.reason.statusCode, 408, 'check statusCode');
				closeAndFinish(test, realtime);
			});
		});
	};

	/* RTN14d last sentence: Check that if we received a 5xx disconnected, when
	 * we try again we use a fallback host */
	helper.testOnAllTransports(exports, 'try_fallback_hosts_on_placement_constraint', function(realtimeOpts) { return function(test) {
		/* Use the echoserver as a fallback host because it doesn't support
		 * websockets, so it'll fail to connect, which we can detect */
		var realtime = helper.AblyRealtime(utils.mixin({fallbackHosts: ['echo.ably.io']}, realtimeOpts)),
			connection = realtime.connection,
			connectionManager = connection.connectionManager;

		test.expect(1);
		connection.once('connected', function() {
			connection.once('connecting', function() {
				connection.once(function(stateChange) {
					test.equal(stateChange.current, 'disconnected', 'expect next connection attempt to fail due to using the (bad) fallback host')
					closeAndFinish(test, realtime);
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

	return module.exports = helper.withTimeout(exports);
});
