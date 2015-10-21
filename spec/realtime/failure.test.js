"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		simulateDroppedConnection = helper.simulateDroppedConnection,
		// Ably.Realtime.ConnectionManager not defined in node
		availableTransports = typeof Ably.Realtime.ConnectionManager === 'undefined' ? Ably.Realtime.Defaults.transports : Object.keys(Ably.Realtime.ConnectionManager.transports);


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
				availableTransports.map(function(transport) {
					return failure_test([transport]);
				}).concat(failure_test(null)), // to test not specifying a transport (so will use upgrade mechanism)
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
				availableTransports.map(function(transport) {
					return break_test([transport]);
				}).concat(break_test(null)), // to test not specifying a transport (so will use upgrade mechanism)
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
						wsHost: 'example.com',
						host: 'example.com',
						/* Timings note: some transports fail immediately with an invalid
						* host, others take longer; so set the realtimeRequestTimeout to be
						* small enough that the max difference is never large enough that
						* the suspended timeout trips before three connection cycles */
						disconnectedRetryTimeout: 1000,
						realtimeRequestTimeout: 50,
						suspendedRetryTimeout: 1000,
						connectionStateTtl: 2500
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
						'suspended',                 // at 2.5s
						'connecting', 'suspended'    // at 3.5s
					];
					setTimeout(function() {
						test.deepEqual(connectionEvents, expectedConnectionEvents, 'connection state for ' + transports + ' was ' + connectionEvents + ', expected ' + expectedConnectionEvents);
						cb(null, realtime);
					}, 4000);
				};
			};
			async.parallel(
				availableTransports.map(function(transport) {
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

	return module.exports = helper.withTimeout(exports);
});
