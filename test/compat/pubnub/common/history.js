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
	 * Test history
	 */
	rExports.history1 = function(test) {
		var channel = 'persisted:history1-' + base.randomid(8);
		var histCallbacks = 0, expectedCallbacks = 5;
		test.expect(expectedCallbacks * 2);

		// Publish some messages that we can then check for
		pubnub.publish({ channel : channel, message : 1 });
		pubnub.publish({ channel : channel, message : 2 });
		pubnub.publish({ channel : channel, message : 3 });
		pubnub.publish({ channel : channel, message : 4 });
		pubnub.publish({ channel : channel, message : 5 });

		function checkFinished() {
			if (++histCallbacks == expectedCallbacks)
				test.done();
		}

		// Wait 15 seconds for the messages to get into persistent storage, then attempt to retrieve them
		console.log('... waiting 15 seconds ...')
		setTimeout(function() {
			// Test normally
			pubnub.history({
				channel : channel,
				callback : function(data) {
					log('history::callback: '+JSON.stringify(data));
					test.deepEqual(data[0], [1, 2, 3, 4, 5], 'history1 result callback value is incorrect');
					test.equal(data.length, 3, 'history1 result callback parameter should be a 3 element array');
					checkFinished();
				},
				error : function(data) { log('history::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); }
			});

			// Test in reverse
			pubnub.history({
				channel : channel,
				callback : function(data) {
					log('history::callback: '+JSON.stringify(data));
					test.deepEqual(data[0], [5, 4, 3, 2, 1], 'history1 result callback value is incorrect');
					test.equal(data.length, 3, 'history1 result callback parameter should be a 3 element array');
					checkFinished();
				},
				error : function(data) { log('history::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); },
				reverse : true
			});

			// Test with limited count
			pubnub.history({
				channel : channel,
				callback : function(data) {
					log('history::callback: '+JSON.stringify(data));
					test.deepEqual(data[0], [1, 2, 3], 'history1 result callback value is incorrect');
					test.equal(data.length, 3, 'history1 result callback parameter should be a 3 element array');
					checkFinished();
				},
				count : 3,
				error : function(data) { log('history::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); }
			});

			// Test with limited count in reverse
			pubnub.history({
				channel : channel,
				callback : function(data) {
					log('history::callback: '+JSON.stringify(data));
					test.deepEqual(data[0], [5, 4, 3], 'history1 result callback value is incorrect');
					test.equal(data.length, 3, 'history1 result callback parameter should be a 3 element array');
					checkFinished();
				},
				count : 3,
				error : function(data) { log('history::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); },
				reverse : true
			});

			// Test with callback specified as separate parameter
			pubnub.history({
				channel : channel,
				error : function(data) { log('history::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); }
			}, function(data) {
				log('history::callback: '+JSON.stringify(data));
				test.deepEqual(data[0], [1, 2, 3, 4, 5], 'history1 result callback value is incorrect');
				test.equal(data.length, 3, 'history1 result callback parameter should be a 3 element array');
				checkFinished();
			});
		}, 15000);

	}

	/*
	 * Test history with start/end times
	 */
	rExports.historyTimes = function(test) {
		var channel = 'persisted:history2-' + base.randomid(8);
		var histCallbacks = 0;
		test.expect(4);

		function checkFinished() {
			if (++histCallbacks == 2)
				test.done();
		}

		// Publish some messages that we don't want to see in the history
		pubnub.publish({ channel : channel, message : 1 });
		pubnub.publish({ channel : channel, message : 2 });

		// Wait a while so that the timestamp changes
		setTimeout(function() {
			// Get the start time that we're interested in
			pubnub.time(function(startTime) {
				// Publish some more messages that we do want to see in the history
				pubnub.publish({ channel : channel, message : 3 });
				pubnub.publish({ channel : channel, message : 4 });
				pubnub.publish({ channel : channel, message : 5 });

				// Wait a while to allow the timestamp to change
				setTimeout(function() {
					// Get the end time that we're interested in
					pubnub.time(function(endTime) {
						// Wait a while to allow the timestamp to change
						setTimeout(function() {
							// Publish some more messages that we don't want to see in the history
							pubnub.publish({ channel : channel, message : 6 });
							pubnub.publish({ channel : channel, message : 7 });

							// Wait 15 seconds to ensure that they get written out to persistent storage
							console.log('... waiting 15 seconds ...')
							setTimeout(function() {
								// Forward
								pubnub.history({
									channel : channel, start: startTime, end: endTime,
									callback : function(data) {
										log('history::callback: '+JSON.stringify(data));
										test.deepEqual(data[0], [3, 4, 5], 'historyTimes result callback value is incorrect');
										test.equal(data.length, 3, 'historyTimes result callback parameter should be a 3 element array');
										checkFinished();
									},
									error : function(data) { log('historyTimes::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); }
								});

								// Reverse
								pubnub.history({
									channel : channel, start: startTime, end: endTime,
									callback : function(data) {
										log('history::callback: '+JSON.stringify(data));
										test.deepEqual(data[0], [5, 4, 3], 'historyTimes result callback value is incorrect');
										test.equal(data.length, 3, 'historyTimes result callback parameter should be a 3 element array');
										checkFinished();
									},
									error : function(data) { log('historyTimes::error: '+data); test.ok(false, 'history1 error callback should not be called'); checkFinished(); },
									reverse : true
								});
							}, 15000);
						}, 500);
					});
				}, 500);
			});
		}, 500);
	}

	/* Clear down underlying accounts, etc, if they were set up locally */
	rExports.cleardown = base.clearTest;

	return rExports;
};
