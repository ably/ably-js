"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var currentTime, rest, exports = {};

  exports.setuptime = function(test) {
    test.expect(1);
    helper.setupApp(function() {
      rest = helper.AblyRest();
      test.ok(true, 'app set up');
      test.done()
    });
  };

  exports.time0 = function(test) {
    test.expect(1);
    rest.time(function(err, time) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      var expectedTime = Date.now();
      test.ok((Math.abs(time - expectedTime) < 2000), 'Verify returned time matches current local time');
      test.done();
    });
  };

  return module.exports = exports;
});
