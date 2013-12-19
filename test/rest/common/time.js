"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;

	rExports.setuptime = function(test) {
		rest = base.rest({
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		test.done();
	};

	rExports.time0 = function(test) {
		test.expect(1);
		rest.time(function(err, time) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			var expectedTime = Date.now();
			test.ok((Math.abs(time - expectedTime) < 2000), 'Verify returned time matches current local time');
			test.done();
		});
	};

	return rExports;
};
