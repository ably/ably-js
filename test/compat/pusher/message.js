"use strict";
var base = require('./common');
var containsValue = base.containsValue;
var displayError = base.displayError;
var pusher;
var _exports = {};
var enable_logging = false;
function log(str) { enable_logging && console.log(str); }

/* Setup underlying accounts, etc, if they aren't already set up */
exports.localsetup = base.setupTest;
exports.getPusher = function(test) { pusher = base.getPusher(); test.done(); }

/*
 * Set up a subscriber, publish some messages, check that the callbacks look sensible
 */
exports.messageTest1 = function(test) {
	var testMessage = { obj : "value", obj2 : "other value" };
	var numPublishes = 4, numExtraPublishes = 2, numReceipts = 0;
	var channel, channelName = 'test-channel-'+base.randomid(8);

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
		1											// subscribe.subscription_succeeded
		+ numPublishes + 1							// subscribe.bind_all (subscription_succeeded, client-message)
		+ numPublishes								// subscribe.callback
		+ numPublishes								// return value from channel.trigger
		+ numExtraPublishes							// return value from channel.trigger
	);

	function unsub() {
		// Unsubscribe
		pusher.unsubscribe(channelName);
	
		// Publish a few more messages; the subscribe callbacks shouldn't get called
		for (var i=0; i<numExtraPublishes; i++) {
			var result = channel.trigger('client-message', testMessage);
			test.ok(result, 'channel.trigger should return true');
		}

		// Wait a while to check that we don't get any subscribe callbacks, then complete
		console.log('... waiting 5 seconds ...')
		setTimeout(function() {
			// Unbind from some events, to exercise the code (although results are not tested)
			pusher.connection.unbind('state_change', stateChangeListener);
			test.done();
		}, 5000);
	};

	// Subscribe to the test channel
	channel = pusher.subscribe(channelName);
	channel.bind('client-message', function(data) {
		log('subscribe::client-message: ' + JSON.stringify(data));
		test.deepEqual(testMessage, data, 'message data not equal to testMessage');
		if (++numReceipts == numPublishes)	// If we've got enough messages, unsubscribe
			unsub();
	});
	channel.bind('pusher:subscription_succeeded', function(data) {
		log("pusher:subscription_succeeded: "+JSON.stringify(data));
		test.ok(true, 'pusher:subscription_succeeded: Subscription succeeded');
	});
	channel.bind('pusher:subscription_error', function(data) { test.ok(false, 'pusher:subscription_error: callback should not be called'); });
	channel.bind_all(function(event,data) {
		log('subscribe::bind_all: '+event+', '+JSON.stringify(data));
		if (event == 'pusher:subscription_succeeded') {
			test.ok(true, 'subscribe::bind_all: Got pusher:subscription_succeeded event');
		} else if (event == 'client-message') {
			test.ok(true, 'subscribe::bind_all: Got client-message event');
		} else {
			log('Warning: subscribe::bind_all: Got unexpected event: '+event+' (not treating as test failure)');
		}
	});

	// Publish a few messages
	for (var i=0; i<numPublishes; i++) {
		var result = channel.trigger('client-message', testMessage);
		test.ok(result, 'channel.trigger should return true');
	}

	// Note: After these messages have been received, the above "unsub" function will unsubscribe,
	// publish some more messages, wait a while to check that we don't get subscribe callbacks for
	// them and then call test.done()
}

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
