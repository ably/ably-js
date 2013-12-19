"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var enable_logging = false;
	var pusher;

	function log(str) { enable_logging && console.log(str); }

	/* Setup underlying accounts, etc, if they aren't already set up */
	rExports.localsetup = base.setupTest;
	rExports.getPusher = function(test) { pusher = base.getPusher(); test.done(); }

	/*
	 * Set up a subscriber on a presence channel, check that the member information is
	 * received when the subscription is successful. Open up a separate connection to
	 * Ably and connect using a different clientId to ensure that we get presence events
	 * on the pusher channel.
	 */
	rExports.presenceTest1 = function(test) {
		var channel, channelName = 'presence-channel-'+base.randomid(8);

		pusher.connection.bind('error', function(err) { test.ok(false, 'pusher::connection.error: Callback should not be called'); });
		pusher.connection.bind('initialized', function() { log("connection::initialized: "+pusher.connection.state); });
		pusher.connection.bind('connecting', function() { log("connection::connecting: "+pusher.connection.state); });
		pusher.connection.bind('connected', function() { log("connection::connected: "+pusher.connection.state); });
		pusher.connection.bind('unavailable', function() { test.ok(false, 'pusher::connection.unavailable0: Callback should not be called'); });
		pusher.connection.bind('failed', function() { test.ok(false, 'pusher::connection.unavailable0: Callback should not be called'); });
		pusher.connection.bind('disconnected', function() { test.ok(false, 'pusher::connection.unavailable0: Callback should not be called'); });
		pusher.connection.bind('connecting_in', function(data) { test.ok(false, 'pusher::connection.unavailable0: Callback should not be called'); });
		var stateChangeListener = function(data) { log("connection::state_change: "+JSON.stringify(data)); };
		pusher.connection.bind('state_change', stateChangeListener);

		// Calculate number of expected assertions
		test.expect(
			4											// subscribe.subscription_succeeded
			+ 3											// bind_all(subscription_succeeded,member_added,member_removed)
			+ 2											// pusher:member_added
			+ 2											// pusher:member_removed
		);

		function unsub() {
			// Unsubscribe
			pusher.unsubscribe(channelName);
			test.done();
		};

		// Subscribe to the presence channel
		channel = pusher.subscribe(channelName);
		channel.bind('pusher:member_added', function(member) {
			log('pusher:member_added: ' + JSON.stringify(member));
			test.ok(member.hasOwnProperty('id'), 'pusher:member_added parameter should have id member');
			test.ok(member.hasOwnProperty('info'), 'pusher:member_added parameter should have info member');
		});
		channel.bind('pusher:member_removed', function(member) {
			log('pusher:member_removed: ' + JSON.stringify(member));
			test.ok(member.hasOwnProperty('id'), 'pusher:member_removed parameter should have id member');
			test.ok(member.hasOwnProperty('info'), 'pusher:member_removed parameter should have info member');
		});
		channel.bind('pusher:subscription_succeeded', function(data) {
			log("pusher:subscription_succeeded: "+JSON.stringify(data));
			test.deepEqual(data, channel.members, 'pusher:subscription_succeeded parameter should be the same as channel.members');
			test.ok(data.count != -1, 'pusher:subscription_succeeded parameter count error');
			data.each(function(member) {
				test.ok(member.hasOwnProperty('id'), 'pusher:subscription_succeeded parameter should have id member');
				test.ok(member.hasOwnProperty('info'), 'pusher:subscription_succeeded parameter should have info member');
				//log('pusher:subscription_succeeded: member '+JSON.stringify(member));
			});

			// Create another Ably realtime connection and join the same channel, with a different clientId
			var sideAbly = base.getAblyRealtime(base.randomid(6));
			var sideChannel = sideAbly.channels.get(channelName);
			sideChannel.subscribe(function(message) {
				test.ok(false, 'Side channel to Ably should not receive messages');
			});
			sideChannel.presence.enter(function(err) {
				//log('sideChannel.presence: Entered');
				setTimeout(function() {
					//log('sideChannel.presence: Leaving');
					sideAbly.close();
					setTimeout(function() {
						unsub();
					}, 2000);
				}, 2000);
			});
		});
		channel.bind('pusher:subscription_error', function(data) { test.ok(false, 'pusher:subscription_error: callback should not be called'); });
		channel.bind_all(function(event,data) {
			log('subscribe::bind_all: '+event+', '+JSON.stringify(data));
			if (event == 'pusher:subscription_succeeded') {
				test.ok(true, 'subscribe::bind_all: Got pusher:subscription_succeeded event');
			} else if (event == 'pusher:member_added') {
				test.ok(true, 'subscribe::bind_all: Got pusher:member_added event');
			} else if (event == 'pusher:member_removed') {
				test.ok(true, 'subscribe::bind_all: Got pusher:member_removed event');
			} else {
				log('Warning: subscribe::bind_all: Got unexpected event: '+event+' (not treating as test failure)');
			}
		});
	}

	/* Wait a bit */
	rExports.wait = function(test) {
		setTimeout(function() { test.done(); }, 1000);
	}

	/* Clear down underlying accounts, etc, if they were set up locally */
	rExports.cleardown = base.clearTest;

	return rExports;
};
