"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
	displayError = helper.displayError,
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
				if((index = expectedConnectionEvents.indexOf(this.event)) > -1) {
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
					if((index = expectedChannelEvents.indexOf(this.event)) > -1) {
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
						test.ok(false, 'Attach failed with error: ' + err);
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

	return module.exports = helper.withTimeout(exports);
});
