"use strict";

exports.setup = function(base) {
	var rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var _exports = {};
	var realtime, currentTime;

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
			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
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
			realtime.connection.on('disconnected', function() {
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