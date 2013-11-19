"use strict";
var base = require('./common');
var displayError = base.displayError;

var _exports = {};

exports.setup0 = function(test) {
	/* create a test account, application, and keys */
	test.expect(1);
	base.setupTest(function(err, testVars) {
		if(err) {
			test.ok(false, displayError(err));
			test.done();
			return;
		}
		test.ok(true, 'Created test vars');
		test.done();
	});
};

exports.pubnub = require('./pubnub');

exports.clear99 = function(test) {
	/* remove test account, application, and key */
	test.expect(1);
	base.clearTest(function(err) {
		if(err) {
			test.ok(false, displayError(err));
			test.done();
			return;
		}
		test.ok(true, 'Cleared test vars');
		test.done();
	});
};
