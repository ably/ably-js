"use strict";

define(['shared_helper'], function(helper) {
	helper.describeWithCounter('tearDown', function (expect) {
		it('teardownapp', function(done) {
			helper.tearDownApp(function(err) {
				if (err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}
				expect(true, 'app torn down');
				done();
			});
		})
	});
});
