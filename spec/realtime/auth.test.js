"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var realtime, currentTime, exports = {};

  exports.setupauth = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }

      var rest = helper.AblyRest();
      rest.time(function(err, time) {
        if(err) {
          test.ok(false, helper.displayError(err));
        } else {
          currentTime = time;
          test.ok(true, 'Obtained time via REST');
        }
        test.done();
      });
    });
  };

  /*
   * Base token generation case
   */
  exports.authbase0 = function(test) {
    test.expect(1);
    realtime = helper.AblyRealtime();
    realtime.auth.requestToken(function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.expect(5);
      test.ok((tokenDetails.token), 'Verify token value');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.equal(tokenDetails.expires, 60*60*1000 + tokenDetails.issued_at, 'Verify default expiry period');
      test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  exports.teardown = function(test) {
    realtime.close();
    test.done();
  };

  return module.exports = helper.withTimeout(exports);
});
