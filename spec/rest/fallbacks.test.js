"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		utils = helper.Utils,
		goodHost;

	exports.setupfallbacks = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			goodHost = helper.AblyRest().options.restHost;
			test.ok(true, 'app set up');
			test.done();
		});
	};

	/* RSC15f */
	exports.store_working_fallback = function(test) {
		test.expect(9);
		var rest = helper.AblyRest({
			restHost: helper.unroutableHost,
			fallbackHosts: [goodHost],
			httpRequestTimeout: 3000,
			log: {level: 4}
		});
		var validUntil;
		async.series([
			function(cb) {
				rest.time(function(err, serverTime) {
					if(err) { return cb(err); }
					test.ok(serverTime, 'Check serverTime returned');
					var currentFallback = rest._currentFallback;
					test.ok(currentFallback, 'Check current fallback stored');
					test.equal(currentFallback && currentFallback.host, goodHost, 'Check good host set');
					validUntil = currentFallback.validUntil;
					cb();
				});
			},
			/* now try again, check that this time it uses the remembered good endpoint straight away */
			function(cb) {
				rest.time(function(err, serverTime) {
					if(err) { return cb(err); }
					test.ok(serverTime, 'Check serverTime returned');
					var currentFallback = rest._currentFallback;
					test.equal(currentFallback.validUntil, validUntil, 'Check validUntil is the same (implying currentFallback has not been re-set)');
					cb();
				});
			},
			/* set the validUntil to the past and check that the stored fallback is forgotten */
			function(cb) {
				var now = utils.now();
				rest._currentFallback.validUntil = now - 1000;
				rest.time(function(err, serverTime) {
					if(err) { return cb(err); }
					test.ok(serverTime, 'Check serverTime returned');
					var currentFallback = rest._currentFallback;
					test.ok(currentFallback, 'Check current fallback re-stored');
					test.equal(currentFallback && currentFallback.host, goodHost, 'Check good host set again');
					test.ok(currentFallback.validUntil > now, 'Check validUntil has been re-set');
					cb();
				});
			},
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			test.done();
		})
	};

	return module.exports = helper.withTimeout(exports);
});

