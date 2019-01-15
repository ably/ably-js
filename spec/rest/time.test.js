"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var rest, exports = {},
		utils = helper.Utils;

	exports.setuptime = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			rest = helper.AblyRest();
			test.ok(true, 'app set up');
			test.done();
		});
	};

	exports.time0 = function(test) {
		test.expect(1);
		rest.time(function(err, serverTime) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			var localFiveMinutesAgo = utils.now() - 5 * 60 * 1000;
			test.ok(serverTime > localFiveMinutesAgo, 'Verify returned time matches current local time with 5 minute leeway for badly synced local clocks');
			test.done();
		});
	};

	exports.timePromise = function(test) {
		if(typeof Promise === 'undefined') {
			test.done();
			return;
		}
		test.expect(1);
		var rest = helper.AblyRest({promises: true});
		rest.time().then(function() {
			test.ok(true, 'time succeeded');
			test.done();
		})['catch'](function(err) {
			test.ok(false, 'time call failed with error: ' + displayError(err));
			test.done();
		});
	};

	return module.exports = helper.withTimeout(exports);
});
