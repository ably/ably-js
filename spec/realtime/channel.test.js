'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
	var exports = {};
	var _exports = {};
	var expect = chai.expect;
	var displayError = helper.displayError;
	var closeAndFinish = helper.closeAndFinish;
	var monitorConnection = helper.monitorConnection;
	var createPM = Ably.Realtime.ProtocolMessage.fromDeserialized;
	var testOnAllTransports = helper.testOnAllTransports;

	/* Helpers */
	function randomString() {
		return Math.random().toString().slice(2);
	}

	function checkCanSubscribe(channel, testChannel) {
		return function (callback) {
			var timeout,
				received = false,
				eventName = randomString();

			channel.subscribe(eventName, function (msg) {
				channel.unsubscribe(eventName);
				received = true;
				clearTimeout(timeout);
				callback();
			});

			testChannel.publish(eventName, null, function (err) {
				if (received) return;
				if (err) callback(err);
				timeout = setTimeout(function () {
					channel.unsubscribe(eventName);
					callback('checkCanSubscribe: message not received within 5s');
				}, 5000);
			});
		};
	}

	function checkCantSubscribe(channel, testChannel) {
		return function (callback) {
			var timeout,
				received = false,
				eventName = randomString();

			channel.subscribe(eventName, function (message) {
				channel.presence.unsubscribe(eventName);
				received = true;
				clearTimeout(timeout);
				callback('checkCantSubscribe: unexpectedly received message');
			});

			testChannel.publish(eventName, null, function (err) {
				if (received) return;
				if (err) callback(err);
				timeout = setTimeout(function () {
					channel.unsubscribe(eventName);
					callback();
				}, 500);
			});
		};
	}

	function checkCanPublish(channel) {
		return function (callback) {
			channel.publish(null, null, callback);
		};
	}

	function checkCantPublish(channel) {
		return function (callback) {
			channel.publish(null, null, function (err) {
				if (err && err.code === 40160) {
					callback();
				} else {
					callback(err || 'checkCantPublish: unexpectedly allowed to publish');
				}
			});
		};
	}

	function checkCanEnterPresence(channel) {
		return function (callback) {
			var clientId = randomString();
			channel.presence.enterClient(clientId, null, function (err) {
				channel.presence.leaveClient(clientId);
				callback(err);
			});
		};
	}

	function checkCantEnterPresence(channel) {
		return function (callback) {
			channel.presence.enterClient(randomString(), null, function (err) {
				if (err && err.code === 40160) {
					callback();
				} else {
					callback(err || 'checkCantEnterPresence: unexpectedly allowed to enter presence');
				}
			});
		};
	}

	function checkCanPresenceSubscribe(channel, testChannel) {
		return function (callback) {
			var timeout,
				received = false,
				clientId = randomString();

			channel.presence.subscribe('enter', function (message) {
				channel.presence.unsubscribe('enter');
				testChannel.presence.leaveClient(clientId);
				received = true;
				clearTimeout(timeout);
				callback();
			});

			testChannel.presence.enterClient(clientId, null, function (err) {
				if (received) return;
				if (err) callback(err);
				timeout = setTimeout(function () {
					channel.presence.unsubscribe('enter');
					testChannel.presence.leaveClient(clientId);
					callback('checkCanPresenceSubscribe: message not received within 5s');
				}, 5000);
			});
		};
	}

	function checkCantPresenceSubscribe(channel, testChannel) {
		return function (callback) {
			var timeout,
				received = false,
				clientId = randomString();

			channel.presence.subscribe('enter', function (message) {
				channel.presence.unsubscribe('enter');
				testChannel.presence.leaveClient(clientId);
				received = true;
				clearTimeout(timeout);
				callback('checkCantPresenceSubscribe: unexpectedly received message');
			});

			testChannel.presence.enterClient(clientId, null, function (err) {
				if (received) return;
				if (err) callback(err);
				timeout = setTimeout(function () {
					channel.presence.unsubscribe('enter');
					testChannel.presence.leaveClient(clientId);
					callback();
				}, 500);
			});
		};
	}

	/* Tests */

	describe('realtime/channel', function () {
		this.timeout(60 * 1000);

		before(function (done) {
			helper.setupApp(function (err) {
				if (err) {
					done(err);
					return;
				}
				done();
			});
		});

		/*
		 * Channel init with options
		 */
		testOnAllTransports('channelinit0', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						try {
							/* set options on init */
							var channel0 = realtime.channels.get('channelinit0', { fakeOption: true });
							expect(channel0.channelOptions.fakeOption).to.equal(true);

							/* set options on fetch */
							var channel1 = realtime.channels.get('channelinit0', { fakeOption: false });
							expect(channel0.channelOptions.fakeOption).to.equal(false);
							expect(channel1.channelOptions.fakeOption).to.equal(false);

							/* set options with setOptions */
							channel1.setOptions({ fakeOption: true });
							expect(channel1.channelOptions.fakeOption).to.equal(true);
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Base attach case
		 */
		testOnAllTransports('channelattach0', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var channel0 = realtime.channels.get('channelattach0');
						channel0.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
							}
							closeAndFinish(done, realtime);
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Attach before connect
		 */
		testOnAllTransports('channelattach2', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					var channel2 = realtime.channels.get('channelattach2');
					channel2.attach(function (err) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						closeAndFinish(done, realtime);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Attach then detach
		 */
		testOnAllTransports(
			'channelattach3',
			function (realtimeOpts) {
				return function (done) {
					try {
						var realtime = helper.AblyRealtime(realtimeOpts);
						realtime.connection.on('connected', function () {
							var channel0 = realtime.channels.get('channelattach3');
							channel0.attach(function (err) {
								if (err) {
									closeAndFinish(done, realtime, err);
								}
								channel0.detach(function (err) {
									if (err) {
										closeAndFinish(done, realtime, err);
									}
									if (channel0.state == 'detached') {
										closeAndFinish(done, realtime);
									} else {
										closeAndFinish(done, realtime, new Error('Detach failed: State is ' + channel0.state));
									}
								});
							});
						});
						monitorConnection(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				};
			},
			true
		);
		/* NB upgrade is excluded because realtime now sends an ATTACHED
		 * post-upgrade, which can race with the DETACHED if the DETACH is only sent
		 * just after upgrade. Re-include it with 1.1 spec which has IDs in ATTACHs */

		/*
		 * Attach with an empty channel and expect a channel error
		 * and the connection to remain open
		 */
		testOnAllTransports('channelattachempty', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.once('connected', function () {
						var channel0 = realtime.channels.get('');
						channel0.attach(function (err) {
							if (err) {
								setTimeout(function () {
									try {
										expect(realtime.connection.state === 'connected', 'Client should still be connected').to.be.ok;
										closeAndFinish(done, realtime);
									} catch (err) {
										closeAndFinish(done, realtime, err);
									}
								}, 1000);
								return;
							}
							closeAndFinish(done, realtime, new Error('Unexpected attach success'));
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Attach with an invalid channel name and expect a channel error
		 * and the connection to remain open
		 */
		testOnAllTransports('channelattachinvalid', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.once('connected', function () {
						var channel = realtime.channels.get(':hell');
						channel.attach(function (err) {
							if (err) {
								try {
									expect(channel.errorReason.code).to.equal(40010, 'Attach error was set as the channel errorReason');
									expect(err.code).to.equal(40010, 'Attach error was passed to the attach callback');
								} catch (err) {
									closeAndFinish(done, realtime, err);
									return;
								}
								setTimeout(function () {
									try {
										expect(realtime.connection.state === 'connected', 'Client should still be connected').to.be.ok;
										closeAndFinish(done, realtime);
									} catch (err) {
										closeAndFinish(done, realtime, err);
									}
								}, 1000);
								return;
							}
							closeAndFinish(done, realtime, 'Unexpected attach success');
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Publishing on a nonattached channel
		 */
		testOnAllTransports('publish_no_attach', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.once('connected', function () {
						realtime.channels.get('publish_no_attach').publish(function (err) {
							if (err) {
								closeAndFinish(done, realtime, new Error('Unexpected attach failure: ' + helper.displayError(err)));
								return;
							}
							closeAndFinish(done, realtime);
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * publishing on a nonattached channel with an invalid channel name
		 */
		testOnAllTransports('channelattach_publish_invalid', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.once('connected', function () {
						realtime.channels.get(':hell').publish(function (err) {
							if (err) {
								try {
									expect(err.code).to.equal(40010, 'correct error code');
									closeAndFinish(done, realtime);
								} catch (err) {
									closeAndFinish(done, realtime, err);
								}
								return;
							}
							closeAndFinish(done, realtime, new Error('Unexpected attach success'));
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Attach with an invalid channel name and expect a channel error
		 * and the connection to remain open
		 */
		testOnAllTransports('channelattach_invalid_twice', function (realtimeOpts) {
			return function (done) {
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.once('connected', function () {
						realtime.channels.get(':hell').attach(function (err) {
							if (err) {
								/* attempt second attach */
								realtime.channels.get(':hell').attach(function (err) {
									if (err) {
										setTimeout(function () {
											try {
												expect(realtime.connection.state === 'connected', 'Client should still be connected').to.be.ok;
												closeAndFinish(done, realtime);
											} catch (err) {
												closeAndFinish(done, realtime, err);
											}
										}, 1000);
										return;
									}
									closeAndFinish(done, realtime, new Error('Unexpected attach (second attempt) success'));
								});
								return;
							}
							closeAndFinish(done, realtime, new Error('Unexpected attach success'));
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/*
		 * Attach then later call whenState which fires immediately
		 */
		it('channelattachOnceOrIfAfter', function (done) {
			try {
				var realtime = helper.AblyRealtime(),
					channel = realtime.channels.get('channelattachOnceOrIf'),
					firedImmediately = false;

				channel.attach(function (err) {
					channel.whenState('attached', function () {
						firedImmediately = true;
					});
					try {
						expect(firedImmediately, 'whenState fired immediately as attached').to.be.ok;
						closeAndFinish(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				});
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/*
		 * Attach and call whenState before attach which fires later
		 */
		it('channelattachOnceOrIfBefore', function (done) {
			try {
				var realtime = helper.AblyRealtime(),
					channel = realtime.channels.get('channelattachOnceOrIf'),
					firedImmediately = false;

				channel.attach();
				channel.whenState('attached', function () {
					firedImmediately = true;
					try {
						expect(channel.state).to.equal('attached', 'whenState fired when attached');
						closeAndFinish(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				});
				expect(!firedImmediately, 'whenState should not fire immediately as not attached').to.be.ok;
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		testOnAllTransports('attachWithChannelParamsBasicChannelsGet', function (realtimeOpts) {
			return function (done) {
				var testName = 'attachWithChannelParamsBasicChannelsGet';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var params = {
							modes: 'subscribe',
							delta: 'vcdiff'
						};
						var channelOptions = {
							params: params
						};
						var channel = realtime.channels.get(testName, channelOptions);
						channel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							try {
								expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');
								expect(channel.params).to.deep.equal(params, 'Check result params');
								expect(channel.modes).to.deep.equal(['subscribe'], 'Check result modes');
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							var testRealtime = helper.AblyRealtime();
							testRealtime.connection.on('connected', function () {
								var testChannel = testRealtime.channels.get(testName);
								async.series(
									[
										checkCanSubscribe(channel, testChannel),
										checkCantPublish(channel),
										checkCantEnterPresence(channel),
										checkCantPresenceSubscribe(channel, testChannel)
									],
									function (err) {
										testRealtime.close();
										closeAndFinish(done, realtime, err);
									}
								);
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		testOnAllTransports('attachWithChannelParamsBasicSetOptions', function (realtimeOpts) {
			return function (done) {
				var testName = 'attachWithChannelParamsBasicSetOptions';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var params = {
							modes: 'subscribe',
							delta: 'vcdiff'
						};
						var channelOptions = {
							params: params
						};
						var channel = realtime.channels.get(testName);
						channel.setOptions(channelOptions);
						channel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');
							expect(channel.params).to.deep.equal(params, 'Check result params');
							expect(channel.modes).to.deep.equal(['subscribe'], 'Check result modes');

							var testRealtime = helper.AblyRealtime();
							testRealtime.connection.on('connected', function () {
								var testChannel = testRealtime.channels.get(testName);
								async.series(
									[
										checkCanSubscribe(channel, testChannel),
										checkCantPublish(channel),
										checkCantEnterPresence(channel),
										checkCantPresenceSubscribe(channel, testChannel)
									],
									function (err) {
										testRealtime.close();
										closeAndFinish(done, realtime, err);
									}
								);
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		testOnAllTransports('subscribeAfterSetOptions', function (realtimeOpts) {
			return function (done) {
				var testName = 'subscribeAfterSetOptions';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var channel = realtime.channels.get(testName);
						channel.setOptions({
							params: {
								modes: 'publish,subscribe'
							}
						});
						var testData = 'Test data';
						channel.subscribe(function (message) {
							try {
								expect(message.data).to.equal(testData, 'Check data');
								closeAndFinish(done, realtime);
							} catch (err) {
								closeAndFinish(done, realtime, err);
							}
						});
						channel.publish(undefined, testData);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		it('channelGetShouldThrowWhenWouldCauseReattach', function (done) {
			var testName = 'channelGetShouldThrowWhenWouldCauseReattach';
			try {
				var realtime = helper.AblyRealtime();
				realtime.connection.on('connected', function () {
					var params = {
						modes: 'subscribe',
						delta: 'vcdiff'
					};
					var channel = realtime.channels.get(testName, {
						params: params
					});
					channel.attach(function (err) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}

						try {
							realtime.channels.get(testName, {
								params: params
							});
						} catch (err) {
							try {
								expect(err.code).to.equal(40000, 'Check error code');
								expect(err.statusCode).to.equal(400, 'Check error status code');
								expect(err.message.includes('setOptions'), 'Check error message').to.be.ok;
								closeAndFinish(done, realtime);
							} catch (err) {
								closeAndFinish(done, realtime, err);
							}
						}
					});
				});
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		testOnAllTransports('setOptionsCallbackBehaviour', function (realtimeOpts) {
			return function (done) {
				var testName = 'setOptionsCallbackBehaviour';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var params = {
							modes: 'subscribe',
							delta: 'vcdiff'
						};
						var modes = ['publish'];
						var channel = realtime.channels.get(testName);

						async.series(
							[
								function (cb) {
									var setOptionsReturned = false;
									channel.setOptions(
										{
											params: params,
											modes: modes
										},
										function () {
											expect(
												!setOptionsReturned,
												'setOptions failed to call back immediately, when no reattach is required'
											).to.be.ok;
											cb();
										}
									);
									setOptionsReturned = true;
								},
								function (cb) {
									channel.attach(cb);
								},
								function (cb) {
									var channelUpdated = false;
									channel._allChannelChanges.on('update', function () {
										channelUpdated = true;
									});

									var setOptionsReturned = false;
									channel.setOptions(
										{
											params: params
										},
										function () {
											/* Wait a tick so we don't depend on whether the update event runs the
											 * channelUpdated listener or the setOptions listener first */
											helper.Utils.nextTick(function () {
												expect(
													setOptionsReturned,
													'setOptions should return immediately and call back after the reattach'
												).to.be.ok;
												expect(
													channelUpdated,
													'Check channel went to the server to update the channel params'
												).to.be.ok;
												cb();
											});
										}
									);
									setOptionsReturned = true;
								},
								function (cb) {
									var channelUpdated = false;
									channel._allChannelChanges.on('update', function () {
										channelUpdated = true;
									});

									var setOptionsReturned = false;
									channel.setOptions(
										{
											modes: modes
										},
										function () {
											helper.Utils.nextTick(function () {
												expect(
													setOptionsReturned,
													'setOptions should return immediately and call back after the reattach'
												).to.be.ok;
												expect(channelUpdated, 'Check channel went to the server to update the channel mode').to.be.ok;
												cb();
											});
										}
									);
									setOptionsReturned = true;
								},
								function (cb) {
									var setOptionsReturned = false;
									channel.setOptions({}, function () {
										expect(
											!setOptionsReturned,
											'setOptions failed to call back immediately, when no reattach is required'
										).to.be.ok;
										cb();
									});
									setOptionsReturned = true;
								}
							],
							function (err) {
								closeAndFinish(done, realtime, err);
							}
						);
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		/* Verify modes is ignored when params.modes is present */
		testOnAllTransports('attachWithChannelParamsModesAndChannelModes', function (realtimeOpts) {
			return function (done) {
				var testName = 'attachWithChannelParamsModesAndChannelModes';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var paramsModes = ['presence', 'subscribe'];
						var params = {
							modes: paramsModes.join(',')
						};
						var channelOptions = {
							params: params,
							modes: ['publish', 'presence_subscribe']
						};
						var channel = realtime.channels.get(testName, channelOptions);
						channel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							try {
								expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');
								expect(channel.params).to.deep.equal(params, 'Check result params');
								expect(channel.modes).to.deep.equal(paramsModes, 'Check result modes');
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							var testRealtime = helper.AblyRealtime();
							testRealtime.connection.on('connected', function () {
								var testChannel = testRealtime.channels.get(testName);
								async.series(
									[
										checkCanSubscribe(channel, testChannel),
										checkCanEnterPresence(channel),
										checkCantPublish(channel),
										checkCantPresenceSubscribe(channel, testChannel)
									],
									function (err) {
										testRealtime.close();
										closeAndFinish(done, realtime, err);
									}
								);
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		testOnAllTransports('attachWithChannelModes', function (realtimeOpts) {
			return function (done) {
				var testName = 'attachWithChannelModes';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var modes = ['publish', 'presence_subscribe'];
						var channelOptions = {
							modes: modes
						};
						var channel = realtime.channels.get(testName, channelOptions);
						channel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							try {
								expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');
								expect(channel.modes).to.deep.equal(modes, 'Check result modes');
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							var testRealtime = helper.AblyRealtime();
							testRealtime.connection.on('connected', function () {
								var testChannel = testRealtime.channels.get(testName);
								async.series(
									[
										checkCanPublish(channel),
										checkCanPresenceSubscribe(channel, testChannel),
										checkCantSubscribe(channel, testChannel),
										checkCantEnterPresence(channel)
									],
									function (err) {
										testRealtime.close();
										closeAndFinish(done, realtime, err);
									}
								);
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		testOnAllTransports('attachWithChannelParamsDeltaAndModes', function (realtimeOpts) {
			return function (done) {
				var testName = 'attachWithChannelParamsDeltaAndModes';
				try {
					var realtime = helper.AblyRealtime(realtimeOpts);
					realtime.connection.on('connected', function () {
						var modes = ['publish', 'subscribe', 'presence_subscribe'];
						var channelOptions = {
							modes: modes,
							params: { delta: 'vcdiff' }
						};
						var channel = realtime.channels.get(testName, channelOptions);
						channel.attach(function (err) {
							if (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							try {
								expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');
								expect(channel.params).to.deep.equal({ delta: 'vcdiff' }, 'Check result params');
								expect(channel.modes).to.deep.equal(modes, 'Check result modes');
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}

							var testRealtime = helper.AblyRealtime();
							testRealtime.connection.on('connected', function () {
								var testChannel = testRealtime.channels.get(testName);
								async.series(
									[
										checkCanPublish(channel),
										checkCanSubscribe(channel, testChannel),
										checkCanPresenceSubscribe(channel, testChannel),
										checkCantEnterPresence(channel)
									],
									function (err) {
										testRealtime.close();
										closeAndFinish(done, realtime, err);
									}
								);
							});
						});
					});
					monitorConnection(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			};
		});

		it('attachWithInvalidChannelParams', function (done) {
			var testName = 'attachWithInvalidChannelParams';
			var defaultChannelModes = 'presence,publish,subscribe,presence_subscribe';
			try {
				var realtime = helper.AblyRealtime();
				realtime.connection.on('connected', function () {
					var channel = realtime.channels.get(testName);
					async.series(
						[
							function (cb) {
								channel.attach(function (err) {
									cb(err);
								});
							},
							function (cb) {
								var channelOptions = {
									modes: 'subscribe'
								};
								channel.setOptions(channelOptions, function (err) {
									expect(err.code).to.equal(40000, 'Check channelOptions validation error code');
									expect(err.statusCode).to.equal(400, 'Check channelOptions validation error statusCode');
									expect(channel.modes).to.deep.equal(
										defaultChannelModes.split(','),
										'Check channel options modes result'
									);
									cb();
								});
							},
							function (cb) {
								var channelOptions = {
									modes: [1, 'subscribe']
								};
								channel.setOptions(channelOptions, function (err) {
									expect(err.code).to.equal(40000, 'Check channelOptions validation error code');
									expect(err.statusCode).to.equal(400, 'Check channelOptions validation error statusCode');
									expect(channel.modes).to.deep.equal(
										defaultChannelModes.split(','),
										'Check channel options modes result'
									);
									cb();
								});
							},
							function (cb) {
								var channelOptions = {
									params: 'test'
								};
								channel.setOptions(channelOptions, function (err) {
									expect(err.code).to.equal(40000, 'Check channelOptions validation error code');
									expect(err.statusCode).to.equal(400, 'Check channelOptions validation error statusCode');
									expect(channel.params).to.deep.equal({}, 'Check channel options params');
									cb();
								});
							},
							function (cb) {
								/* not malformed, but not recognised so we should end up with an empty params object*/
								var channelOptions = {
									params: { nonexistent: 'foo' }
								};
								channel.setOptions(channelOptions, function () {
									expect(channel.params).to.deep.equal({}, 'Check channel params');
									cb();
								});
							},
							function (cb) {
								var channelOptions = {
									modes: undefined
								};
								channel.setOptions(channelOptions, function (err) {
									expect(err.code).to.equal(40000, 'Check channelOptions validation error code');
									expect(err.statusCode).to.equal(400, 'Check channelOptions validation error statusCode');
									expect(channel.params).to.deep.equal({}, 'Check channel options params result');
									expect(channel.modes).to.deep.equal(
										defaultChannelModes.split(','),
										'Check channel options modes result'
									);
									cb();
								});
							},
							function (cb) {
								var channelOptions = {
									modes: ['susribe']
								};
								channel.setOptions(channelOptions, function (err) {
									expect(err.code).to.equal(40000, 'Check channelOptions validation error code');
									expect(err.statusCode).to.equal(400, 'Check channelOptions validation error statusCode');
									expect(channel.params).to.deep.equal({}, 'Check channel options params result');
									expect(channel.modes).to.deep.equal(
										defaultChannelModes.split(','),
										'Check channel options modes result'
									);
									cb();
								});
							}
						],
						function (err) {
							closeAndFinish(done, realtime, err);
						}
					);
				});
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/*
		 * Subscribe, then unsubscribe, binary transport
		 */
		it('channelsubscribe0', function (done) {
			try {
				var realtime = helper.AblyRealtime({ useBinaryProtocol: true });
				realtime.connection.on('connected', function () {
					var channel6 = realtime.channels.get('channelsubscribe0');
					channel6.attach(function (err) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						try {
							channel6.subscribe('event0', function () {});
							setTimeout(function () {
								try {
									channel6.unsubscribe('event0', function () {});
									closeAndFinish(done, realtime);
								} catch (err) {
									closeAndFinish(done, realtime, err);
								}
							}, 1000);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
				});
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/*
		 * Subscribe, then unsubscribe listeners by event, by listener, and then all events & listener
		 */
		it('channelsubscribe1', function (done) {
			var messagesReceived = 0;

			try {
				var realtime = helper.AblyRealtime();
				var channelByEvent, channelByListener, channelAll;

				var unsubscribeTest = function () {
					channelByEvent.unsubscribe('event', listenerByEvent);
					channelByListener.unsubscribe(listenerNoEvent);
					channelAll.unsubscribe();
					channelByEvent.publish('event', 'data', function (err) {
						try {
							expect(!err, 'Error publishing single event: ' + err).to.be.ok;
						} catch (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						channelByListener.publish(null, 'data', function (err) {
							try {
								expect(!err, 'Error publishing any event: ' + err).to.be.ok;
							} catch (err) {
								closeAndFinish(done, realtime, err);
								return;
							}
							channelAll.publish(null, 'data', function (err) {
								try {
									expect(!err, 'Error publishing any event: ' + err).to.be.ok;
									expect(messagesReceived).to.equal(3, 'Only three messages should be received by the listeners');
									closeAndFinish(done, realtime);
								} catch (err) {
									closeAndFinish(done, realtime, err);
								}
							});
						});
					});
				};

				var listenerByEvent = function () {
					messagesReceived += 1;
					if (messagesReceived == 3) {
						unsubscribeTest();
					}
				};
				var listenerNoEvent = function () {
					messagesReceived += 1;
					if (messagesReceived == 3) {
						unsubscribeTest();
					}
				};
				var listenerAllEvents = function () {
					return listenerNoEvent();
				};

				realtime.connection.on('connected', function () {
					channelByEvent = realtime.channels.get('channelsubscribe1-event');
					channelByEvent.subscribe('event', listenerByEvent, function () {
						channelByEvent.publish('event', 'data');
						channelByListener = realtime.channels.get('channelsubscribe1-listener');
						channelByListener.subscribe(null, listenerNoEvent, function () {
							channelByListener.publish(null, 'data');
							channelAll = realtime.channels.get('channelsubscribe1-all');
							channelAll.subscribe(listenerAllEvents, function () {
								channelAll.publish(null, 'data');
							});
						});
					});
				});
				monitorConnection(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* RTL13
		 * A server-sent DETACHED, with err, should cause the channel to attempt an
		 * immediate reattach. If that fails, it should go into suspended
		 */
		it('server_sent_detached', function (done) {
			var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] }),
				channelName = 'server_sent_detached',
				channel = realtime.channels.get(channelName);

			async.series(
				[
					function (cb) {
						realtime.connection.once('connected', function () {
							cb();
						});
					},
					function (cb) {
						channel.attach(cb);
					},
					function (cb) {
						/* Sabotage the reattach attempt, then simulate a server-sent detach */
						channel.sendMessage = function () {};
						realtime.options.timeouts.realtimeRequestTimeout = 100;
						channel.once(function (stateChange) {
							expect(stateChange.current).to.equal('attaching', 'Channel reattach attempt happens immediately');
							expect(stateChange.reason.code).to.equal(50000, 'check error is propogated in the reason');
							cb();
						});
						var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
						transport.onProtocolMessage(
							createPM({
								action: 13,
								channel: channelName,
								error: { statusCode: 500, code: 50000, message: 'generic serverside failure' }
							})
						);
					},
					function (cb) {
						channel.once(function (stateChange) {
							expect(stateChange.current).to.equal('suspended', 'Channel we go into suspended');
							expect(stateChange.reason && stateChange.reason.code).to.equal(90007, 'check error is now the timeout');
							cb();
						});
					}
				],
				function (err) {
					closeAndFinish(done, realtime, err);
				}
			);
		});

		/*
		 * A server-sent DETACHED, with err, while in the attaching state, should
		 * result in the channel becoming suspended
		 */
		it('server_sent_detached_while_attaching', function (done) {
			var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] }),
				channelName = 'server_sent_detached_while_attaching',
				channel = realtime.channels.get(channelName);

			realtime.connection.once('connected', function () {
				var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
				/* Mock sendMessage to respond to attaches with a DETACHED */
				channel.sendMessage = function (msg) {
					try {
						expect(msg.action).to.equal(10, 'check attach action');
					} catch (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					helper.Utils.nextTick(function () {
						transport.onProtocolMessage(
							createPM({
								action: 13,
								channel: channelName,
								error: { statusCode: 500, code: 50000, message: 'generic serverside failure' }
							})
						);
					});
				};
				channel.attach(function (err) {
					try {
						expect(err.code).to.equal(50000, 'check error is propogated to the attach callback');
						expect(channel.state).to.equal('suspended', 'check channel goes into suspended');
						closeAndFinish(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				});
			});
		});

		/*
		 * A server-sent ERROR, with channel field, should fail the channel
		 */
		it('server_sent_error', function (done) {
			var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] }),
				channelName = 'server_sent_error',
				channel = realtime.channels.get(channelName);

			realtime.connection.once('connected', function () {
				channel.attach(function (err) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}

					channel.on('failed', function (stateChange) {
						try {
							expect(stateChange.reason.code).to.equal(50000, 'check error is propogated');
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
					var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
					transport.onProtocolMessage(
						createPM({
							action: 9,
							channel: channelName,
							error: { statusCode: 500, code: 50000, message: 'generic serverside failure' }
						})
					);
				});
			});
		});

		/* RTL12
		 * A server-sent ATTACHED indicating a loss of connection continuity (i.e.
		 * with no resumed flag, possibly with an error) on an attached channel
		 * should emit an UPDATE event on the channel
		 */
		it('server_sent_attached_err', function (done) {
			var realtime = helper.AblyRealtime(),
				channelName = 'server_sent_attached_err',
				channel = realtime.channels.get(channelName);

			async.series(
				[
					function (cb) {
						realtime.connection.once('connected', function () {
							cb();
						});
					},
					function (cb) {
						channel.attach(cb);
					},
					function (cb) {
						channel.once(function (stateChange) {
							expect(this.event).to.equal('update', 'check is error event');
							expect(stateChange.current).to.equal('attached', 'check current');
							expect(stateChange.previous).to.equal('attached', 'check previous');
							expect(stateChange.resumed).to.equal(false, 'check resumed');
							expect(stateChange.reason.code).to.equal(50000, 'check error propogated');
							expect(channel.state).to.equal('attached', 'check channel still attached');
							cb();
						});
						var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
						transport.onProtocolMessage(
							createPM({
								action: 11,
								channel: channelName,
								error: { statusCode: 500, code: 50000, message: 'generic serverside failure' }
							})
						);
					}
				],
				function (err) {
					closeAndFinish(done, realtime, err);
				}
			);
		});

		/*
		 * Check that queueMessages: false disables queuing for connection queue state
		 */
		it('publish_no_queueing', function (done) {
			var realtime = helper.AblyRealtime({ queueMessages: false }),
				channel = realtime.channels.get('publish_no_queueing');

			/* try a publish while not yet connected */
			channel.publish('foo', 'bar', function (err) {
				try {
					expect(err, 'Check publish while disconnected/connecting is rejected').to.be.ok;
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});
		});

		/*
		 * A channel attach that times out should be retried
		 */
		it('channel_attach_timeout', function (done) {
			/* Use a fixed transport as attaches are resent when the transport changes */
			var realtime = helper.AblyRealtime({
					transports: [helper.bestTransport],
					realtimeRequestTimeout: 100,
					channelRetryTimeout: 100
				}),
				channelName = 'channel_attach_timeout',
				channel = realtime.channels.get(channelName);

			/* Stub out the channel's ability to communicate */
			channel.sendMessage = function () {};

			async.series(
				[
					function (cb) {
						realtime.connection.once('connected', function () {
							cb();
						});
					},
					function (cb) {
						channel.attach(function (err) {
							expect(err, 'Channel attach timed out as expected').to.be.ok;
							expect(err && err.code).to.equal(90007, 'Attach timeout err passed to attach callback');
							expect(channel.state).to.equal('suspended', 'Check channel state goes to suspended');
							cb();
						});
					},
					function (cb) {
						/* nexttick so that it doesn't pick up the suspended event */
						helper.Utils.nextTick(function () {
							channel.once(function (stateChange) {
								expect(stateChange.current).to.equal('attaching', 'Check channel tries again after a bit');
								cb();
							});
						});
					}
				],
				function (err) {
					closeAndFinish(done, realtime, err);
				}
			);
		});

		/* RTL3c, RTL3d
		 * Check channel state implications of connection going into suspended
		 */
		it('suspended_connection', function (done) {
			/* Use a fixed transport as attaches are resent when the transport changes */
			/* Browsers throttle setTimeouts to min 1s in in active tabs; having timeouts less than that screws with the relative timings */
			var realtime = helper.AblyRealtime({
					transports: [helper.bestTransport],
					channelRetryTimeout: 1010,
					suspendedRetryTimeout: 1100
				}),
				channelName = 'suspended_connection',
				channel = realtime.channels.get(channelName);

			async.series(
				[
					function (cb) {
						realtime.connection.once('connected', function () {
							cb();
						});
					},
					function (cb) {
						channel.attach(cb);
					},
					function (cb) {
						/* Have the connection go into the suspended state, and check that the
						 * channel goes into the suspended state and doesn't try to reattach
						 * until the connection reconnects */
						channel.sendMessage = function (msg) {
							expect(false, 'Channel tried to send a message ' + JSON.stringify(msg)).to.be.ok;
						};
						realtime.options.timeouts.realtimeRequestTimeout = 100;

						helper.becomeSuspended(realtime, function () {
							/* nextTick as connection event is emitted before channel state is changed */
							helper.Utils.nextTick(function () {
								expect(channel.state).to.equal('suspended', 'check channel state is suspended');
								cb();
							});
						});
					},
					function (cb) {
						realtime.connection.once(function (stateChange) {
							expect(stateChange.current).to.equal('connecting', 'Check we try to connect again');
							/* We no longer want to fail the test for an attach, but still want to sabotage it */
							channel.sendMessage = function () {};
							cb();
						});
					},
					function (cb) {
						channel.once(function (stateChange) {
							expect(stateChange.current).to.equal('attaching', 'Check that once connected we try to attach again');
							cb();
						});
					},
					function (cb) {
						channel.once(function (stateChange) {
							expect(stateChange.current).to.equal(
								'suspended',
								'Check that the channel goes back into suspended after attach fails'
							);
							expect(stateChange.reason && stateChange.reason.code).to.equal(90007, 'Check correct error code');
							cb();
						});
					}
				],
				function (err) {
					closeAndFinish(done, realtime, err);
				}
			);
		});

		/* RTL5i */
		it('attached_while_detaching', function (done) {
			var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] }),
				channelName = 'server_sent_detached',
				channel = realtime.channels.get(channelName);

			async.series(
				[
					function (cb) {
						realtime.connection.once('connected', function () {
							cb();
						});
					},
					function (cb) {
						channel.attach(cb);
					},
					function (cb) {
						/* Sabotage the detach attempt, detach, then simulate a server-sent attached while
						 * the detach is ongoing. Expect to see the library reassert the detach */
						let detachCount = 0;
						channel.sendMessage = function (msg) {
							expect(msg.action).to.equal(12, 'Check we only see a detach. No attaches!');
							expect(channel.state).to.equal('detaching', 'Check still in detaching state after both detaches');
							detachCount++;
							if (detachCount === 2) {
								/* we got our second detach! */
								cb();
							}
						};
						/* */
						channel.detach();
						setTimeout(function () {
							var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
							transport.onProtocolMessage(createPM({ action: 11, channel: channelName }));
						}, 0);
					}
				],
				function (err) {
					closeAndFinish(done, realtime, err);
				}
			);
		});

                // RTL5j
                it('detaching from suspended channel transitions channel to detached state', function (done) {
                    var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] });
                    var channelName = 'detach_from_suspended';
                    var channel = realtime.channels.get(channelName);

                    channel.state = 'suspended';
                    channel.detach(function () {
                        expect(channel.state).to.equal('detached', 'Check that detach on suspended channel results in detached channel');
                        done();
                    });
                });

                // RTL5b
                it('detaching from failed channel results in error', function (done) {
                    var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] });
                    var channelName = 'detach_from_failed';
                    var channel = realtime.channels.get(channelName);

                    channel.state = 'failed';

                    channel.detach(function(err) {
                      if (!err) {
                        done(new Error("expected detach to return error response"));
                        return;
                      }
                      done();
                    });
                });

                it('rewind works on channel after reattaching', function (done) {
                    var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] });
                    var channelName = 'rewind_after_detach';
                    var channel = realtime.channels.get(channelName);
                    var channelOpts = { params: { rewind: '1' } };
                    channel.setOptions(channelOpts);

                    var subscriber = function(message) {
                      expect(message.data).to.equal('message');
                      channel.unsubscribe(subscriber);
                      channel.detach(function(err) {
                        if (err) {
                          closeAndFinish(done, realtime, err);
                          return;
                        }
                        channel.subscribe(function(message) {
                          expect(message.data).to.equal('message');
                          closeAndFinish(done, realtime);
                        });
                      });
                    }

                    channel.publish('event', 'message');

                    channel.subscribe(subscriber);
                });
	});
});
