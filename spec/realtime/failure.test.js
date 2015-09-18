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
					realtime.connection.on('connected', function() {
						realtime.connection.on('disconnected', function() {
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

	return module.exports = exports;
});
