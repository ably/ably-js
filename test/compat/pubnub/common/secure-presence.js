var containsValue = base.containsValue;
var displayError = base.displayError;
var pubnub;
var enable_logging = false;
function log(str) { enable_logging && console.log(str); }

/* Setup underlying accounts, etc, if they aren't already set up */
exports.localsetup = base.setupTestSecure;
exports.getPubnub = function(test) { pubnub = base.getPubnub(); test.done(); }

/*
 * Test here_now function
 */
exports.here_now = function(test) {
	// Subscribe to test channel
	var numPresenceEvents = 0;
	var channel = 'presencetest-'+base.randomid(6);
	var subscribeOpts = {
		channel: channel,
		callback: function(data) {
			log("subscribe::callback: "+JSON.stringify(data));
			test.ok(false, 'subscribe::callback should not be called in presence test')
		},
		presence: function(data) {
			log('subscribe::presence: Got presence event: '+JSON.stringify(data));
			test.ok(data.action != null,	'Presence callback data does not have action field');
			test.ok(data.occupancy != null,	'Presence callback data does not have occupancy field');
			test.ok(data.uuid != null,		'Presence callback data does not have uuid field');
			test.ok(data.timestamp != null,	'Presence callback data does not have timestamp field');
			numPresenceEvents++;
		}
	};
	pubnub.subscribe(subscribeOpts);

	// Wait a short while, then call here_now
	setTimeout(function() {
		pubnub.here_now({channel: channel}, function(data) {
			log('here_now: Got members: '+JSON.stringify(data));
			test.equals(data.occupancy, 1, 'Number of members in here_now result wrong');
			test.equals(data.uuids.length, data.occupancy, 'Number of items in here_now result does not match occupancy');
			pubnub.unsubscribe({channel: channel});
			test.ok(numPresenceEvents>0, 'No presence events have happened yet');
			test.done();
		});
	}, 1000);
}

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
