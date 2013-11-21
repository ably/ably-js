"use strict";
var base = require('./common');
var containsValue = base.containsValue;
var displayError = base.displayError;
var pubnub;
var _exports = {};
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
	}
}

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
