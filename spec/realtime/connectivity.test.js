"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		utils = helper.Utils,
		// Ably.Realtime.ConnectionManager not defined in node
		availableHttpTransports = typeof Ably.Realtime.ConnectionManager === 'undefined' ? Ably.Realtime.Defaults.httpTransports : utils.keysArray(Ably.Realtime.ConnectionManager.httpTransports);


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
		test.expect(availableHttpTransports.length);
		try {
			var connectivity_test = function(transport) {
				return function(cb) {
					Ably.Realtime.ConnectionManager.httpTransports[transport].checkConnectivity(function(err, res) {
						console.log("Transport " + transport + " connectivity check returned ", err, res)
						test.ok(res, 'Connectivity check for ' + transport);
						cb(err);
					})
				};
			};
			async.parallel(
				utils.arrMap(availableHttpTransports, function(transport) {
					return connectivity_test(transport);
				}),
				function(err) {
					if(err) {
						test.ok(false, helper.displayError(err));
					}
					test.done();
				}
			);
		} catch(e) {
			test.ok(false, 'connection failed with exception: ' + e.stack);
			test.done();
		}
	};

	return module.exports = helper.withTimeout(exports);
});
