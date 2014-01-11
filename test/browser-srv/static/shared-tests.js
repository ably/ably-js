var sharedTests = sharedTestsClass();

function sharedTestsClass() {
	function realtimeConnection(transports) {
		var options = {
			//log: {level: 4},
			host: testVars.restHost,
			wsHost: testVars.realtimeHost,
			port: testVars.realtimePort,
			tlsPort: testVars.realtimeTlsPort,
			key: testVars.key0Str,
			tls: testVars.useTls,
			flashTransport: testVars.flashTransport
		};
		if (transports) options.transports = transports;
		return new Ably.Realtime(options);
	}

	function failWithin(timeInSeconds, test, ably, description) {
		var timeout = setTimeout(function () {
			test.ok(false, 'Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)');
			test.done();
			ably.close()
		}, timeInSeconds * 1000);

		return {
			stop: function () {
				clearTimeout(timeout);
			}
		};
	}

	return {
		realtimeConnection: realtimeConnection,

		connectionWithTransport: function (test, transport) {
			test.expect(1);
			try {
				var ably = realtimeConnection([transport]),
					connectionTimeout = failWithin(10, test, ably, 'connect');
				ably.connection.on('connected', function () {
					connectionTimeout.stop();
					test.ok(true, 'Verify ' + transport + ' connection with key');
					test.done();
					ably.close();
				});
				['failed', 'suspended'].forEach(function (state) {
					ably.connection.on(state, function () {
						connectionTimeout.stop();
						test.ok(false, transport + ' connection to server failed');
						test.done();
						ably.close();
					});
				});
			} catch (e) {
				test.ok(false, 'Init ' + transport + ' connection failed with exception: ' + e.stack);
				test.done();
				connectionTimeout.stop();
			}
		},

		heartbeatWithTransport: function (test, transport) {
			test.expect(1);
			try {
				var ably = realtimeConnection([transport]),
					connectionTimeout = failWithin(10, test, ably, 'connect'),
					heartbeatTimeout;
				/* when we see the transport we're interested in get activated,
				 * listen for the heartbeat event */
				var connectionManager = ably.connection.connectionManager;
				connectionManager.on('transport.active', function (transport) {
					if ((transport.toString().indexOf('ws://') > -1)
						|| (transport.toString().indexOf('/comet/') > -1)
						|| (transport.toString().indexOf('wss://') > -1))
						transport.once('heartbeat', function () {
							heartbeatTimeout.stop();
							test.ok(true, 'verify ' + transport + ' heartbeat');
							test.done();
							ably.close();
						});
				});

				ably.connection.on('connected', function () {
					connectionTimeout.stop();
					heartbeatTimeout = failWithin(25, test, ably, 'wait for heartbeat');
				});
				['failed', 'suspended'].forEach(function (state) {
					ably.connection.on(state, function () {
						connectionTimeout.stop();
						if (heartbeatTimeout) heartbeatTimeout.stop();
						test.ok(false, 'Connection to server failed');
						test.done();
						ably.close();
					});
				});
			} catch (e) {
				test.ok(false, transport + ' connect with key failed with exception: ' + e.stack);
				test.done();
				connectionTimeout.stop();
				if (heartbeatTimeout) heartbeatTimeout.stop();
			}
		},

		publishWithTransport: function (test, transport) {
			var count = 5;
			var sentCount = 0, receivedCount = 0, sentCbCount = 0;
			var timer;
			var checkFinish = function () {
				if ((receivedCount === count) && (sentCbCount === count)) {
					receiveMessagesTimeout.stop();
					test.done();
					ably.close();
				}
			};
			var ably = realtimeConnection([transport]),
				connectionTimeout = failWithin(5, test, ably, 'connect'),
				receiveMessagesTimeout;

			ably.connection.on('connected', function () {
				connectionTimeout.stop();
				receiveMessagesTimeout = failWithin(15, test, ably, 'wait for published messages to be received');

				timer = setInterval(function () {
					console.log('sending: ' + sentCount++);
					channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
						console.log(transport + 'publish callback called');
						sentCbCount++;
						checkFinish();
					});
					if (sentCount === count) clearInterval(timer);
				}, 1000);
			});

			test.expect(count);
			var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
			/* subscribe to event */
			channel.subscribe('event0', function (msg) {
				test.ok(true, 'Received event0');
				console.log(transport + 'event received');
				receivedCount++;
				checkFinish();
			});
		}
	};
}