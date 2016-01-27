"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
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
				var channel0 = realtime.channels.get('channelinit0', {encrypted: true});
				test.equal(channel0.channelOptions.encrypted, true);

				/* set options on fetch */
				var channel1 = realtime.channels.get('channelinit0', {encrypted: false});
				test.equal(channel0.channelOptions.encrypted, false);
				test.equal(channel1.channelOptions.encrypted, false);

				/* set options with setOptions */
				channel1.setOptions({encrypted: true});
				test.equal(channel1.channelOptions.encrypted, true);
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
				realtime.channels.get(':hell').attach(function(err) {
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
	 * Implicit attach by publishing
	 */
	testOnAllTransports(exports, 'channelattach_publish', function(realtimeOpts) { return function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				realtime.channels.get('channelattach_publish').publish(function(err) {
					if(err) {
						test.ok(false, 'Unexpected attach failure');
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

	return module.exports = helper.withTimeout(exports);
});
