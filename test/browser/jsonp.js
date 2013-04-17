/*
 * Some flash-specific tests
 */
this.jsonp = {
	jsonpconnect0: function(test) {
		test.expect(1);
		try {
			var ably = new Ably.Realtime({
				restHost:testVars.realtimeHost,
				restPort:testVars.realtimePort,
				wsHost:testVars.realtimeHost,
				wsPort:testVars.realtimePort,
				key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value,
				transports: ['jsonp']
			});
			ably.connection.on('connected', function() {
				test.ok(true, 'JSONP connect with key');
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
			test.ok(false, 'JSONP connect with key failed with exception: ' + e.stack);
			test.done();
		}
	},

	/*
	 * Check heartbeat
	 */
	jsonpheartbeat0: function(test) {
		test.expect(1);
		try {
			var ably = new Ably.Realtime({
				restHost:testVars.realtimeHost,
				restPort:testVars.realtimePort,
				wsHost:testVars.realtimeHost,
				wsPort:testVars.realtimePort,
				key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value,
				transports: ['jsonp']
			});
			ably.connection.once('connected', function() {
				var failTimer = setTimeout(function() {
					test.ok(false, 'ws connect with key failed (timer expired)');
					test.done();
				}, 120000);
				ably.connection.connectionManager.transport.on('heartbeat', function() {
					clearTimeout(failTimer);
					test.ok(true, 'verify ws connect with key');
					test.done();
					ably.close();
				});
			});
			['failed', 'suspended'].forEach(function(state) {
				ably.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
			test.done();
		}
	}
};
