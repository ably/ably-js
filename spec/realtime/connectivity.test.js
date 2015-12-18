"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		// Ably.Realtime.ConnectionManager not defined in node
		availableHttpTransports = typeof Ably.Realtime.ConnectionManager === 'undefined' ? Ably.Realtime.Defaults.httpTransports : Object.keys(Ably.Realtime.ConnectionManager.httpTransports);


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
			var connectivity_test = function(transports) {
				return function(cb) {
					var realtime = helper.AblyRealtime({transports: transports});
					/* Not strictly necessary to connect before doing connectivity check,
					* but it's a simple way to get a reference to the transport */
					realtime.connection.on('connected', function() {
						//console.log("Transport " + transports + " connected, trying connectivity check");
						var transport = realtime.connection.connectionManager.activeProtocol.transport.constructor;
						transport.checkConnectivity(function(err, res) {
							//console.log("Transport " + transports + " connectivity check returned ", err, res)
							if(err)
								cb(err, realtime);
							test.ok(res, 'Connectivity check for ' + transports);
							cb(null, realtime);
						})
					});
					monitorConnection(test, realtime);
				};
			};
			async.parallel(
				availableHttpTransports.map(function(transport) {
					return connectivity_test([transport]);
				}),
				function(err, realtimes) {
					if(err) {
						console.log("errrrr", err)
						test.ok(false, helper.displayError(err));
					}
					closeAndFinish(test, realtimes);
				}
			);
		} catch(e) {
			test.ok(false, 'connection failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	return module.exports = helper.withTimeout(exports);
});
