"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		utils = helper.Utils,
		noop = function() {},
		simulateDroppedConnection = helper.simulateDroppedConnection,
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
		test.expect(availableTransports.length + 1);
		try {
			var failure_test = function(transports) {
				return function(cb) {
					var realtime = helper.AblyRealtime({key: "this.is:wrong", transports: transports});
					realtime.connection.on('failed', function() {
						test.ok(true, 'connection state for ' + transports + ' was failed, as expected');
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
						realtimeHost: 'example.com',
						restHost: 'example.com',
						/* Timings note: some transports fail immediately with an invalid
						* host, others take longer; so set the realtimeRequestTimeout to be
						* small enough that the max difference is never large enough that
						* the suspended timeout trips before three connection cycles */
						disconnectedRetryTimeout: 1000,
						realtimeRequestTimeout: 50,
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
		test.expect(18);
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
				failChan.unsubscribe('event', noop, function(err) {
					test.ok(err, "unsubscribe failed");
					test.equal(err.code, channelFailedCode, "unsubscribe failure code");
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

	return module.exports = helper.withTimeout(exports);
});
