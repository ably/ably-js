"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};

	/*
	 * Base init case
	 */
	rExports.initbase0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			realtime.connection.on('connected', function() {
				test.ok(true, 'Verify init with key');
				test.done();
				realtime.close();
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* check default  httpHost selection */
	rExports.init_defaulthost = function(test) {
		test.expect(1);
		try {
			var realtime = new base.Ably.Realtime({
				//log: {level: 4},
				key: 'not_a.real:key'
			});
			var defaultHost = realtime.connection.connectionManager.httpHosts[0];
			test.equal(defaultHost, 'rest.ably.io', 'Verify correct default rest host chosen');
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('disconnected');
			realtime.connection.on('failed', function() {
				test.done();
				realtime.close();
			});
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	return rExports;
};