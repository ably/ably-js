"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('rest/time', function (expect, counter) {
		var rest, exports = {},
			utils = helper.Utils;

		it('setuptime', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				rest = helper.AblyRest();
				expect(true, 'app set up');
				counter.assert();
				done();
			});
		});

		it('time0', function(done) {
			counter.expect(1);
			rest.time(function(err, serverTime) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				var localFiveMinutesAgo = utils.now() - 5 * 60 * 1000;
				expect(serverTime > localFiveMinutesAgo, 'Verify returned time matches current local time with 5 minute leeway for badly synced local clocks');
				counter.assert();
				done();
			});
		});

		it('timePromise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			counter.expect(1);
			var rest = helper.AblyRest({promises: true});
			rest.time().then(function() {
				expect(true, 'time succeeded');
				counter.assert();
				done();
			})['catch'](function(err) {
				expect(false, 'time call failed with error: ' + displayError(err));
				done();
			});
		});
	});
});
