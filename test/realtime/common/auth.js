"use strict";

exports.setup = function(base) {
	var rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var _exports = {};
	var realtime, currentTime;

	rExports.setupauth = function(test) {
		test.expect(1);
		realtime = base.realtime({
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		realtime.time(function(err, time) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			currentTime = time;
			test.ok(true, 'Obtained time');
			test.done();
		});
	};

	/*
	 * Base token generation case
	 */
	rExports.authbase0 = function(test) {
		test.expect(1);
		realtime.auth.requestToken(function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.expect(5);
			test.ok((tokenDetails.id), 'Verify token id');
			test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= Math.floor(currentTime/1000)), 'Verify token issued_at');
			test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
			test.equal(tokenDetails.expires, 60*60 + tokenDetails.issued_at, 'Verify default expiry period');
			test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
			test.done();
		});
	};

	rExports.shutdownauth = function(test) {
		if(realtime)
			realtime.close();
		test.done();
	};

	return rExports;
};
