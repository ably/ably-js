var containsValue = base.containsValue;
var displayError = base.displayError;
var pubnub;
var enable_logging = false;
function log(str) { enable_logging && console.log(str); }

/* Setup underlying accounts, etc, if they aren't already set up */
exports.localsetup = base.setupTestSecure;
exports.getPubnub = function(test) { pubnub = base.getPubnub(); test.done(); }

/*
 * Test history
 */
exports.history1 = function(test) {
	var channel = 'persisted:history1-' + base.randomid(8);
	var histCallbacks = 0, expectedCallbacks = 5;
	test.expect(expectedCallbacks * 2);

	// Subscribe to test channel (just for debugging)
	pubnub.subscribe({
		channel: channel,
		callback: function(data) { log("subscribe::callback: "+JSON.stringify(data)); }
	});

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
			error : function(data) { test.ok(false, 'history1 test callback should not be called'); }
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
			error : function(data) { test.ok(false, 'history1 test callback should not be called'); },
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
			error : function(data) { test.ok(false, 'history1 test callback should not be called'); }
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
			error : function(data) { test.ok(false, 'history1 test callback should not be called'); },
			reverse : true
		});

		// Test with callback specified as separate parameter
		pubnub.history({
			channel : channel,
			error : function(data) { test.ok(false, 'history1 test callback should not be called'); }
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
exports.historyTimes = function(test) {
	var channel = 'persisted:history2-' + base.randomid(8);
	var histCallbacks = 0;
	test.expect(4);

	function checkFinished() {
		if (++histCallbacks == 2)
			test.done();
	}

	// Publish some messages that we don't want to see in the history
	pubnub.publish({ channel : channel, message : '1' });
	pubnub.publish({ channel : channel, message : '2' });

	// Wait a while so that the timestamp changes
	setTimeout(function() {
		// Get the start time that we're interested in
		pubnub.time(function(startTime) {
			// Publish some more messages that we do want to see in the history
			pubnub.publish({ channel : channel, message : '3' });
			pubnub.publish({ channel : channel, message : '4' });
			pubnub.publish({ channel : channel, message : '5' });

			// Wait a while to allow the timestamp to change
			setTimeout(function() {
				// Get the end time that we're interested in
				pubnub.time(function(endTime) {
					// Wait a while to allow the timestamp to change
					setTimeout(function() {
						// Publish some more messages that we don't want to see in the history
						pubnub.publish({ channel : channel, message : '6' });
						pubnub.publish({ channel : channel, message : '7' });
					
						// Wait 15 seconds to ensure that they get written out to persistent storage
						console.log('... waiting 15 seconds ...')
						setTimeout(function() {
							// Forward
							pubnub.history({
								channel : channel, start: startTime, end: endTime,
								callback : function(data) {
									log('history::callback: '+JSON.stringify(data));
									test.deepEqual(data[0], ['3', '4', '5'], 'historyTimes result callback value is incorrect');
									test.equal(data.length, 3, 'historyTimes result callback parameter should be a 3 element array');
									checkFinished();
								},
								error : function(data) { test.ok(false, 'historyTimes test callback should not be called'); }
							});
							
							// Reverse
							pubnub.history({
								channel : channel, start: startTime, end: endTime,
								callback : function(data) {
									log('history::callback: '+JSON.stringify(data));
									test.deepEqual(data[0], ['5', '4', '3'], 'historyTimes result callback value is incorrect');
									test.equal(data.length, 3, 'historyTimes result callback parameter should be a 3 element array');
									checkFinished();
								},
								error : function(data) { test.ok(false, 'historyTimes test callback should not be called'); },
								reverse : true
							});
						}, 15000);
					}, 500);
				});
			}, 500);
		});
	}, 500);
}

// !!TODO!! Test sending of double values as messages in encrypted mode

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
