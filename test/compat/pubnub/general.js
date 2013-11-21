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

// !!TODO!! Test case where callback is passed as a separate parameter rather than as a property of the options object (all functions that can take a 'callback' option in their options)

// !!TODO!! Test presence

// !!TODO!! Simulate error callback
// !!TODO!! Simulate disconnect, reconnect events
// !!TODO!! Simulate disconnect, reconnect events

/* Clear down underlying accounts, etc, if they were set up locally */
exports.cleardown = base.clearTest;
