"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		utils = helper.Utils;

	exports.setupConnectivity = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				test.ok(true, 'app set up');
			}
			test.done();
		});
	};

	/*
	 * Connect with available http transports; internet connectivity check should work
	 */
	exports.http_connectivity_check = function(test) {
		test.expect(1);
		Ably.Realtime.Http.checkConnectivity(function(err, res) {
			test.ok(res && !err, 'Connectivity check completed ' + (err && utils.inspectError(err)));
			test.done();
		})
	};

	return module.exports = helper.withTimeout(exports);
});
