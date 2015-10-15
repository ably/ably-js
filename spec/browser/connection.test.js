"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
	_exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		simulateDroppedConnection = helper.simulateDroppedConnection;

	function supportedBrowser(test) {
		if(document.body.ononline === undefined) {
			console.log("Online events not supported; skipping connection.test.js");
			return false;
		}

		// IE doesn't support creating your own events with new
		try {
			var testEvent = new Event("foo");
		} catch(e) {
			console.log("On IE; skipping connection.test.js");
			return false;
		}

		return true;
	}

	exports.setup_realtime = function(test) {
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

	exports.device_going_offline_causes_disconnected_state = function(test) {
		var realtime = helper.AblyRealtime(),
		connection = realtime.connection,
		offlineEvent = new Event('offline', {'bubbles': true});

		test.expect(3);
		monitorConnection(test, realtime);

		connection.once('connected', function() {
			var connectedAt = new Date().getTime()
			connection.once('disconnected', function() {
				var disconnectedAt = new Date().getTime();
				test.ok(disconnectedAt - connectedAt < 1500, 'Offline event caused connection to move to the disconnected state');
				connection.once('connecting', function() {
					var reconnectingAt = new Date().getTime();
					test.ok(reconnectingAt - disconnectedAt < 1500, 'Client automatically reattempts connection without waiting for disconnect timeout, even if the state is still offline');
					connection.once('connected', function() {
						test.ok(true, 'Successfully reconnected');
						closeAndFinish(test, realtime);
					})
				});
			})

			// simulate offline event, expect connection moves to disconnected state and waits to retry connection
			document.dispatchEvent(offlineEvent);
		});
	};

	exports.device_going_online_causes_disconnected_connection_to_reconnect_immediately = function(test) {
 		/* Give up trying to connect fairly quickly */
		var realtime = helper.AblyRealtime({realtimeRequestTimeout: 1000}),
		connection = realtime.connection,
		onlineEvent = new Event('online', {'bubbles': true});

		test.expect(3);
		monitorConnection(test, realtime);

		// simulate the internet being failed by stubbing out chooseTransport to foil
		// the initial connection. (No immediate reconnect attempt since it was never
		// connected in the first place)
		var oldTransport = connection.connectionManager.chooseTransport;
		connection.connectionManager.chooseTransport = function(){};

		connection.once('disconnected', function() {
			var disconnectedAt = new Date();
			test.ok(connection.state == 'disconnected', 'Connection should still be disconnected before we trigger it to connect');
			connection.once('connecting', function() {
				test.ok(new Date() - disconnectedAt < 1500, 'Online event should have caused the connection to enter the connecting state without waiting for disconnect timeout');
				connection.once('connected', function() {
					test.ok(true, 'Successfully reconnected');
					closeAndFinish(test, realtime);
				})
			});
			// restore the 'internet' and simulate an online event
			connection.connectionManager.chooseTransport = oldTransport;
			document.dispatchEvent(onlineEvent);
		});
	};

	exports.device_going_online_causes_suspended_connection_to_reconnect_immediately = function(test) {
		/* move to suspended state after 2s of being disconnected */
		var realtime = helper.AblyRealtime({ disconnectedRetryFrequency: 500, realtimeRequestTimeout: 500, connectionStateTtl: 2000 }),
		connection = realtime.connection,
		onlineEvent = new Event('online', {'bubbles': true});

		// Easiest way to have all transports attempt fail it to stub out chooseTransport
		connection.connectionManager.chooseTransport = function(){};

		test.expect(2);
		connection.on('failed', function () {
			test.ok(false, 'connection to server failed');
			closeAndFinish(test, realtime);
		});
		connection.on(function(){console.log(this.event)})

		connection.once('suspended', function() {
			var suspendedAt = new Date();
			test.ok(connection.state == 'suspended', 'Connection should still be suspended before we trigger it to connect');
			connection.once('connecting', function() {
				test.ok(new Date() - suspendedAt < 1500, 'Online event should have caused the connection to enter the connecting state without waiting for suspended timeout');
				closeAndFinish(test, realtime);
			});
			// simulate online event
			document.dispatchEvent(onlineEvent);
		});
	};

	return module.exports = supportedBrowser() ? helper.withTimeout(exports) : {};

});
