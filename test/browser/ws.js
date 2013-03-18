/*
 * Base init case
 */
this.ws = {
		wsbase0: function(test) {
			test.expect(1);
			try {
				var ably = new Ably.Realtime({
					restHost:'localhost',
					restPort:8080,
					wsHost:'localhost',
					wsPort:8080,
					key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value
				});
				ably.connection.on('connected', function() {
					test.ok(true, 'Verify ws connection with key');
					test.done();
					ably.close();
				});
				['failed', 'suspended'].forEach(function(state) {
					ably.connection.on(state, function() {
						test.ok(false, 'Ws connection to server failed');
						test.done();
					});
				});
			} catch(e) {
				test.ok(false, 'Init ws connection failed with exception: ' + e.stack);
				test.done();
			}
		},

		/*
		 * Check heartbeat
		 */
		wsheartbeat0: function(test) {
			test.expect(1);
			try {
				var ably = new Ably.Realtime({
					restHost:'localhost',
					restPort:8080,
					wsHost:'localhost',
					wsPort:8080,
					key: testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value
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
