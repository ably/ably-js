'use strict';

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
	_exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		simulateDroppedConnection = helper.simulateDroppedConnection,
		transportPreferenceName = 'ably-transport-preference';

	function supportedBrowser(test) {
		if(document.body.ononline === undefined) {
			console.log('Online events not supported; skipping connection.test.js');
			return false;
		}

		if(!window.WebSocket || !window.localStorage) {
			console.log('Websockets or local storage not supported; skipping connection.test.js');
			return false;
		}

		// IE doesn't support creating your own events with new
		try {
			var testEvent = new Event('foo');
		} catch(e) {
			console.log('On IE; skipping connection.test.js');
			return false;
		}

		return true;
	}

	function eraseSession(name) {
		window.sessionStorage && window.sessionStorage.removeItem(name);
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

		/* Ensure session is clean for persistance tests */
		eraseSession('ably-connection-recovery');
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

		// simulate the internet being failed by stubbing out tryATransport to foil
		// the initial connection. (No immediate reconnect attempt since it was never
		// connected in the first place)
		var oldTransport = connection.connectionManager.tryATransport;
		connection.connectionManager.tryATransport = function(){};

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
			connection.connectionManager.tryATransport= oldTransport;
			document.dispatchEvent(onlineEvent);
		});
	};

	exports.device_going_online_causes_suspended_connection_to_reconnect_immediately = function(test) {
		/* move to suspended state after 2s of being disconnected */
		var realtime = helper.AblyRealtime({ disconnectedRetryTimeout: 500, realtimeRequestTimeout: 500, connectionStateTtl: 2000 }),
		connection = realtime.connection,
		onlineEvent = new Event('online', {'bubbles': true});

		// Easiest way to have all transports attempt fail it to stub out tryATransport
		connection.connectionManager.tryATransport = function(){};

		test.expect(2);
		connection.on('failed', function () {
			test.ok(false, 'connection to server failed');
			closeAndFinish(test, realtime);
		});

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

	/* uses internal realtime knowledge of the format of the connection key to
	* check if a connection key is the result of a successful recovery of another */
	function sameConnection(keyA, keyB) {
		return keyA.split('-')[0] === keyB.split('-')[0];
	}

	exports.page_refresh_with_recovery = function(test) {
		var realtimeOpts = { recover: function(lastConnectionDetails, cb) { cb(true); } },
			realtime = helper.AblyRealtime(realtimeOpts),
			refreshEvent = new Event('beforeunload', {'bubbles': true});

		test.expect(2);
		monitorConnection(test, realtime);

		realtime.connection.once('connected', function() {
			var connectionKey = realtime.connection.key;
			document.dispatchEvent(refreshEvent);
			test.equal(realtime.connection.state, 'connected', 'check connection state initially unaffected by page refresh');
			simulateDroppedConnection(realtime);

			var newRealtime = helper.AblyRealtime(realtimeOpts);
			newRealtime.connection.once('connected', function() {
				test.ok(sameConnection(connectionKey, newRealtime.connection.key), 'Check new realtime recovered the connection from the cookie');
				closeAndFinish(test, [realtime, newRealtime]);
			});
		});
	};

	exports.page_refresh_persist_with_denied_recovery = function(test) {
		var realtimeOpts = { recover: function(lastConnectionDetails, cb) { cb(false); } };
		var realtime = helper.AblyRealtime(realtimeOpts),
			refreshEvent = new Event('beforeunload', {'bubbles': true});

		test.expect(2);
		monitorConnection(test, realtime);

		realtime.connection.once('connected', function() {
			var connectionKey = realtime.connection.key;
			document.dispatchEvent(refreshEvent);
			test.equal(realtime.connection.state, 'connected', 'check connection state initially unaffected by page refresh');
			simulateDroppedConnection(realtime);

			var newRealtime = helper.AblyRealtime(realtimeOpts);
			newRealtime.connection.once('connected', function() {
				test.ok(!sameConnection(connectionKey, newRealtime.connection.key), 'Check new realtime created a new connection');
				closeAndFinish(test, [realtime, newRealtime]);
			});
			monitorConnection(test, newRealtime);
		});
	};

	exports.page_refresh_with_close_on_unload = function(test) {
		var realtime = helper.AblyRealtime({ closeOnUnload: true }),
			refreshEvent = new Event('beforeunload', {'bubbles': true});

		test.expect(1);
		monitorConnection(test, realtime);

		realtime.connection.once('connected', function() {
			var connectionKey = realtime.connection.key;
			document.dispatchEvent(refreshEvent);
			var state = realtime.connection.state;
			test.ok(state == 'closing' || state == 'closed', 'check page refresh triggered a close');
			test.done();
		});
	};

	exports.page_refresh_with_manual_recovery = function(test) {
		var realtime = helper.AblyRealtime({ closeOnUnload: false }),
			refreshEvent = new Event('beforeunload', {'bubbles': true});

		test.expect(2);
		monitorConnection(test, realtime);

		realtime.connection.once('connected', function() {
			var connectionKey = realtime.connection.key,
				recoveryKey = realtime.connection.recoveryKey;

			document.dispatchEvent(refreshEvent);
			test.equal(realtime.connection.state, 'connected', 'check connection state initially unaffected by page refresh');
			simulateDroppedConnection(realtime);

			var newRealtime = helper.AblyRealtime({ recover: recoveryKey });
			newRealtime.connection.once('connected', function() {
				test.ok(sameConnection(connectionKey, newRealtime.connection.key), 'Check new realtime recovered the old');
				closeAndFinish(test, [realtime, newRealtime]);
			});
		});
	};

	exports.persist_preferred_transport = function(test) {
		test.expect(1);

		var realtime = helper.AblyRealtime();

		realtime.connection.connectionManager.on(function(transport) {
			if(this.event === 'transport.active' && transport.shortName === 'web_socket') {
				test.equal(window.localStorage.getItem(transportPreferenceName), JSON.stringify({value: 'web_socket'}));
				closeAndFinish(test, realtime);
			}
		});
		monitorConnection(test, realtime);
	};

	exports.use_persisted_transport0 = function(test) {
		test.expect(1);
		var transportPreferenceName = 'ably-transport-preference';
		window.localStorage.setItem(transportPreferenceName, JSON.stringify({value: 'web_socket'}));

		var realtime = helper.AblyRealtime();

		realtime.connection.connectionManager.on(function(transport) {
			if(this.event === 'transport.active') {
				test.equal(transport.shortName, 'web_socket');
				closeAndFinish(test, realtime);
			}
		});
		monitorConnection(test, realtime);
	};

	exports.use_persisted_transport1 = function(test) {
		test.expect(1);
		window.localStorage.setItem(transportPreferenceName, JSON.stringify({value: 'xhr_streaming'}));

		var realtime = helper.AblyRealtime();

		realtime.connection.connectionManager.on(function(transport) {
			if(this.event === 'transport.active') {
				test.equal(transport.shortName, 'xhr_streaming');
				closeAndFinish(test, realtime);
			}
		});
		monitorConnection(test, realtime);
	};

	exports.browser_transports = function(test) {
		test.expect(2);
		var realtime = helper.AblyRealtime();
		test.equal(realtime.connection.connectionManager.baseTransport, 'xhr_polling');
		test.deepEqual(realtime.connection.connectionManager.upgradeTransports, ['xhr_streaming', 'web_socket']);
		closeAndFinish(test, realtime);
	}

	return module.exports = supportedBrowser() ? helper.withTimeout(exports) : {};

});
