"use strict";

define(['shared_helper'], function(helper) {
	helper.withMocha('tear_down', {
		teardownapp: function(test) {
			helper.tearDownApp(function(err) {
				if (err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				test.ok(true, 'app torn down');
				test.done();
			});
		}
	});
});