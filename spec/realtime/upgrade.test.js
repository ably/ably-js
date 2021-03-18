'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
	var expect = chai.expect;
	var rest;
	var publishIntervalHelper = function (currentMessageNum, channel, dataFn, onPublish) {
		return function (currentMessageNum) {
			channel.publish('event0', dataFn(), function () {
				onPublish();
			});
		};
	};
	var publishAtIntervals = function (numMessages, channel, dataFn, onPublish) {
		for (var i = numMessages; i > 0; i--) {
			setTimeout(publishIntervalHelper(i, channel, dataFn, onPublish), 2 * i);
		}
	};
	var closeAndFinish = helper.closeAndFinish;
	var monitorConnection = helper.monitorConnection;
	var bestTransport = helper.bestTransport;

	if (bestTransport === 'web_socket') {
		describe('realtime/upgrade', function () {
			this.timeout(60 * 1000);

			before(function (done) {
				helper.setupApp(function (err) {
					if (err) {
						done(err);
						return;
					}
					rest = helper.AblyRest();
					done();
				});
			});

			afterEach(helper.clearTransportPreference);

			/*
			 * Publish once with REST, before upgrade, verify message received
			 */
			it('publishpreupgrade', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);
					/* connect and attach */
					realtime.connection.on('connected', function () {
						//console.log('publishpreupgrade: connected');
						var testMsg = 'Hello world';
						var rtChannel = realtime.channels.get('publishpreupgrade');
						rtChannel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							/* subscribe to event */
							rtChannel.subscribe('event0', function (msg) {
								try {
									expect(msg.data).to.equal(testMsg, 'Unexpected msg text received');
								} catch (err) {
									closeAndFinish(done, realtime, err);
									return;
								}
								closeAndFinish(done, realtime);
							});

							/* publish event */
							var restChannel = rest.channels.get('publishpreupgrade');
							restChannel.publish('event0', testMsg, function (err) {
								if (err) {
									closeAndFinish(done, realtime, err);
								}
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Publish once with REST, after upgrade, verify message received on active transport
			 */
			it('publishpostupgrade0', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* subscribe to event */
					var rtChannel = realtime.channels.get('publishpostupgrade0');
					rtChannel.subscribe('event0', function (msg) {
						try {
							expect(msg.data).to.equal(testMsg, 'Unexpected msg text received');
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						var closeFn = function () {
							closeAndFinish(done, realtime);
						};
						if (isBrowser) setTimeout(closeFn, 0);
						else process.nextTick(closeFn);
					});

					/* publish event */
					var testMsg = 'Hello world';
					var restChannel = rest.channels.get('publishpostupgrade0');
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						//console.log('publishpostupgrade0: transport active: transport = ' + transport);
						if (transport.toString().match(/wss?\:/)) {
							if (rtChannel.state == 'attached') {
								//console.log('*** publishpostupgrade0: publishing (channel attached on transport active) ...');
								restChannel.publish('event0', testMsg, function (err) {
									//console.log('publishpostupgrade0: publish returned err = ' + displayError(err));
									if (err) {
										closeAndFinish(done, realtime, err);
									}
								});
							} else {
								rtChannel.on('attached', function () {
									//console.log('*** publishpostupgrade0: publishing (channel attached after wait) ...');
									restChannel.publish('event0', testMsg, function (err) {
										//console.log('publishpostupgrade0: publish returned err = ' + displayError(err));
										if (err) {
											closeAndFinish(done, realtime, err);
										}
									});
								});
							}
						}
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Publish once with REST, after upgrade, verify message not received on inactive transport
			 */
			it('publishpostupgrade1', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* subscribe to event */
					var rtChannel = realtime.channels.get('publishpostupgrade1');
					rtChannel.subscribe('event0', function (msg) {
						try {
							expect(msg.data).to.equal(testMsg, 'Unexpected msg text received');
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						var closeFn = function () {
							closeAndFinish(done, realtime);
						};
						if (isBrowser) setTimeout(closeFn, 0);
						else process.nextTick(closeFn);
					});

					/* publish event */
					var testMsg = 'Hello world';
					var restChannel = rest.channels.get('publishpostupgrade1');
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						if (helper.isComet(transport)) {
							/* override the processing of incoming messages on this channel
							 * so we can see if a message arrived.
							 * NOTE: this relies on knowledge of the internal implementation
							 * of the transport */

							var originalOnProtocolMessage = transport.onProtocolMessage;
							transport.onProtocolMessage = function (message) {
								if (message.messages) {
									closeAndFinish(done, realtime, new Error('Message received on comet transport'));
									return;
								}
								originalOnProtocolMessage.apply(this, arguments);
							};
						}
					});
					connectionManager.on('transport.active', function (transport) {
						if (helper.isWebsocket(transport)) {
							if (rtChannel.state == 'attached') {
								//console.log('*** publishing (channel attached on transport active) ...');
								restChannel.publish('event0', testMsg);
							} else {
								rtChannel.on('attached', function () {
									//console.log('*** publishing (channel attached after wait) ...');
									restChannel.publish('event0', testMsg);
								});
							}
						}
					});

					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/**
			 * Publish and subscribe, text protocol
			 */
			it('upgradepublish0', function (done) {
				var count = 10;
				var cbCount = 10;
				var checkFinish = function () {
					if (count <= 0 && cbCount <= 0) {
						closeAndFinish(done, realtime);
					}
				};
				var onPublish = function () {
					--cbCount;
					checkFinish();
				};
				var transportOpts = { useBinaryProtocol: false, transports: helper.availableTransports };
				var realtime = helper.AblyRealtime(transportOpts);
				var channel = realtime.channels.get('upgradepublish0');
				/* subscribe to event */
				channel.subscribe(
					'event0',
					function () {
						--count;
						checkFinish();
					},
					function () {
						var dataFn = function () {
							return 'Hello world at: ' + new Date();
						};
						publishAtIntervals(count, channel, dataFn, onPublish);
					}
				);
			});

			/**
			 * Publish and subscribe, binary protocol
			 */
			it('upgradepublish1', function (done) {
				var count = 10;
				var cbCount = 10;
				var checkFinish = function () {
					if (count <= 0 && cbCount <= 0) {
						closeAndFinish(done, realtime);
					}
				};
				var onPublish = function () {
					--cbCount;
					checkFinish();
				};
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				var realtime = helper.AblyRealtime(transportOpts);
				var channel = realtime.channels.get('upgradepublish1');
				/* subscribe to event */
				channel.subscribe(
					'event0',
					function () {
						--count;
						checkFinish();
					},
					function () {
						var dataFn = function () {
							return 'Hello world at: ' + new Date();
						};
						publishAtIntervals(count, channel, dataFn, onPublish);
					}
				);
			});

			/*
			 * Base upgrade case
			 */
			it('upgradebase0', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				var cometDeactivated = false;
				try {
					var realtime = helper.AblyRealtime(transportOpts);
					/* check that we see the transport we're interested in get activated,
					 * and that we see the comet transport deactivated */
					var failTimer = setTimeout(function () {
						closeAndFinish(done, realtime, new Error('upgrade heartbeat failed (timer expired)'));
					}, 120000);

					var connectionManager = realtime.connection.connectionManager;
					connectionManager.once('transport.inactive', function (transport) {
						if (transport.toString().indexOf('/comet/') > -1) cometDeactivated = true;
					});
					connectionManager.on('transport.active', function (transport) {
						if (transport.toString().match(/wss?\:/)) {
							clearTimeout(failTimer);
							var closeFn = function () {
								try {
									expect(cometDeactivated).to.be.ok;
								} catch (err) {
									closeAndFinish(done, realtime, err);
									return;
								}
								closeAndFinish(done, realtime);
							};
							if (isBrowser) {
								setTimeout(closeFn, 0);
							} else {
								process.nextTick(closeFn);
							}
						}
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Check active heartbeat, text protocol
			 */
			it('upgradeheartbeat0', function (done) {
				var transportOpts = { useBinaryProtocol: false, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* when we see the transport we're interested in get activated,
					 * listen for the heartbeat event */
					var failTimer;
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						if (transport.toString().match(/wss?\:/))
							transport.on('heartbeat', function () {
								transport.off('heartbeat');
								clearTimeout(failTimer);
								closeAndFinish(done, realtime);
							});
						transport.ping();
					});

					realtime.connection.on('connected', function () {
						failTimer = setTimeout(function () {
							closeAndFinish(done, realtime, new Error('upgrade heartbeat failed (timer expired)'));
						}, 120000);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Check active heartbeat, binary protocol
			 */
			it('upgradeheartbeat1', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* when we see the transport we're interested in get activated,
					 * listen for the heartbeat event */
					var failTimer;
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						if (transport.toString().match(/wss?\:/))
							transport.on('heartbeat', function () {
								transport.off('heartbeat');
								clearTimeout(failTimer);
								closeAndFinish(done, realtime);
							});
						transport.ping();
					});

					realtime.connection.on('connected', function () {
						failTimer = setTimeout(function () {
							closeAndFinish(done, realtime, new Error('upgrade heartbeat failed (timer expired)'));
						}, 120000);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Check heartbeat does not fire on inactive transport, text protocol
			 */
			it('upgradeheartbeat2', function (done) {
				var transportOpts = { useBinaryProtocol: false, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* when we see the transport we're interested in get activated,
					 * listen for the heartbeat event */
					var failTimer, cometTransport, wsTransport;
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						var transportDescription = transport.toString();
						//console.log('active transport: ' + transportDescription);
						if (transportDescription.indexOf('/comet/') > -1) {
							cometTransport = transport;
							cometTransport.on('heartbeat', function () {
								closeAndFinish(done, realtime, new Error('verify heartbeat does not fire on inactive transport'));
							});
						}
						if (transportDescription.match(/wss?\:/)) {
							wsTransport = transport;
							wsTransport.on('heartbeat', function () {
								clearTimeout(failTimer);
								/* wait a couple of seconds to give it time
								 * in case it might still fire */
								setTimeout(function () {
									closeAndFinish(done, realtime);
								}, 2000);
							});
							wsTransport.ping();
						}
					});

					realtime.connection.on('connected', function () {
						failTimer = setTimeout(function () {
							closeAndFinish(done, realtime, new Error('upgrade heartbeat failed (timer expired)'));
						}, 120000);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Check heartbeat does not fire on inactive transport, binary protocol
			 */
			it('upgradeheartbeat3', function (done) {
				var transportOpts = { useBinaryProtocol: true, transports: helper.availableTransports };
				try {
					var realtime = helper.AblyRealtime(transportOpts);

					/* when we see the transport we're interested in get activated,
					 * listen for the heartbeat event */
					var failTimer, cometTransport, wsTransport;
					var connectionManager = realtime.connection.connectionManager;
					connectionManager.on('transport.active', function (transport) {
						var transportDescription = transport.toString();
						//console.log('active transport: ' + transportDescription);
						if (transportDescription.indexOf('/comet/') > -1) {
							cometTransport = transport;
							cometTransport.on('heartbeat', function () {
								closeAndFinish(done, realtime, new Error('verify heartbeat does not fire on inactive transport'));
							});
						}
						if (transportDescription.match(/wss?\:/)) {
							wsTransport = transport;
							wsTransport.on('heartbeat', function () {
								clearTimeout(failTimer);
								/* wait a couple of seconds to give it time
								 * in case it might still fire */
								setTimeout(function () {
									closeAndFinish(done, realtime);
								}, 2000);
							});
							wsTransport.ping();
						}
					});

					realtime.connection.on('connected', function () {
						failTimer = setTimeout(function () {
							closeAndFinish(done, realtime, new Error('upgrade heartbeat failed (timer expired)'));
						}, 120000);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			it('unrecoverableUpgrade', function (done) {
				var realtime,
					fakeConnectionKey = '_____!ablyjs_test_fake-key____',
					fakeConnectionId = 'ablyjs_tes';

				try {
					/* on base transport active */
					realtime = helper.AblyRealtime({ transports: helper.availableTransports });
					realtime.connection.connectionManager.once('transport.active', function (transport) {
						expect(
							transport.toString().indexOf('/comet/') > -1,
							'assert first transport to become active is a comet transport'
						).to.be.ok;
						try {
							expect(realtime.connection.errorReason).to.equal(null, 'Check connection.errorReason is initially null');
							/* sabotage the upgrade */
							realtime.connection.connectionManager.connectionKey = fakeConnectionKey;
							realtime.connection.connectionManager.connectionId = fakeConnectionId;
						} catch (err) {
							closeAndFinish(done, realtiem, err);
							return;
						}

						/* on upgrade failure */
						realtime.connection.once('update', function (stateChange) {
							try {
								expect(stateChange.reason.code).to.equal(80008, 'Check correct (unrecoverable connection) error');
								expect(stateChange.current).to.equal('connected', 'Check current is connected');
								expect(realtime.connection.errorReason.code).to.equal(
									80008,
									'Check error set in connection.errorReason'
								);
								expect(realtime.connection.state).to.equal('connected', 'Check still connected');
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							/* Check events not still paused */
							var channel = realtime.channels.get('unrecoverableUpgrade');
							channel.attach(function (err) {
								if (err) {
									closeAndFinish(done, realtime, err);
									return;
								}
								channel.subscribe(function (msg) {
									closeAndFinish(done, realtime);
								});
								channel.publish('msg', null);
							});
						});
					});
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			/*
			 * Check that a message that fails to publish on a comet transport can be
			 * seamlessly transferred to the websocket transport and published there
			 */
			it('message_timeout_stalling_upgrade', function (done) {
				var realtime = helper.AblyRealtime({ transports: helper.availableTransports, httpRequestTimeout: 3000 }),
					channel = realtime.channels.get('timeout1'),
					connectionManager = realtime.connection.connectionManager;

				realtime.connection.once('connected', function () {
					channel.attach(function (err) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						/* Sabotage comet sending */
						var transport = connectionManager.activeProtocol.getTransport();
						try {
							expect(helper.isComet(transport), 'Check active transport is still comet').to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						transport.sendUri = helper.unroutableAddress;

						async.parallel(
							[
								function (cb) {
									channel.subscribe('event', function () {
										cb();
									});
								},
								function (cb) {
									channel.publish('event', null, function (err) {
										try {
											expect(!err, 'Successfully published message').to.be.ok;
										} catch (err) {
											cb(err);
											return;
										}
										cb();
									});
								}
							],
							function (err) {
								closeAndFinish(done, realtime, err);
							}
						);
					});
				});
			});

			/*
			 * Check that a lack of response to an upgrade sync doesn't stall things forever
			 */
			it('unresponsive_upgrade_sync', function (done) {
				var realtime = helper.AblyRealtime({ transports: helper.availableTransports, realtimeRequestTimeout: 2000 }),
					connection = realtime.connection;

				connection.connectionManager.on('transport.pending', function (transport) {
					if (!helper.isWebsocket(transport)) return;

					var originalOnProtocolMessage = transport.onProtocolMessage;
					/* Stub out sync message one time */
					transport.onProtocolMessage = function (message) {
						if (message.action === 16) {
							connection.connectionManager.off('transport.pending');
							transport.onProtocolMessage = originalOnProtocolMessage;
						} else {
							originalOnProtocolMessage.call(transport, message);
						}
					};
				});

				connection.once('connected', function () {
					connection.once('disconnected', function () {
						connection.once('connected', function () {
							if (helper.isWebsocket(connection.connectionManager.activeProtocol.getTransport())) {
								/* Must be running multiple tests at once and another one set the transport preference */
								closeAndFinish(done, realtime);
							} else {
								connection.connectionManager.on('transport.active', function (transport) {
									if (helper.isWebsocket(transport)) {
										closeAndFinish(done, realtime);
									}
								});
							}
						});
					});
				});
			});

			/*
			 * Check that after a successful upgrade, the transport pref is persisted,
			 * and subsequent connections do not upgrade
			 */
			it('persist_transport_prefs', function (done) {
				var realtime = helper.AblyRealtime({ transports: helper.availableTransports }),
					connection = realtime.connection,
					connectionManager = connection.connectionManager;

				async.series(
					[
						function (cb) {
							connectionManager.once('transport.active', function (transport) {
								try {
									expect(helper.isComet(transport), 'Check first transport to become active is comet').to.be.ok;
								} catch (err) {
									cb(err);
									return;
								}
								cb();
							});
						},
						function (cb) {
							connectionManager.once('transport.active', function (transport) {
								try {
									expect(helper.isWebsocket(transport), 'Check second transport to become active is ws').to.be.ok;
								} catch (err) {
									cb(err);
									return;
								}
								cb();
							});
						},
						function (cb) {
							connection.once('closed', function () {
								cb();
							});
							helper.Utils.nextTick(function () {
								connection.close();
							});
						},
						function (cb) {
							connectionManager.once('transport.active', function (transport) {
								try {
									expect(
										helper.isWebsocket(transport),
										'Check first transport to become active the second time round is websocket'
									).to.be.ok;
								} catch (err) {
									cb(err);
									return;
								}
								cb();
							});
							connection.connect();
						}
					],
					function (err) {
						closeAndFinish(done, realtime, err);
					}
				);
			});

			/*
			 * Check that upgrades succeed even if the original transport dies before the sync
			 */
			it('upgrade_original_transport_dies', function (done) {
				var realtime = helper.AblyRealtime({ transports: helper.availableTransports }),
					connection = realtime.connection,
					connectionManager = connection.connectionManager;

				async.series(
					[
						function (cb) {
							connectionManager.once('transport.active', function (transport) {
								try {
									expect(helper.isComet(transport), 'Check first transport to become active is comet').to.be.ok;
								} catch (err) {
									cb(err);
									return;
								}
								cb();
							});
						},
						function (cb) {
							connectionManager.on('transport.pending', function (transport) {
								if (!helper.isWebsocket(transport)) return; // in browser, might be xhr_streaming
								connectionManager.off('transport.pending');
								/* Abort comet transport nonfatally */
								var baseTransport = connectionManager.activeProtocol.getTransport();
								try {
									expect(helper.isComet(baseTransport), 'Check original transport is still comet').to.be.ok;
								} catch (err) {
									cb(err);
									return;
								}
								/* Check that if we do get a statechange, it's to connecting, not disconnected. */
								var stateChangeListener = function (stateChange) {
									try {
										expect(stateChange.current).to.equal(
											'connecting',
											'check that deactivateTransport only drops us to connecting as another transport is ready for activation'
										);
									} catch (err) {
										cb(err);
									}
								};
								connection.once(stateChangeListener);
								connectionManager.once('connectiondetails', function () {
									connection.off(stateChangeListener);
									/* Check the upgrade completed  */
									var newActiveTransport = connectionManager.activeProtocol.getTransport();
									try {
										expect(transport).to.equal(newActiveTransport, 'Check the upgrade transport is now active');
									} catch (err) {
										cb(err);
										return;
									}
									cb();
								});
								transport.once('connected', function () {
									baseTransport.disconnect({ code: 50000, statusCode: 500, message: 'a non-fatal transport error' });
								});
							});
						}
					],
					function (err) {
						closeAndFinish(done, realtime, err);
					}
				);
			});
		});
	}
});
