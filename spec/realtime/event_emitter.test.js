"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('realtime/event_emitter', function (expect, counter) {
		var exports = {},
		displayError = helper.displayError,
		utils = helper.Utils,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

		it('setupauth', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				done();
			});
		});

		/*
		* Check all eight events associated with connecting, attaching to a
		* channel, detaching, and disconnecting are received once each
		*/
		it('attachdetach0', function(done) {
			counter.expect(8);
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
				expectedChannelEvents = [
					'attaching',
					'attached',
					'detaching',
					'detached'
				];
				realtime.connection.on(function() {
					if((index = utils.arrIndexOf(expectedConnectionEvents, this.event)) > -1) {
						delete expectedConnectionEvents[index];
						expect(true, this.event + ' connection event received');
						if(this.event == 'closed') {
							done();
						}
					} else {
						expect(false, 'Unexpected ' + this.event + ' event received');
					}
				});
				realtime.connection.on('connected', function() {
					var channel = realtime.channels.get('channel');
					channel.on(function() {
						if((index = utils.arrIndexOf(expectedChannelEvents, this.event)) > -1) {
							delete expectedChannelEvents[index];
							expect(true, this.event + ' channel event received');
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
							expect(false, 'Unexpected ' + this.event + ' event received');
						}
					});
					channel.attach(function(err) {
						if(err) {
							expect(false, 'Attach failed with error: ' + displayError(err));
							closeAndFinish(done, realtime);
						}
					});
				});
				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('emitCallsAllCallbacksIgnoringExceptions', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = false,
					eventEmitter = realtime.connection;

			eventEmitter.on('custom', function() { throw('Expected failure 1'); });
			eventEmitter.on('custom', function() { throw('Expected failure 2'); });
			eventEmitter.on('custom', function() { callbackCalled = true; });

			eventEmitter.emit('custom');
			expect(callbackCalled, 'Last callback should have been called');
			closeAndFinish(done, realtime);
		})

		it('onceCalledOnlyOnce', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					onCallbackCalled = 0,
					onceCallbackCalled = 0,
					eventEmitter = realtime.connection;

			eventEmitter.once('custom', function() { onceCallbackCalled += 1; });
			eventEmitter.on('custom', function() { onCallbackCalled += 1; });

			eventEmitter.emit('custom');
			eventEmitter.emit('custom');
			eventEmitter.emit('custom');

			expect(onCallbackCalled).to.equal(3, 'On callback called every time');
			expect(onceCallbackCalled).to.equal(1, 'Once callback called once');

			closeAndFinish(done, realtime);
		})

		it('onceCallbackDoesNotImpactOnCallback', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			eventEmitter.on('custom', callback);
			eventEmitter.once('custom', callback);
			eventEmitter.once('custom', callback);

			eventEmitter.emit('custom');
			eventEmitter.emit('custom');

			expect(callbackCalled).to.equal(4, 'On callback called both times but once callbacks only called once');

			closeAndFinish(done, realtime);
		})

		it('offRemovesAllMatchingListeners', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			eventEmitter.on('custom', callback);

			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

			callbackCalled = 0;
			eventEmitter.off(callback);
			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');

			closeAndFinish(done, realtime);
		})

		it('offRemovesAllListeners', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			eventEmitter.on('custom', callback);

			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

			callbackCalled = 0;
			eventEmitter.off();
			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');

			closeAndFinish(done, realtime);
		})

		it('offRemovesAllMatchingEventListeners', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			eventEmitter.on('custom', callback);

			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

			callbackCalled = 0;
			eventEmitter.off('custom', callback);
			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');

			closeAndFinish(done, realtime);
		})

		it('offRemovesAllMatchingEvents', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			eventEmitter.on('custom', callback);

			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

			callbackCalled = 0;
			eventEmitter.off('custom');
			eventEmitter.emit('custom');
			expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');

			closeAndFinish(done, realtime);
		})

		/**
		 * Ensures that when a listener is removed and there
		 * are no more listeners for that event name,
		 * the key is removed entirely from listeners to avoid the
		 * listener object growing with unnecessary empty arrays
		 * for each previously registered event name
		 */
		it('offRemovesEmptyEventNameListeners', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					eventEmitter = realtime.connection;

			var callback = function() {};

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			expect('custom' in eventEmitter.events, 'custom event array exists');

			eventEmitter.off('custom', callback);
			expect(!('custom' in eventEmitter.events), 'custom event listener array is removed from object');

			eventEmitter.once('custom', callback);
			eventEmitter.on('custom', callback);
			expect('custom' in eventEmitter.events, 'custom event array exists');

			eventEmitter.off(callback);
			expect(!('custom' in eventEmitter.events), 'event listener array is removed from object');

			closeAndFinish(done, realtime);
		})

		it('arrayOfEvents', function(done) {
			var realtime = helper.AblyRealtime({ autoConnect: false }),
					callbackCalled = 0,
					eventEmitter = realtime.connection;

			var callback = function() { callbackCalled += 1; };

			callbackCalled = 0;
			eventEmitter.on(['a', 'b', 'c'], callback);
			eventEmitter.emit('a');
			eventEmitter.emit('b');
			eventEmitter.emit('c');
			expect(callbackCalled).to.equal(3, 'listener listens to all events in array');

			eventEmitter.off(['a', 'b', 'c'], callback);
			eventEmitter.emit('a');
			eventEmitter.emit('b');
			eventEmitter.emit('c');
			expect(callbackCalled).to.equal(3, 'All callbacks should have been removed');

			callbackCalled = 0;
			eventEmitter.on(['a', 'b', 'c'], callback);
			eventEmitter.off('a', callback);
			eventEmitter.emit('a');
			expect(callbackCalled).to.equal(0, 'callback ‘a’ should have been removed');
			eventEmitter.emit('b');
			eventEmitter.emit('c');
			expect(callbackCalled).to.equal(2, 'callbacks b and c should not have been removed');

			closeAndFinish(done, realtime);
		})

		/* check that listeners added in a listener cb are not called during that
		* emit instance */
		it('listenerAddedInListenerCb', function(done) {
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

			expect(firstCbCalled, 'check first callback called');
			expect(!secondCbCalled, 'check second callback not called');

			closeAndFinish(done, realtime);
		});

		/* check that listeners removed in a listener cb are still called in that
		* emit instance (but only once) */
		it('listenerRemovedInListenerCb', function(done) {
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

			expect(onCbCalledTimes).to.equal(1, 'check on callback called exactly once');
			expect(onceCbCalledTimes).to.equal(1, 'check once callback called exactly once');
			expect(anyCbCalledTimes).to.equal(1, 'check any callback called exactly once');
			expect(anyOnceCbCalledTimes).to.equal(1, 'check anyOnce callback called exactly once');

			closeAndFinish(done, realtime);
		})
	});
});
