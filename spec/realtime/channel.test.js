"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		testOnAllTransports = helper.testOnAllTransports;

	exports.setupchannel = function(test) {
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

	/*
	 * Channel init with options
	 */
	testOnAllTransports(exports, 'channelinit0', function(realtimeOpts) { return function(test) {
		test.expect(4);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.on('connected', function() {
				/* set options on init */
				var channel0 = realtime.channels.get('channelinit0', {fakeOption: true});
				test.equal(channel0.channelOptions.fakeOption, true);

				/* set options on fetch */
				var channel1 = realtime.channels.get('channelinit0', {fakeOption: false});
				test.equal(channel0.channelOptions.fakeOption, false);
				test.equal(channel1.channelOptions.fakeOption, false);

				/* set options with setOptions */
				channel1.setOptions({fakeOption: true});
				test.equal(channel1.channelOptions.fakeOption, true);
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Base attach case
	 */
	testOnAllTransports(exports, 'channelattach0', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channelattach0');
				channel0.attach(function(err) {
					if(err)
						test.ok(false, 'Attach failed with error: ' + displayError(err));
					else
						test.ok(true, 'Attach to channel 0 with no options');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Attach before connect
	 */
	testOnAllTransports(exports, 'channelattach2', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			var channel2 = realtime.channels.get('channelattach2');
			channel2.attach(function(err) {
				if(err)
					test.ok(false, 'Attach failed with error: ' + displayError(err));
				else
					test.ok(true, 'Attach to channel 0 with no options');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Attach then detach
	 */
	testOnAllTransports(exports, 'channelattach3', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channelattach3');
				channel0.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
					}
					channel0.detach(function(err) {
						if(err) {
							test.ok(false, 'Detach failed with error: ' + displayError(err));
							closeAndFinish(test, realtime);
						}
						if(channel0.state == 'detached')
							test.ok(true, 'Attach then detach to channel 0 with no options');
						else
							test.ok(false, 'Detach failed: State is '+channel0.state);
						closeAndFinish(test, realtime);
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Attach with an empty channel and expect a channel error
	 * and the connection to remain open
	 */
	testOnAllTransports(exports, 'channelattachempty', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				var channel0 = realtime.channels.get('');
				channel0.attach(function(err) {
					if(err) {
						test.expect(2);
						test.ok(true, 'Attach failed as expected');
						setTimeout(function() {
							test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
							closeAndFinish(test, realtime);
						}, 1000);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Attach with an invalid channel name and expect a channel error
	 * and the connection to remain open
	 */
	testOnAllTransports(exports, 'channelattachinvalid', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				var channel = realtime.channels.get(':hell')
				channel.attach(function(err) {
					if(err) {
						test.expect(4);
						test.ok(true, 'Attach failed as expected');
						test.equal(channel.errorReason.code, 40010, 'Attach error was set as the channel errorReason');
						test.equal(err.code, 40010, 'Attach error was passed to the attach callback');
						setTimeout(function() {
							test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
							closeAndFinish(test, realtime);
						}, 1000);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Implicit attach by publishing
	 */
	testOnAllTransports(exports, 'channelattach_publish', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				realtime.channels.get('channelattach_publish').publish(function(err) {
					if(err) {
						test.ok(false, 'Unexpected attach failure: ' + helper.displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					test.ok(true, 'publish succeeded');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channelattach_publish failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Implicit attach with an invalid channel name by publishing
	 */
	testOnAllTransports(exports, 'channelattach_publish_invalid', function(realtimeOpts) { return function(test) {
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				realtime.channels.get(':hell').publish(function(err) {
					if(err) {
						test.ok(true, 'publish failed as expected');
						test.equal(err.code, 40010, "correct error code")
						closeAndFinish(test, realtime);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channelattach_publish_invalid failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});

	/*
	 * Attach with an invalid channel name and expect a channel error
	 * and the connection to remain open
	 */
	testOnAllTransports(exports, 'channelattach_invalid_twice', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				realtime.channels.get(':hell').attach(function(err) {
					if(err) {
						test.expect(2);
						test.ok(true, 'Attach failed as expected');
						/* attempt second attach */
						realtime.channels.get(':hell').attach(function(err) {
							if(err) {
								test.expect(3);
								test.ok(true, 'Attach (second attempt) failed as expected');
								setTimeout(function() {
									test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
									closeAndFinish(test, realtime);
								}, 1000);
								return;
							}
							test.ok(false, 'Unexpected attach (second attempt) success');
							closeAndFinish(test, realtime);
						});
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	}});


	/*
	 * Attach then later call whenState which fires immediately
	 */
	exports.channelattachOnceOrIfAfter = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(),
					channel = realtime.channels.get('channelattachOnceOrIf'),
					firedImmediately = false;

			channel.attach(function(err) {
				channel.whenState('attached', function() {
					firedImmediately = true;
				});
				test.ok(firedImmediately, 'whenState fired immediately as attached');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach and call whenState before attach which fires later
	 */
	exports.channelattachOnceOrIfBefore = function(test) {
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime(),
					channel = realtime.channels.get('channelattachOnceOrIf'),
					firedImmediately = false;

			channel.attach();
			channel.whenState('attached', function() {
				firedImmediately = true;
				test.ok(channel.state === 'attached', 'whenState fired when attached');
				closeAndFinish(test, realtime);
			});
			test.ok(!firedImmediately, 'whenState should not fire immediately as not attached');
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Subscribe, then unsubscribe, binary transport
	 */
	exports.channelsubscribe0 = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime({ useBinaryProtocol: true });
			realtime.connection.on('connected', function() {
				var channel6 = realtime.channels.get('channelsubscribe0');
				channel6.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
					}
					try {
						channel6.subscribe('event0', function() {});
						setTimeout(function() {
							try {
								channel6.unsubscribe('event0', function() {});
								test.ok(true, 'Subscribe then unsubscribe to channel6:event0 with no options');
								closeAndFinish(test, realtime);
							} catch(e) {
								test.ok(false, 'Unsubscribe failed with error: ' + e.stack);
								closeAndFinish(test, realtime);
							}
						}, 1000);
					} catch(e) {
						test.ok(false, 'Subscribe failed with error: ' + e);
						closeAndFinish(test, realtime);
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel subscribe failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Subscribe, then unsubscribe listeners by event, by listener, and then all events & listener
	 */
	exports.channelsubscribe1 = function(test) {
		var messagesReceived = 0;
		test.expect(7);

		try {
			var realtime = helper.AblyRealtime();
			var channelByEvent, channelByListener, channelAll;

			var unsubscribeTest = function() {
				channelByEvent.unsubscribe('event', listenerByEvent);
				channelByListener.unsubscribe(listenerNoEvent);
				channelAll.unsubscribe();
				channelByEvent.publish('event', 'data', function(err) {
					test.ok(!err, 'Error publishing single event: ' + err);
					channelByListener.publish(null, 'data', function(err) {
						test.ok(!err, 'Error publishing any event: ' + err);
						channelAll.publish(null, 'data', function(err) {
							test.ok(!err, 'Error publishing any event: ' + err);
							test.equal(messagesReceived, 3, 'Only three messages should be received by the listeners');
							closeAndFinish(test, realtime);
						});
					});
				});
			};

			var listenerByEvent = function() {
				test.ok(true, 'received event "event" on channel');
				messagesReceived += 1;
				if (messagesReceived == 3) { unsubscribeTest(); }
			};
			var listenerNoEvent = function() {
				test.ok(true, 'received any event on channel');
				messagesReceived += 1;
				if (messagesReceived == 3) { unsubscribeTest(); }
			};
			var listenerAllEvents = function() { return listenerNoEvent(); };

			realtime.connection.on('connected', function() {
				channelByEvent = realtime.channels.get('channelsubscribe1-event');
				channelByEvent.subscribe('event', listenerByEvent, function() {
					channelByEvent.publish('event', 'data');
					channelByListener = realtime.channels.get('channelsubscribe1-listener');
					channelByListener.subscribe(null, listenerNoEvent, function() {
						channelByListener.publish(null, 'data');
						channelAll = realtime.channels.get('channelsubscribe1-all');
						channelAll.subscribe(listenerAllEvents, function() {
							channelAll.publish(null, 'data');
						});
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel subscribe failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/* RTL13
	 * A server-sent DETACHED, with err, should cause the channel to attempt an
	 * immediate reattach. If that fails, it should go into suspended
	 */
	exports.server_sent_detached = function(test) {
		var realtime = helper.AblyRealtime({transport: [helper.bestTransport]}),
			channelName = 'server_sent_detached',
			channel = realtime.channels.get(channelName);

		test.expect(4);
		async.series([
			function(cb) {
				realtime.connection.once('connected', function() { cb(); });
			},
			function(cb) {
				channel.attach(cb);
			},
			function(cb) {
				/* Sabotage the reattach attempt, then simulate a server-sent detach */
				channel.sendMessage = function() {};
				realtime.options.timeouts.realtimeRequestTimeout = 100;
				channel.once(function(stateChange) {
					test.equal(stateChange.current, 'attaching', 'Channel reattach attempt happens immediately');
					test.equal(stateChange.reason.code, 50000, 'check error is propogated in the reason');
					cb();
				});
				var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
				transport.onProtocolMessage({action: 13, channel: channelName, error: {statusCode: 500, code: 50000, message: "generic serverside failure"}});
			},
			function(cb) {
				channel.once(function(stateChange) {
					test.equal(stateChange.current, 'suspended', 'Channel we go into suspended');
					test.equal(stateChange.reason.code, 90000, 'check error is now the timeout');
					cb();
				});
			},
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	};

	/*
	 * A server-sent ERROR, with channel field, should fail the channel
	 */
	exports.server_sent_error = function(test) {
		var realtime = helper.AblyRealtime({transport: [helper.bestTransport]}),
			channelName = 'server_sent_error',
			channel = realtime.channels.get(channelName);

		test.expect(2);
		realtime.connection.once('connected', function() {
			channel.attach(function(err) {
				if(err) {
					test.ok(false, helper.displayError(err));
					closeAndFinish(test, realtime);
					return;
				}

				channel.on('failed', function(stateChange) {
					test.ok(true, 'Channel was failed');
					test.equal(stateChange.reason.code, 50000, 'check error is propogated');
					closeAndFinish(test, realtime);
				});
				var transport = realtime.connection.connectionManager.activeProtocol.getTransport();
				transport.onProtocolMessage({action: 9, channel: channelName, error: {statusCode: 500, code: 50000, message: "generic serverside failure"}});
			});
		});
	};

	/*
	 * Check that queueMessages: false disables queuing both for channel and connection queue states
	 */
	exports.publish_no_queueing = function(test) {
		test.expect(3);
		var realtime = helper.AblyRealtime({ queueMessages: false }),
			channel = realtime.channels.get('publish_no_queueing');

		realtime.connection.once('connected', function() {
			/* First try a publish while connected but attaching */
			channel.publish('foo', 'bar', function(err) {
				test.ok(err, 'Check publish while still attaching was rejected');
				test.equal(err.code, 90001, 'Check correct error code');

				channel.attach(function(err) {
					if(err) {
						test.ok(false, helper.displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					realtime.connection.connectionManager.disconnectAllTransports();
					/* now try a publish while attached but disconnected */
					channel.publish('foo', 'bar', function(err) {
						test.ok(err, 'Check publish while disconnected/connecting is rejected');
						closeAndFinish(test, realtime);
					});
				});
			});
			monitorConnection(test, realtime);
		});
	};

	/*
	 * A channel attach that times out should be retried
	 */
	exports.channel_attach_timeout = function(test) {
		test.expect(4);
		/* Use a fixed transport as attaches are resent when the transport changes */
		var realtime = helper.AblyRealtime({transport: [helper.bestTransport], realtimeRequestTimeout: 100, channelRetryTimeout: 100}),
			channelName = 'channel_attach_timeout',
			channel = realtime.channels.get(channelName);

		/* Stub out the channel's ability to communicate */
		channel.sendMessage = function() {};

		async.series([
			function(cb) {
				realtime.connection.once('connected', function() { cb(); });
			},
			function(cb) {
				channel.attach(function(err) {
					test.ok(err, 'Channel attach timed out as expected');
					test.equal(err && err.code, 90000, 'Attach timeout err passed to attach callback');
					test.equal(channel.state, 'suspended', 'Check channel state goes to suspended');
					cb();
				});
			},
			function(cb) {
				/* nexttick so that it doesn't pick up the suspended event */
				helper.Utils.nextTick(function() {
					channel.once(function(stateChange) {
						test.equal(stateChange.current, 'attaching', 'Check channel tries again after a bit');
						cb();
					});
				});
			}
		], function() {
			closeAndFinish(test, realtime);
		});
	};

	/* RTL3c, RTL3d
	 * Check channel state implications of connection going into suspended
	 */
	exports.suspended_connection = function(test) {
		/* Use a fixed transport as attaches are resent when the transport changes */
		var realtime = helper.AblyRealtime({transports: [helper.bestTransport], channelRetryTimeout: 100, suspendedRetryTimeout: 1000}),
			channelName = 'suspended_connection',
			channel = realtime.channels.get(channelName);

		test.expect(5);
		async.series([
			function(cb) {
				realtime.connection.once('connected', function() { cb(); });
			},
			function(cb) {
				channel.attach(cb);
			},
			function(cb) {
				/* Have the connection go into the suspended state, and check that the
				 * channel goes into the suspended state and doesn't try to reattach
				 * until the connection reconnects */
				channel.sendMessage = function(msg) {
					test.ok(false, 'Channel tried to send a message ' + JSON.stringify(msg));
				};
				realtime.options.timeouts.realtimeRequestTimeout = 100;

				helper.becomeSuspended(realtime, function() {
					/* nextTick as connection event is emitted before channel state is changed */
					helper.Utils.nextTick(function() {
						test.equal(channel.state, 'suspended', 'check channel state is suspended');
						cb();
					});
				});
			},
			function(cb) {
				realtime.connection.once(function(stateChange) {
					test.equal(stateChange.current, 'connecting', 'Check we try to connect again');
					/* We no longer want to fail the test for an attach, but still want to sabotage it */
					channel.sendMessage = function() {};
					cb();
				});
			},
			function(cb) {
				channel.once(function(stateChange) {
					test.equal(stateChange.current, 'attaching', 'Check that once connected we try to attach again');
					cb();
				});
			},
			function(cb) {
				channel.once('error', function(error) {
					test.ok(true, 'Check that the failure to reattach is emitted as an error');
					test.equal(error.code, 91200, 'Check correct error code');
					cb();
				});
			},
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	};


	return module.exports = helper.withTimeout(exports);
});
