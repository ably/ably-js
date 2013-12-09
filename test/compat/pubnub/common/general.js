var containsValue = base.containsValue;
var displayError = base.displayError;
var pubnub;
var enable_logging = false;
function log(str) { enable_logging && console.log(str); }

/* Setup underlying accounts, etc, if they aren't already set up */
exports.localsetup = base.setupTest;
exports.getPubnub = function(test) { pubnub = base.getPubnub(); test.done(); }

/*
 * Test time function
 */
exports.time = function(test) {
	test.expect(2);
	pubnub.time(function(data) {
		log('time::callback: '+data);
		var t = Number(data);
		test.ok(t != null, 'Time callback response cannot be parsed as a number');
		test.ok(t > 100000000, 'Time callback value '+ t + ' is too small');
		test.done();
	});
}

/*
 * Test uuid function
 */
exports.uuid = function(test) {
	test.expect(4);
	var u1 = pubnub.uuid(function(data) {
		log('Got uuid: ' +data);
		test.ok(data.length > 10, 'Randomly generated uuid is too short');
	});
	log('Got uuid: ' +u1);
	test.ok(u1.length > 10, 'Randomly generated uuid is too short');
	var u2 = pubnub.uuid();
	log('Got uuid: ' +u2);
	test.ok(u2.length > 10, 'Randomly generated uuid is too short');
	test.ok(u1 != u2, 'Randomly generated uuids should not be the same');
	test.done();
}

/* Because the time test on its own doesn't interact with the realtime connection,
 * it can complete before the authentication has completed (if using token
 * authentication), and the shutdown process doesn't seem completely robust -
 * there seem to be some dangling operations pending which cause nodeunit to
 * never exit if we just drop straight through to shutting down the Ably
 * realtime connection.
 *
 * Wait for the connection to come up fully before shutting it down...
 *
 * !!TODO!! Look into why this is happening - it shouldn't be necessary
 */
exports.waitConnection = function(test) {
	if (pubnub.ably.connection.state == 'connected') {
		test.done();
	} else {
		pubnub.ably.connection.on('connected', function(s) { test.done(); });
		pubnub.ably.connection.on('disconnected', function(s) {
			test.ok(false, 'Connection has not reached connected state');
			test.done();
		});
	}
}

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
