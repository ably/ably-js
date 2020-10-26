"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/fallbacks', function (expect, counter) {
		var exports = {},
			utils = helper.Utils,
			goodHost;

		it('setupfallbacks', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				goodHost = helper.AblyRest().options.restHost;
				expect(true, 'app set up');
				counter.assert();
				done();
			});
		});

		/* RSC15f */
		it('store_working_fallback', function(done) {
			counter.expect(9);
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
						expect(serverTime, 'Check serverTime returned');
						var currentFallback = rest._currentFallback;
						expect(currentFallback, 'Check current fallback stored');
						expect(currentFallback && currentFallback.host).to.equal(goodHost, 'Check good host set');
						validUntil = currentFallback.validUntil;
						cb();
					});
				},
				/* now try again, check that this time it uses the remembered good endpoint straight away */
				function(cb) {
					rest.time(function(err, serverTime) {
						if(err) { return cb(err); }
						expect(serverTime, 'Check serverTime returned');
						var currentFallback = rest._currentFallback;
						expect(currentFallback.validUntil).to.equal(validUntil, 'Check validUntil is the same (implying currentFallback has not been re-set)');
						cb();
					});
				},
				/* set the validUntil to the past and check that the stored fallback is forgotten */
				function(cb) {
					var now = utils.now();
					rest._currentFallback.validUntil = now - 1000;
					rest.time(function(err, serverTime) {
						if(err) { return cb(err); }
						expect(serverTime, 'Check serverTime returned');
						var currentFallback = rest._currentFallback;
						expect(currentFallback, 'Check current fallback re-stored');
						expect(currentFallback && currentFallback.host).to.equal(goodHost, 'Check good host set again');
						expect(currentFallback.validUntil > now, 'Check validUntil has been re-set');
						cb();
					});
				},
			], function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				}
				counter.assert();
				done();
			})
		});
	});
});
