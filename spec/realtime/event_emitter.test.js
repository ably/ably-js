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
			var realtime = helper.AblyRealtime(),
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

		var callback = function() { callbackCalled += 1; }

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

		var callback = function() { callbackCalled += 1; }

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

		var callback = function() { callbackCalled += 1; }

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

		var callback = function() { callbackCalled += 1; }

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

		var callback = function() { callbackCalled += 1; }

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

	return module.exports = helper.withTimeout(exports);
});
