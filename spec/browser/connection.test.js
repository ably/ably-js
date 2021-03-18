'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
	var expect = chai.expect;
	var closeAndFinish = helper.closeAndFinish;
	var monitorConnection = helper.monitorConnection;
	var simulateDroppedConnection = helper.simulateDroppedConnection;
	var transportPreferenceName = 'ably-transport-preference';

	function supportedBrowser() {
		if (document.body.ononline === undefined) {
			console.log('Online events not supported; skipping connection.test.js');
			return false;
		}

		if (!window.WebSocket || !window.localStorage) {
			console.log('Websockets or local storage not supported; skipping connection.test.js');
			return false;
		}

		// IE doesn't support creating your own events with new
		try {
			var testEvent = new Event('foo');
		} catch (e) {
			console.log('On IE; skipping connection.test.js');
			return false;
		}

		return true;
	}

	function eraseSession(name) {
		window.sessionStorage && window.sessionStorage.removeItem(name);
	}

	if (supportedBrowser()) {
		describe('browser/connection', function () {
			this.timeout(60 * 1000);

			before(function (done) {
				helper.setupApp(function (err) {
					if (err) {
						done(err);
						return;
					}
					done();
				});

				/* Ensure session is clean for persistance tests */
				eraseSession('ably-connection-recovery');
			});

			it('device_going_offline_causes_disconnected_state', function (done) {
				var realtime = helper.AblyRealtime(),
					connection = realtime.connection,
					offlineEvent = new Event('offline', { bubbles: true });

				monitorConnection(done, realtime);

				connection.once('connected', function () {
					var connectedAt = new Date().getTime();
					connection.once('disconnected', function () {
						var disconnectedAt = new Date().getTime();
						try {
							expect(
								disconnectedAt - connectedAt < 1500,
								'Offline event caused connection to move to the disconnected state'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						connection.once('connecting', function () {
							var reconnectingAt = new Date().getTime();
							try {
								expect(
									reconnectingAt - disconnectedAt < 1500,
									'Client automatically reattempts connection without waiting for disconnect timeout, even if the state is still offline'
								).to.be.ok;
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							connection.once('connected', function () {
								closeAndFinish(done, realtime);
							});
						});
					});

					// simulate offline event, expect connection moves to disconnected state and waits to retry connection
					document.dispatchEvent(offlineEvent);
				});
			});

			it('device_going_online_causes_disconnected_connection_to_reconnect_immediately', function (done) {
				/* Give up trying to connect fairly quickly */
				var realtime = helper.AblyRealtime({ realtimeRequestTimeout: 1000 }),
					connection = realtime.connection,
					onlineEvent = new Event('online', { bubbles: true });

				monitorConnection(done, realtime);

				// simulate the internet being failed by stubbing out tryATransport to foil
				// the initial connection. (No immediate reconnect attempt since it was never
				// connected in the first place)
				var oldTransport = connection.connectionManager.tryATransport;
				connection.connectionManager.tryATransport = function () {};

				connection.once('disconnected', function () {
					var disconnectedAt = new Date();
					try {
						expect(
							connection.state == 'disconnected',
							'Connection should still be disconnected before we trigger it to connect'
						).to.be.ok;
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					connection.once('connecting', function () {
						try {
							expect(
								new Date() - disconnectedAt < 1500,
								'Online event should have caused the connection to enter the connecting state without waiting for disconnect timeout'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						connection.once('connected', function () {
							closeAndFinish(done, realtime);
						});
					});
					// restore the 'internet' and simulate an online event
					connection.connectionManager.tryATransport = oldTransport;
					document.dispatchEvent(onlineEvent);
				});
			});

			it('device_going_online_causes_suspended_connection_to_reconnect_immediately', function (done) {
				/* move to suspended state after 2s of being disconnected */
				var realtime = helper.AblyRealtime({
						disconnectedRetryTimeout: 500,
						realtimeRequestTimeout: 500,
						connectionStateTtl: 2000
					}),
					connection = realtime.connection,
					onlineEvent = new Event('online', { bubbles: true });

				// Easiest way to have all transports attempt fail it to stub out tryATransport
				connection.connectionManager.tryATransport = function () {};

				connection.on('failed', function () {
					closeAndFinish(done, realtime, new Error('connection to server failed'));
				});

				connection.once('suspended', function () {
					var suspendedAt = new Date();
					try {
						expect(
							connection.state == 'suspended',
							'Connection should still be suspended before we trigger it to connect'
						).to.be.ok;
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					connection.once('connecting', function () {
						try {
							expect(
								new Date() - suspendedAt < 1500,
								'Online event should have caused the connection to enter the connecting state without waiting for suspended timeout'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					});
					// simulate online event
					document.dispatchEvent(onlineEvent);
				});
			});

			/* uses internal realtime knowledge of the format of the connection key to
			 * check if a connection key is the result of a successful recovery of another */
			function sameConnection(keyA, keyB) {
				return keyA.split('-')[0] === keyB.split('-')[0];
			}

			it('page_refresh_with_recovery', function (done) {
				var realtimeOpts = {
						recover: function (lastConnectionDetails, cb) {
							cb(true);
						}
					},
					realtime = helper.AblyRealtime(realtimeOpts),
					refreshEvent = new Event('beforeunload', { bubbles: true });

				monitorConnection(done, realtime);

				realtime.connection.once('connected', function () {
					var connectionKey = realtime.connection.key;
					document.dispatchEvent(refreshEvent);
					try {
						expect(realtime.connection.state).to.equal(
							'connected',
							'check connection state initially unaffected by page refresh'
						);
						simulateDroppedConnection(realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}

					var newRealtime = helper.AblyRealtime(realtimeOpts);
					newRealtime.connection.once('connected', function () {
						try {
							expect(
								sameConnection(connectionKey, newRealtime.connection.key),
								'Check new realtime recovered the connection from the cookie'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, [realtime, newRealtime], err);
							return;
						}
						closeAndFinish(done, [realtime, newRealtime]);
					});
				});
			});

			it('page_refresh_persist_with_denied_recovery', function (done) {
				var realtimeOpts = {
					recover: function (lastConnectionDetails, cb) {
						cb(false);
					}
				};
				var realtime = helper.AblyRealtime(realtimeOpts),
					refreshEvent = new Event('beforeunload', { bubbles: true });

				monitorConnection(done, realtime);

				realtime.connection.once('connected', function () {
					var connectionKey = realtime.connection.key;
					document.dispatchEvent(refreshEvent);
					try {
						expect(realtime.connection.state).to.equal(
							'connected',
							'check connection state initially unaffected by page refresh'
						);
						simulateDroppedConnection(realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}

					var newRealtime = helper.AblyRealtime(realtimeOpts);
					newRealtime.connection.once('connected', function () {
						try {
							expect(
								!sameConnection(connectionKey, newRealtime.connection.key),
								'Check new realtime created a new connection'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, [realtime, newRealtime], err);
							return;
						}
						closeAndFinish(done, [realtime, newRealtime]);
					});
					monitorConnection(done, newRealtime);
				});
			});

			it('page_refresh_with_close_on_unload', function (done) {
				var realtime = helper.AblyRealtime({ closeOnUnload: true }),
					refreshEvent = new Event('beforeunload', { bubbles: true });

				monitorConnection(done, realtime);

				realtime.connection.once('connected', function () {
					try {
						var connectionKey = realtime.connection.key;
						document.dispatchEvent(refreshEvent);
						var state = realtime.connection.state;
						expect(state == 'closing' || state == 'closed', 'check page refresh triggered a close').to.be.ok;
					} catch (err) {
						done(err);
						return;
					}
					done();
				});
			});

			it('page_refresh_with_manual_recovery', function (done) {
				var realtime = helper.AblyRealtime({ closeOnUnload: false }),
					refreshEvent = new Event('beforeunload', { bubbles: true });

				monitorConnection(done, realtime);

				realtime.connection.once('connected', function () {
					var connectionKey = realtime.connection.key,
						recoveryKey = realtime.connection.recoveryKey;

					document.dispatchEvent(refreshEvent);
					try {
						expect(realtime.connection.state).to.equal(
							'connected',
							'check connection state initially unaffected by page refresh'
						);
						simulateDroppedConnection(realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}

					var newRealtime = helper.AblyRealtime({ recover: recoveryKey });
					newRealtime.connection.once('connected', function () {
						try {
							expect(
								sameConnection(connectionKey, newRealtime.connection.key),
								'Check new realtime recovered the old'
							).to.be.ok;
						} catch (err) {
							closeAndFinish(done, [realtime, newRealtime], err);
							return;
						}
						closeAndFinish(done, [realtime, newRealtime]);
					});
				});
			});

			it('persist_preferred_transport', function (done) {
				var realtime = helper.AblyRealtime();

				realtime.connection.connectionManager.on(function (transport) {
					if (this.event === 'transport.active' && transport.shortName === 'web_socket') {
						try {
							expect(window.localStorage.getItem(transportPreferenceName)).to.equal(
								JSON.stringify({ value: 'web_socket' })
							);
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					}
				});
				monitorConnection(done, realtime);
			});

			it('use_persisted_transport0', function (done) {
				var transportPreferenceName = 'ably-transport-preference';
				window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: 'web_socket' }));

				var realtime = helper.AblyRealtime();

				realtime.connection.connectionManager.on(function (transport) {
					if (this.event === 'transport.active') {
						try {
							expect(transport.shortName).to.equal('web_socket');
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					}
				});
				monitorConnection(done, realtime);
			});

			it('use_persisted_transport1', function (done) {
				window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: 'xhr_streaming' }));

				var realtime = helper.AblyRealtime();

				realtime.connection.connectionManager.on(function (transport) {
					if (this.event === 'transport.active') {
						try {
							expect(transport.shortName).to.equal('xhr_streaming');
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					}
				});
				monitorConnection(done, realtime);
			});

			it('browser_transports', function (done) {
				var realtime = helper.AblyRealtime();
				try {
					expect(realtime.connection.connectionManager.baseTransport).to.equal('xhr_polling');
					expect(realtime.connection.connectionManager.upgradeTransports).to.deep.equal([
						'xhr_streaming',
						'web_socket'
					]);
				} catch (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				closeAndFinish(done, realtime);
			});
		});
	}
});

