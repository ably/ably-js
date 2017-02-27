"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
	displayError = helper.displayError,
	utils = helper.Utils,
	closeAndFinish = helper.closeAndFinish,
	monitorConnection = helper.monitorConnection;

	exports.setupauth = function(test) {
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
	 * Check all eight events associated with connecting, attaching to a
	 * channel, detaching, and disconnecting are received once each
	 */
	exports.attachdetach0 = function(test) {
		test.expect(8);
		try {
			/* Note: realtime now sends an ATTACHED post-upgrade, which can race with
			 * the DETACHED if the DETACH is only sent just after upgrade. Remove
			 * bestTransport with 1.1 spec which has IDs in ATTACHs */
			var realtime = helper.AblyRealtime({transports: [helper.bestTransport]}),
			index,
			expectedConnectionEvents = [
				'connecting',
				'connected',
				'closing',
				'closed'
			],
			expectedChannelEvents= [
				'attaching',
				'attached',
				'detaching',
				'detached'
			];
			realtime.connection.on(function() {
				if((index = utils.arrIndexOf(expectedConnectionEvents, this.event)) > -1) {
					delete expectedConnectionEvents[index];
					test.ok(true, this.event + ' connection event received');
					if(this.event == 'closed') {
						test.done();
					}
				} else {
					test.ok(false, 'Unexpected ' + this.event + ' event received');
				}
			});
			realtime.connection.on('connected', function() {
				var channel = realtime.channels.get('channel');
				channel.on(function() {
					if((index = utils.arrIndexOf(expectedChannelEvents, this.event)) > -1) {
						delete expectedChannelEvents[index];
						test.ok(true, this.event + ' channel event received');
						switch(this.event) {
							case 'detached':
								realtime.close();
								break;
							case 'attached':
								channel.detach();
								break;
							default:
								break;
						}
					} else {
						test.ok(false, 'Unexpected ' + this.event + ' event received');
					}
				});
				channel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.emitCallsAllCallbacksIgnoringExceptions = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = false,
				eventEmitter = realtime.connection;

		eventEmitter.on('custom', function() { throw('Expected failure 1'); });
		eventEmitter.on('custom', function() { throw('Expected failure 2'); });
		eventEmitter.on('custom', function() { callbackCalled = true; });

		eventEmitter.emit('custom');
		test.ok(callbackCalled, 'Last callback should have been called');
		closeAndFinish(test, realtime);
	}

	exports.onceCalledOnlyOnce = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				onCallbackCalled = 0,
				onceCallbackCalled = 0,
				eventEmitter = realtime.connection;

		eventEmitter.once('custom', function() { onceCallbackCalled += 1; });
		eventEmitter.on('custom', function() { onCallbackCalled += 1; });

		eventEmitter.emit('custom');
		eventEmitter.emit('custom');
		eventEmitter.emit('custom');

		test.equals(onCallbackCalled, 3, 'On callback called every time');
		test.equals(onceCallbackCalled, 1, 'Once callback called once');

		closeAndFinish(test, realtime);
	}

	exports.onceCallbackDoesNotImpactOnCallback = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		eventEmitter.on('custom', callback);
		eventEmitter.once('custom', callback);
		eventEmitter.once('custom', callback);

		eventEmitter.emit('custom');
		eventEmitter.emit('custom');

		test.equals(callbackCalled, 4, 'On callback called both times but once callbacks only called once');

		closeAndFinish(test, realtime);
	}

	exports.offRemovesAllMatchingListeners = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		eventEmitter.on('custom', callback);

		eventEmitter.emit('custom');
		test.equals(callbackCalled, 3, 'The same callback should have been called for every registration');

		callbackCalled = 0;
		eventEmitter.off(callback);
		eventEmitter.emit('custom');
		test.equals(callbackCalled, 0, 'All callbacks should have been removed');

		closeAndFinish(test, realtime);
	}

	exports.offRemovesAllListeners = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		eventEmitter.on('custom', callback);

		eventEmitter.emit('custom');
		test.equals(callbackCalled, 3, 'The same callback should have been called for every registration');

		callbackCalled = 0;
		eventEmitter.off();
		eventEmitter.emit('custom');
		test.equals(callbackCalled, 0, 'All callbacks should have been removed');

		closeAndFinish(test, realtime);
	}

	exports.offRemovesAllMatchingEventListeners = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		eventEmitter.on('custom', callback);

		eventEmitter.emit('custom');
		test.equals(callbackCalled, 3, 'The same callback should have been called for every registration');

		callbackCalled = 0;
		eventEmitter.off('custom', callback);
		eventEmitter.emit('custom');
		test.equals(callbackCalled, 0, 'All callbacks should have been removed');

		closeAndFinish(test, realtime);
	}

	exports.offRemovesAllMatchingEvents = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		eventEmitter.on('custom', callback);

		eventEmitter.emit('custom');
		test.equals(callbackCalled, 3, 'The same callback should have been called for every registration');

		callbackCalled = 0;
		eventEmitter.off('custom');
		eventEmitter.emit('custom');
		test.equals(callbackCalled, 0, 'All callbacks should have been removed');

		closeAndFinish(test, realtime);
	}

	/**
	 * Ensures that when a listener is removed and there
	 * are no more listeners for that event name,
	 * the key is removed entirely from listeners to avoid the
	 * listener object growing with unnecessary empty arrays
	 * for each previously registered event name
	 */
	exports.offRemovesEmptyEventNameListeners = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				eventEmitter = realtime.connection;

		var callback = function() {};

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		test.ok('custom' in eventEmitter.events, 'custom event array exists');

		eventEmitter.off('custom', callback);
		test.ok(!('custom' in eventEmitter.events), 'custom event listener array is removed from object');

		eventEmitter.once('custom', callback);
		eventEmitter.on('custom', callback);
		test.ok('custom' in eventEmitter.events, 'custom event array exists');

		eventEmitter.off(callback);
		test.ok(!('custom' in eventEmitter.events), 'event listener array is removed from object');

		closeAndFinish(test, realtime);
	}

	exports.arrayOfEvents = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
				callbackCalled = 0,
				eventEmitter = realtime.connection;

		var callback = function() { callbackCalled += 1; };

		callbackCalled = 0;
		eventEmitter.on(['a', 'b', 'c'], callback);
		eventEmitter.emit('a');
		eventEmitter.emit('b');
		eventEmitter.emit('c');
		test.equals(callbackCalled, 3, 'listener listens to all events in array');

		eventEmitter.off(['a', 'b', 'c'], callback);
		eventEmitter.emit('a');
		eventEmitter.emit('b');
		eventEmitter.emit('c');
		test.equals(callbackCalled, 3, 'All callbacks should have been removed');

		callbackCalled = 0;
		eventEmitter.on(['a', 'b', 'c'], callback);
		eventEmitter.off('a', callback);
		eventEmitter.emit('a');
		test.equals(callbackCalled, 0, 'callback ‘a’ should have been removed');
		eventEmitter.emit('b');
		eventEmitter.emit('c');
		test.equals(callbackCalled, 2, 'callbacks b and c should not have been removed');

		closeAndFinish(test, realtime);
	}

	/* check that listeners added in a listener cb are not called during that
	 * emit instance */
	exports.listenerAddedInListenerCb = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
			eventEmitter = realtime.connection,
			firstCbCalled = false,
			secondCbCalled = false;

		eventEmitter.on('a', function() {
			firstCbCalled = true;
			eventEmitter.on('a', function() {
				secondCbCalled = true;
			});
		});
		eventEmitter.emit('a');

		test.ok(firstCbCalled, 'check first callback called');
		test.ok(!secondCbCalled, 'check second callback not called');

		closeAndFinish(test, realtime);
	};

	/* check that listeners removed in a listener cb are still called in that
	 * emit instance (but only once) */
	exports.listenerRemovedInListenerCb = function(test) {
		var realtime = helper.AblyRealtime({ autoConnect: false }),
			eventEmitter = realtime.connection,
			onCbCalledTimes = 0,
			onceCbCalledTimes = 0,
			anyCbCalledTimes = 0,
			anyOnceCbCalledTimes = 0;

		eventEmitter.on('a', function() {
			onCbCalledTimes++;
			eventEmitter.off('a');
		});

		eventEmitter.once('a', function() {
			onceCbCalledTimes++;
			eventEmitter.off('a');
		});

		eventEmitter.on(function() {
			anyCbCalledTimes++;
			eventEmitter.off();
		});

		eventEmitter.once(function() {
			anyOnceCbCalledTimes++;
			eventEmitter.off();
		});

		eventEmitter.emit('a');

		test.equal(onCbCalledTimes, 1, 'check on callback called exactly once');
		test.equal(onceCbCalledTimes, 1, 'check once callback called exactly once');
		test.equal(anyCbCalledTimes, 1, 'check any callback called exactly once');
		test.equal(anyOnceCbCalledTimes, 1, 'check anyOnce callback called exactly once');

		closeAndFinish(test, realtime);
	}

	return module.exports = helper.withTimeout(exports);
});
