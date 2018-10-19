"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		rest,
		publishIntervalHelper = function(currentMessageNum, channel, dataFn, onPublish){
			return function(currentMessageNum) {
				channel.publish('event0', dataFn(), function() {
					onPublish();
				});
			};
		},
		publishAtIntervals = function(numMessages, channel, dataFn, onPublish){
			for(var i = numMessages; i > 0; i--) {
				setTimeout(publishIntervalHelper(i, channel, dataFn, onPublish), 2*i);
			}
		},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		bestTransport = helper.bestTransport;

	exports.setupUpgrade = function(test) {
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

	exports.setupUpgradeRest = function(test) {
		test.expect(1);
		rest = helper.AblyRest();
		test.ok(true, 'rest client set up');
		test.done();
	};

	/*
	 * Publish once with REST, before upgrade, verify message received
	 */
	exports.publishpreupgrade = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);
			/* connect and attach */
			realtime.connection.on('connected', function() {
				//console.log('publishpreupgrade: connected');
				var testMsg = 'Hello world';
				var rtChannel = realtime.channels.get('publishpreupgrade');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + helper.displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to event */
					rtChannel.subscribe('event0', function(msg) {
						test.expect(2);
						test.ok(true, 'Received event0');
						test.equal(msg.data, testMsg, 'Unexpected msg text received');
						closeAndFinish(test, realtime);
					});

					/* publish event */
					var restChannel = rest.channels.get('publishpreupgrade');
					restChannel.publish('event0', testMsg, function(err) {
						if(err) {
							test.ok(false, 'Publish failed with error: ' + helper.displayError(err));
							closeAndFinish(test, realtime);
						}
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Publish once with REST, after upgrade, verify message received on active transport
	 */
	exports.publishpostupgrade0 = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* subscribe to event */
			var rtChannel = realtime.channels.get('publishpostupgrade0');
			rtChannel.subscribe('event0', function(msg) {
				test.expect(2);
				test.ok(true, 'Received event0');
				test.equal(msg.data, testMsg, 'Unexpected msg text received');
				var closeFn = function() {
					closeAndFinish(test, realtime);
				};
				if (isBrowser)
					setTimeout(closeFn, 0);
				else
					process.nextTick(closeFn);
			});

			/* publish event */
			var testMsg = 'Hello world';
			var restChannel = rest.channels.get('publishpostupgrade0');
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				//console.log('publishpostupgrade0: transport active: transport = ' + transport);
				if(transport.toString().match(/wss?\:/)) {
					if(rtChannel.state == 'attached') {
						//console.log('*** publishpostupgrade0: publishing (channel attached on transport active) ...');
						restChannel.publish('event0', testMsg, function(err) {
							//console.log('publishpostupgrade0: publish returned err = ' + displayError(err));
							if(err) {
								test.ok(false, 'Publish failed with error: ' + displayError(err));
								closeAndFinish(test, realtime);
							}
						});
					} else {
						rtChannel.on('attached', function() {
							//console.log('*** publishpostupgrade0: publishing (channel attached after wait) ...');
							restChannel.publish('event0', testMsg, function(err) {
								//console.log('publishpostupgrade0: publish returned err = ' + displayError(err));
								if(err) {
									test.ok(false, 'Publish failed with error: ' + displayError(err));
									closeAndFinish(test, realtime);
								}
							});
						});
					}
				}
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Publish once with REST, after upgrade, verify message not received on inactive transport
	 */
	exports.publishpostupgrade1 = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* subscribe to event */
			var rtChannel = realtime.channels.get('publishpostupgrade1');
			rtChannel.subscribe('event0', function(msg) {
				test.expect(2);
				test.ok(true, 'Received event0');
				test.equal(msg.data, testMsg, 'Unexpected msg text received');
				var closeFn = function() {
					closeAndFinish(test, realtime);
				};
				if (isBrowser)
					setTimeout(closeFn, 0);
				else
					process.nextTick(closeFn);
			});

			/* publish event */
			var testMsg = 'Hello world';
			var restChannel = rest.channels.get('publishpostupgrade1');
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(helper.isComet(transport)) {
					/* override the processing of incoming messages on this channel
					 * so we can see if a message arrived.
					 * NOTE: this relies on knowledge of the internal implementation
					 * of the transport */

					var originalOnProtocolMessage = transport.onProtocolMessage;
					transport.onProtocolMessage = function(message) {
						if(message.messages)
							test.ok(false, 'Message received on comet transport');
						originalOnProtocolMessage.apply(this, arguments);
					};
				}
			});
			connectionManager.on('transport.active', function(transport) {
				if(helper.isWebsocket(transport)) {
					if(rtChannel.state == 'attached') {
						//console.log('*** publishing (channel attached on transport active) ...');
						restChannel.publish('event0', testMsg);
					} else {
						rtChannel.on('attached', function() {
							//console.log('*** publishing (channel attached after wait) ...');
							restChannel.publish('event0', testMsg);
						});
					}
				}
			});

			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/**
	 * Publish and subscribe, text protocol
	 */
	exports.upgradepublish0 = function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				closeAndFinish(test, realtime);
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var transportOpts = {useBinaryProtocol: false, transports: helper.availableTransports};
		var realtime = helper.AblyRealtime(transportOpts);
		test.expect(count);
		var channel = realtime.channels.get('upgradepublish0');
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		}, function() {
			var dataFn = function() { return 'Hello world at: ' + new Date() };
			publishAtIntervals(count, channel, dataFn, onPublish);
		});
	};

	/**
	 * Publish and subscribe, binary protocol
	 */
	exports.upgradepublish1 = function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				closeAndFinish(test, realtime);
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		var realtime = helper.AblyRealtime(transportOpts);
		test.expect(count);
		var channel = realtime.channels.get('upgradepublish1');
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		}, function() {
			var dataFn = function() { return 'Hello world at: ' + new Date() };
			publishAtIntervals(count, channel, dataFn, onPublish);
		});
	};

	/*
	 * Base upgrade case
	 */
	exports.upgradebase0 = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime(transportOpts);
			/* check that we see the transport we're interested in get activated,
			 * and that we see the comet transport deactivated */
			var failTimer = setTimeout(function() {
				test.ok(false, 'upgrade heartbeat failed (timer expired)');
				closeAndFinish(test, realtime);
			}, 120000);

			var connectionManager = realtime.connection.connectionManager;
			connectionManager.once('transport.inactive', function(transport) {
				if(transport.toString().indexOf('/comet/') > -1)
					test.ok(true, 'verify comet transport deactivated');
			});
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/)) {
					clearTimeout(failTimer);
					var closeFn = function() {
						test.ok(true, 'verify upgrade to ws transport');
						closeAndFinish(test, realtime);
					};
					if (isBrowser)
						setTimeout(closeFn, 0);
					else
						process.nextTick(closeFn);
				}
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check active heartbeat, text protocol
	 */
	exports.upgradeheartbeat0 = function(test) {
		var transportOpts = {useBinaryProtocol: false, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/))
					transport.on('heartbeat', function() {
						transport.off('heartbeat');
						clearTimeout(failTimer);
						test.ok(true, 'verify upgrade heartbeat');
						closeAndFinish(test, realtime);
					});
				transport.ping();
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					closeAndFinish(test, realtime);
				}, 120000);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check active heartbeat, binary protocol
	 */
	exports.upgradeheartbeat1 = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/))
					transport.on('heartbeat', function() {
						transport.off('heartbeat');
						clearTimeout(failTimer);
						test.ok(true, 'verify upgrade heartbeat');
						closeAndFinish(test, realtime);
					});
				transport.ping();
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					closeAndFinish(test, realtime);
				}, 120000);
			});
				monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check heartbeat does not fire on inactive transport, text protocol
	 */
	exports.upgradeheartbeat2 = function(test) {
		var transportOpts = {useBinaryProtocol: false, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer, cometTransport, wsTransport;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				var transportDescription = transport.toString();
				//console.log('active transport: ' + transportDescription);
				if(transportDescription.indexOf('/comet/') > -1) {
					cometTransport = transport;
					cometTransport.on('heartbeat', function () {
						test.ok(false, 'verify heartbeat does not fire on inactive transport');
						closeAndFinish(test, realtime);
					});
				}
				if(transportDescription.match(/wss?\:/)) {
					wsTransport = transport;
					wsTransport.on('heartbeat', function () {
						clearTimeout(failTimer);
						/* wait a couple of seconds to give it time
						 * in case it might still fire */
						test.ok(true, 'verify upgrade heartbeat');
						setTimeout(function () {
							closeAndFinish(test, realtime);
						}, 2000);
					});
					wsTransport.ping();
				}
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					closeAndFinish(test, realtime);
				}, 120000);
			});
				monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check heartbeat does not fire on inactive transport, binary protocol
	 */
	exports.upgradeheartbeat3 = function(test) {
		var transportOpts = {useBinaryProtocol: true, transports: helper.availableTransports};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer, cometTransport, wsTransport;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				var transportDescription = transport.toString();
				//console.log('active transport: ' + transportDescription);
				if(transportDescription.indexOf('/comet/') > -1) {
					cometTransport = transport;
					cometTransport.on('heartbeat', function () {
						test.ok(false, 'verify heartbeat does not fire on inactive transport');
						closeAndFinish(test, realtime);
					});
				}
				if(transportDescription.match(/wss?\:/)) {
					wsTransport = transport;
					wsTransport.on('heartbeat', function () {
						clearTimeout(failTimer);
						/* wait a couple of seconds to give it time
						 * in case it might still fire */
						test.ok(true, 'verify upgrade heartbeat');
						setTimeout(function() {
							closeAndFinish(test, realtime);
						}, 2000);
					});
					wsTransport.ping();
				}
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					closeAndFinish(test, realtime);
				}, 120000);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.unrecoverableUpgrade = function(test) {
		test.expect(7);
		var realtime,
			fakeConnectionKey = '_____!ablyjs_test_fake-key____',
			fakeConnectionId = 'ablyjs_tes';

		try {
			/* on base transport active */
			realtime = helper.AblyRealtime({transports: helper.availableTransports});
			realtime.connection.connectionManager.once('transport.active', function(transport) {
				test.ok(transport.toString().indexOf('/comet/') > -1, 'assert first transport to become active is a comet transport');
				test.equal(realtime.connection.errorReason, null, 'Check connection.errorReason is initially null');
				/* sabotage the upgrade */
				realtime.connection.connectionManager.connectionKey = fakeConnectionKey;
				realtime.connection.connectionManager.connectionId = fakeConnectionId;

				/* on upgrade failure */
				realtime.connection.once('update', function(stateChange) {
					test.equal(stateChange.reason.code, 80008, 'Check correct (unrecoverable connection) error');
					test.equal(stateChange.current, 'connected', 'Check current is connected');
					test.equal(realtime.connection.errorReason.code, 80008, 'Check error set in connection.errorReason');
					test.equal(realtime.connection.state, 'connected', 'Check still connected');

					/* Check events not still paused */
					var channel = realtime.channels.get('unrecoverableUpgrade');
					channel.attach(function(err) {
						if(err) { test.ok(false, 'Attach error ' + helper.displayError(err)); }
						channel.subscribe(function(msg) {
							test.ok(true, 'Successfully received message');
							closeAndFinish(test, realtime);
						});
						channel.publish('msg', null);
					});
				});
			});
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check that a message that fails to publish on a comet transport can be
	 * seamlessly transferred to the websocket transport and published there
	 */
	exports.message_timeout_stalling_upgrade = function(test) {
		var realtime = helper.AblyRealtime({transports: helper.availableTransports, httpRequestTimeout: 3000}),
			channel = realtime.channels.get('timeout1'),
			connectionManager = realtime.connection.connectionManager;

		realtime.connection.once('connected', function() {
			channel.attach(function(err) {
				if(err) {
					test.ok(false, 'Attach failed with error: ' + helper.displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				/* Sabotage comet sending */
				var transport = connectionManager.activeProtocol.getTransport();
				test.ok(helper.isComet(transport), 'Check active transport is still comet');
				transport.sendUri = helper.unroutableAddress;

				async.parallel([
					function(cb) {
						channel.subscribe('event', function() {
							test.ok(true, 'Received message');
							cb();
						});
					},
					function(cb) {
						channel.publish('event', null, function(err) {
							test.ok(!err, 'Successfully published message');
							cb();
						});
					}
				], function() {
					closeAndFinish(test, realtime);
				});
			});
		});
	};

	/*
	 * Check that a lack of response to an upgrade sync doesn't stall things forever
	 */
	exports.unresponsive_upgrade_sync = function(test) {
		test.expect(5);
		var realtime = helper.AblyRealtime({transports: helper.availableTransports, realtimeRequestTimeout: 2000}),
			connection = realtime.connection;

		connection.connectionManager.on('transport.pending', function(transport) {
			if(!helper.isWebsocket(transport)) return;

			var originalOnProtocolMessage = transport.onProtocolMessage;
			/* Stub out sync message one time */
			transport.onProtocolMessage = function(message) {
				if(message.action === 16) {
					connection.connectionManager.off('transport.pending');
					test.ok(true, 'sync received');
					transport.onProtocolMessage = originalOnProtocolMessage;
				} else {
					originalOnProtocolMessage.call(transport, message);
				}
			};
		});

		connection.once('connected', function() {
			test.ok(true, 'First connected');
			connection.once('disconnected', function() {
				test.ok(true, 'After sync times out, disconnected');
				connection.once('connected', function() {
					test.ok(true, 'Connect again');
					if(helper.isWebsocket(connection.connectionManager.activeProtocol.getTransport())) {
						/* Must be running multiple tests at once and another one set the transport preference */
						test.ok(true, 'Upgrade not tried again because of test parallelism');
						closeAndFinish(test, realtime);
					} else {
						connection.connectionManager.on('transport.active', function(transport) {
							if(helper.isWebsocket(transport)) {
								test.ok(true, 'Check upgrade is tried again, and this time, succeeds');
								closeAndFinish(test, realtime);
							}
						});
					}
				});
			});
		});
	};

	/*
	 * Check that after a successful upgrade, the transport pref is persisted,
	 * and subsequent connections do not upgrade
	 */
	exports.persist_transport_prefs = function(test) {
		var realtime = helper.AblyRealtime({transports: helper.availableTransports}),
			connection = realtime.connection,
			connectionManager = connection.connectionManager;

		async.series([
			function(cb) {
				connectionManager.once('transport.active', function(transport) {
					test.ok(helper.isComet(transport), 'Check first transport to become active is comet');
					cb();
				});
			},
			function(cb) {
				connectionManager.once('transport.active', function(transport) {
					test.ok(helper.isWebsocket(transport), 'Check second transport to become active is ws');
					cb();
				});
			},
			function(cb) {
				connection.once('closed', function() {
					test.ok(true, 'closed');
					cb();
				});
				helper.Utils.nextTick(function() {
					connection.close();
				});
			},
			function(cb) {
				connectionManager.once('transport.active', function(transport) {
					test.ok(helper.isWebsocket(transport), 'Check first transport to become active the second time round is websocket');
					cb();
				});
				connection.connect();
			}
		], function() {
			closeAndFinish(test, realtime);
		});
	};

	/*
	 * Check that upgrades succeed even if the original transport dies before the sync
	 */
	exports.upgrade_original_transport_dies = function(test) {
		var realtime = helper.AblyRealtime({transports: helper.availableTransports}),
			connection = realtime.connection,
			connectionManager = connection.connectionManager;

		async.series([
			function(cb) {
				connectionManager.once('transport.active', function(transport) {
					test.ok(helper.isComet(transport), 'Check first transport to become active is comet');
					cb();
				});
			},
			function(cb) {
				connectionManager.on('transport.pending', function(transport) {
					if(!helper.isWebsocket(transport)) return; // in browser, might be xhr_streaming
					connectionManager.off('transport.pending');
					/* Abort comet transport nonfatally */
					var baseTransport = connectionManager.activeProtocol.getTransport();
					test.ok(helper.isComet(baseTransport), 'Check original transport is still comet');
					/* Check that if we do get a statechange, it's to connecting, not disconnected. */
					var stateChangeListener = function(stateChange) {
						test.equal(stateChange.current, 'connecting', 'check that deactivateTransport only drops us to connecting as another transport is ready for activation');
					};
					connection.once(stateChangeListener);
					connectionManager.once('connectiondetails', function() {
						connection.off(stateChangeListener);
						/* Check the upgrade completed  */
						var newActiveTransport = connectionManager.activeProtocol.getTransport();
						test.equal(transport, newActiveTransport, 'Check the upgrade transport is now active');
						cb();
					})
					transport.once('connected', function() {
						baseTransport.disconnect({code: 50000, statusCode: 500, message: "a non-fatal transport error"});
					});
				});
			}
		], function() {
			closeAndFinish(test, realtime);
		});
	};

	return module.exports = (bestTransport === 'web_socket') ? helper.withTimeout(exports) : {};
});
