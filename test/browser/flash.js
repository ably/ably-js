/*
 * Some flash-specific tests
 */
this.flash = {
	flashconnect0: function(test) {
		test.expect(1);
		try {
			var ably = new Ably.Realtime({
				restHost:testVars.realtimeHost,
				restPort:testVars.realtimePort,
				wsHost:testVars.realtimeHost,
				wsPort:testVars.realtimePort,
				key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value,
				transports: ['flash_socket']
			});
			ably.connection.on('connected', function() {
				test.ok(true, 'Flash connect with key');
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
			test.ok(false, 'Flash connect with key failed with exception: ' + e.stack);
			test.done();
		}
	}
};
