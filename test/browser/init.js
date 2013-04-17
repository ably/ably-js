/*
 * Base init case
 */
var _init = {};
var init = this.init = {};

init.initbase0 = function(test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.key0Str
		});
		ably.connection.on('connected', function() {
			test.ok(true, 'Verify init with key');
			test.done();
			ably.close();
		});
		['failed', 'suspended'].forEach(function(state) {
			ably.connection.on(state, function() {
				test.ok(false, 'Connection to server failed');
				test.done();
			});
		});
	} catch(e) {
		test.ok(false, 'Init with key failed with exception: ' + e.stack);
		test.done();
	}
};
