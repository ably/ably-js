/*
 * Base init case
 */
this.init = {
		initbase0: function(test) {
			test.expect(1);
			try {
				var ably = new Ably.Realtime({
					restHost:testVars.realtimeHost,
					restPort:testVars.realtimePort,
					wsHost:testVars.realtimeHost,
					wsPort:testVars.realtimePort,
					key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value
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
		}
};
