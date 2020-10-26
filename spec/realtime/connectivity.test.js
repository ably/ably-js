"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('realtime/connectivity', function (expect, counter) {
		var exports = {},
			closeAndFinish = helper.closeAndFinish,
			monitorConnection = helper.monitorConnection,
			utils = helper.Utils;

		it('setupConnectivity', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		/*
		* Connect with available http transports; internet connectivity check should work
		*/
		it('http_connectivity_check', function(done) {
			counter.expect(1);
			Ably.Realtime.Http.checkConnectivity(function(err, res) {
				expect(res && !err, 'Connectivity check completed ' + (err && utils.inspectError(err)));
				counter.assert();
				done();
			})
		});
	});
});
