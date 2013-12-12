"use strict";
var _exports = {};
var pubnub;
var enable_logging = false;

function log(str) { enable_logging && console.log(str); }

exports.setup = function(base) {
	var rExports = {};
	var containsValue = base.containsValue;
	var displayError = base.displayError;

	/* Setup underlying accounts, etc, if they aren't already set up */
	rExports.localsetup = base.setupTest;
	rExports.getPubnub = function(test) { pubnub = base.getPubnub(); test.done(); }

	/*
	 * Set up a subscriber, publish some messages, check that the callbacks look sensible
	 */
	rExports.messageTest1 = function(test) {
		var testMessage = { obj : "value", obj2 : "other value" };
		var numPublishes = 4, numExtraPublishes = 2, numReceipts = 0;

		// Calculate number of expected assertions
		test.expect(
			1											// subscribe.connect
			+ numPublishes								// subscribe.callback
			+ ((numPublishes+numExtraPublishes) * 5)	// publish.callback
			+ 1											// unsubscribe.callback
		);

		function unsub() {
			// Unsubscribe
			pubnub.unsubscribe({
				channel: 'test-channel',
				callback: function(data) {
					log("unsubscribe::callback: "+JSON.stringify(data));
					test.equal(data.action, "leave", 'unsubscribe callback got unexpected value: '+data.action);
				}
			});

			// Publish a few more messages; the subscribe callbacks shouldn't get called
			for (var i=0; i<numExtraPublishes; i++)
				pubnub.publish(publishOpts);

			// Wait a while to check that we don't get any subscribe callbacks, then complete
			console.log('... waiting 5 seconds ...')
			setTimeout(function() { test.done(); }, 5000);
		};

		// Subscribe to test channel
		var subscribeOpts = {
			channel: 'test-channel',
			message: function(data) { test.ok(false, '"message" callback should not be called if "callback" callback is also specified'); },
			callback: function(data) {
				log("subscribe::callback: "+JSON.stringify(data));
				test.deepEqual(testMessage, data, 'message data not equal to testMessage');
				if (++numReceipts == numPublishes)	// If we've got enough messages, unsubscribe
					unsub();
			},
			connect: function(data) {
				log("subscribe::connect: "+JSON.stringify(data));
				test.equal(data, 'test-channel');
			},
			error: function(data) { test.ok(false, '"error" callback of subscribe method should not be called'); },
			disconnect: function(data) { test.ok(false, '"disconnect" callback should not be called'); },
			reconnect: function(data) { test.ok(false, '"reconnect" callback should not be called'); },
			presence: function(data) { }
		};
		pubnub.subscribe(subscribeOpts);

		// Publish a few messages
		var publishOpts = {
			channel: 'test-channel',
			callback: function(data) {
				log("publish::callback: "+JSON.stringify(data));
				test.ok(data != null, 'Publish callback parameter is null');
				data && test.equal(data.length, 3, 'Length of publish callback data incorrect');
				data && test.equal(data[0], 1, 'Success field of publish callback data incorrect');
				data && test.equal(data[1], "Sent", 'Detail field of publish callback data incorrect');
				data && test.ok(Number(data[2]) != null, 'Timestamp field of publish callback cannot be parsed as a number');
			},
			error: function(data) { test.ok(false, '"error" callback of publish method should not be called'); },
			message: testMessage
		};
		for (var i=0; i<numPublishes; i++)
			pubnub.publish(publishOpts);

		// Note: After these messages have been received, the above "unsub" function will unsubscribe,
		// publish some more messages, wait a while to check that we don't get subscribe callbacks for
		// them and then call test.done()
	}

	/*
	 * Function used by messageTest2a, messageTest2b, messageTest2c, messageTest2d
	 */
	function _messageTest2(test, sub_as_string, unsub_as_string) {
		var testMessage = { obj : "foo", bar : 1 };
		var channels = {c1:false, c2:false, c3:false};
		var numReceipts = 0, numUnsubscribes = 0, numChannels = Object.keys(channels).length, numSent = 0;

		// Calculate number of expected assertions
		test.expect(
			numChannels+1							// subscribe.connect
			+ numChannels							// subscribe.callback
			+ (numChannels * 5)						// publish.callback
			+ numChannels							// unsubscribe.callback
		);

		function checkFinished() {
			if ((numUnsubscribes == numChannels) && (numSent == numChannels))
				test.done();
		}

		function unsub() {
			// Unsubscribe
			log("Unsubscribing");
			pubnub.unsubscribe({
				channel: unsub_as_string ? Object.keys(channels).join(',') : Object.keys(channels),
				callback: function(data) {
					log("unsubscribe::callback: "+JSON.stringify(data));
					test.ok(data.action, "leave", 'unsubscribe callback got unexpected value: '+data.action);
					++numUnsubscribes;
					checkFinished();
				}
			});
		};

		// Subscribe to test channels
		var subscribeOpts = {
			channel: sub_as_string ? Object.keys(channels).join(',') : Object.keys(channels),
			callback: function(data) {
				log("subscribe::callback: "+JSON.stringify(data));
				test.deepEqual(testMessage, data, 'message data not equal to testMessage');
				if (++numReceipts == numChannels) // If we've got enough messages, unsubscribe
					unsub();
			},
			connect: function(data) {
				log("subscribe::connect: "+JSON.stringify(data));
				// Update state of channels object
				var allSet = true
				for (var c in channels) {
					if (c == data) {
						test.ok(true, 'Subscribed channel is in list');
						channels[c] = true
					}
					if (!channels[c])
						allSet = false;
				}

				// Check if we've received the subscribe notifications for all of the channels that we asked to subscribe to
				if (allSet)
					test.ok(true, 'Subscribed to all channels');
			}
		};
		pubnub.subscribe(subscribeOpts);

		// Publish a message to each channel
		var publishOpts = {
			callback: function(data) {
				log("publish::callback: "+JSON.stringify(data));
				test.ok(data != null, 'Publish callback parameter is null');
				data && test.equal(data.length, 3, 'Length of publish callback data incorrect');
				data && test.equal(data[0], 1, 'Success field of publish callback data incorrect');
				data && test.equal(data[1], "Sent", 'Detail field of publish callback data incorrect');
				data && test.ok(Number(data[2]) != null, 'Timestamp field of publish callback cannot be parsed as a number');
				++numSent;
				checkFinished();
			},
			error: function(data) { test.ok(false, '"error" callback of publish method should not be called'); },
			message: testMessage
		};
		for (var c in channels) {
			publishOpts.channel = c;
			pubnub.publish(publishOpts);
		}

		// Note: After these messages have been received, the above "unsub" function will unsubscribe
		// and then call test.done()
	}

	/*
	 * Simple message tests subscribing to/unsubscribing from multiple channels at once (as an array,
	 *   as a comma-separated string, or a combination of the two)
	 */
	rExports.messageTest2a = function(test) { _messageTest2(test, false, false); }
	rExports.messageTest2b = function(test) { _messageTest2(test, true, true); }
	rExports.messageTest2c = function(test) { _messageTest2(test, false, true); }
	rExports.messageTest2d = function(test) { _messageTest2(test, true, false); }

	/*
	 * Similar to messageTest1 (a bit simplified), but passing callback functions as separate
	 * parameters instead of as a field in the options object.
	 */
	rExports.messageTest3 = function(test) {
		var testMessage = { obj : "value", obj2 : "other value" };
		var numPublishes = 4, numReceipts = 0, numUnsubscribes = 0, numSent = 0;

		// Calculate number of expected assertions
		test.expect(
			1											// subscribe.connect
			+ numPublishes								// subscribe.callback
			+ (numPublishes * 5)						// publish.callback
			+ 1											// unsubscribe.callback
		);

		function checkFinished() {
			if ((numUnsubscribes == 1) && (numSent == numPublishes))
				test.done();
		}

		function unsub() {
			// Unsubscribe
			pubnub.unsubscribe({ channel: 'test-channel' }, function(data) {
				log("unsubscribe::callback: "+JSON.stringify(data));
				test.equal(data.action, "leave", 'unsubscribe callback got unexpected value: '+data.action);
				numUnsubscribes++;
				checkFinished();
			});
		};

		// Subscribe to test channel
		var subscribeOpts = {
			channel: 'test-channel',
			message: function(data) { test.ok(false, '"message" callback should not be called if "callback" callback is also specified'); },
			connect: function(data) {
				log("subscribe::connect: "+JSON.stringify(data));
				test.equal(data, 'test-channel');
			},
			error: function(data) { test.ok(false, '"error" callback of subscribe method should not be called'); },
			disconnect: function(data) { test.ok(false, '"disconnect" callback should not be called'); },
			reconnect: function(data) { test.ok(false, '"reconnect" callback should not be called'); },
			presence: function(data) { }
		};
		pubnub.subscribe(subscribeOpts, function(data) {
			log("subscribe::callback: "+JSON.stringify(data));
			test.deepEqual(testMessage, data, 'message data not equal to testMessage');
			if (++numReceipts == numPublishes)	// If we've got enough messages, unsubscribe
				unsub();
		});

		// Publish a few messages
		var publishOpts = {
			channel: 'test-channel',
			error: function(data) { test.ok(false, '"error" callback of publish method should not be called'); },
			message: testMessage
		};
		for (var i=0; i<numPublishes; i++)
			pubnub.publish(publishOpts, function(data) {
				log("publish::callback: "+JSON.stringify(data));
				test.ok(data != null, 'Publish callback parameter is null');
				data && test.equal(data.length, 3, 'Length of publish callback data incorrect');
				data && test.equal(data[0], 1, 'Success field of publish callback data incorrect');
				data && test.equal(data[1], "Sent", 'Detail field of publish callback data incorrect');
				data && test.ok(Number(data[2]) != null, 'Timestamp field of publish callback cannot be parsed as a number');
				numSent++;
				checkFinished();
			});

		// Note: After these messages have been received, the above "unsub" function will unsubscribe
		// and call test.done()
	}

	/*
	 * Similar to messageTest3, but passing 'message' callback function instead of
	 * 'callback'. Should behave the same.
	 */
	rExports.messageTest4 = function(test) {
		var testMessage = { obj : "value", obj2 : "other value" };
		var numPublishes = 4, numReceipts = 0, numUnsubscribes = 0, numSent = 0;

		// Calculate number of expected assertions
		test.expect(
			1											// subscribe.connect
			+ numPublishes								// subscribe.callback
			+ (numPublishes * 5)						// publish.callback
			+ 1											// unsubscribe.callback
		);

		function checkFinished() {
			if ((numUnsubscribes == 1) && (numSent == numPublishes))
				test.done();
		}

		function unsub() {
			// Unsubscribe
			pubnub.unsubscribe({ channel: 'test-channel' }, function(data) {
				log("unsubscribe::callback: "+JSON.stringify(data));
				test.equal(data.action, "leave", 'unsubscribe callback got unexpected value: '+data.action);
				numUnsubscribes++;
				checkFinished();
			});
		};

		// Subscribe to test channel
		var subscribeOpts = {
			channel: 'test-channel',
			message: function(data) {
				log("subscribe::message: "+JSON.stringify(data));
				test.deepEqual(testMessage, data, 'message data not equal to testMessage');
				if (++numReceipts == numPublishes)	// If we've got enough messages, unsubscribe
					unsub();
			},
			connect: function(data) {
				log("subscribe::connect: "+JSON.stringify(data));
				test.equal(data, 'test-channel');
			},
			error: function(data) { test.ok(false, '"error" callback of subscribe method should not be called'); },
			disconnect: function(data) { test.ok(false, '"disconnect" callback should not be called'); },
			reconnect: function(data) { test.ok(false, '"reconnect" callback should not be called'); },
			presence: function(data) { }
		};
		pubnub.subscribe(subscribeOpts);

		// Publish a few messages
		var publishOpts = {
			channel: 'test-channel',
			error: function(data) { test.ok(false, '"error" callback of publish method should not be called'); },
			message: testMessage
		};
		for (var i=0; i<numPublishes; i++)
			pubnub.publish(publishOpts, function(data) {
				log("publish::callback: "+JSON.stringify(data));
				test.ok(data != null, 'Publish callback parameter is null');
				data && test.equal(data.length, 3, 'Length of publish callback data incorrect');
				data && test.equal(data[0], 1, 'Success field of publish callback data incorrect');
				data && test.equal(data[1], "Sent", 'Detail field of publish callback data incorrect');
				data && test.ok(Number(data[2]) != null, 'Timestamp field of publish callback cannot be parsed as a number');
				numSent++;
				checkFinished();
			});

		// Note: After these messages have been received, the above "unsub" function will unsubscribe
		// and call test.done()
	}

	// !!TODO!! Simulate error callback
	// !!TODO!! Simulate disconnect, reconnect events

	/* Clear down underlying accounts, etc, if they were set up locally */
	rExports.cleardown = base.clearTest;

	return rExports;
};
