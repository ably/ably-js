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
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(5);
      test.ok((tokenDetails.token), 'Verify token value');
      test.ok((tokenDetails.issued && tokenDetails.issued >= currentTime), 'Verify token issued');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued), 'Verify token expires');
      test.equal(tokenDetails.expires, 60*60*1000 + tokenDetails.issued, 'Verify default expiry period');
      test.deepEqual(JSON.parse(tokenDetails.capability), {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Use authUrl for authentication with JSON TokenDetails response
   */
  exports.auth_useAuthUrl_json = function(test) {
    test.expect(1);

    var rest = helper.AblyRest();
    rest.auth.requestToken(null, null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }

      var authPath = ["http://echo.jsontest.com/"];
      for (var key in tokenDetails) {
        if (tokenDetails.hasOwnProperty(key)) {
          authPath.push(key);
          authPath.push(tokenDetails[key]);
        }
      }

      realtime = helper.AblyRealtime({ authUrl: authPath.join("/") });

      realtime.connection.on('connected', function() {
        realtime.connection.off();
        realtime.connection.close();
        test.ok(true, 'Connected to Ably using authUrl with TokenDetails JSON payload');
        test.done();
        return;
      });

      realtime.connection.on('failed', function(err) {
        realtime.close();
        test.ok(false, "Failed: " + err);
        test.done();
        return;
      });
    });
  };

  /*
   * Use authUrl for authentication with plain text token response
   */
  exports.auth_useAuthUrl_plainText = function(test) {
    test.expect(1);

    var rest = helper.AblyRest();
    rest.auth.requestToken(null, null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }

      var authPath = "http://urlecho.appspot.com/echo?status=200&Content-Type=text%2Fplain&body=" + tokenDetails['token'];

      realtime = helper.AblyRealtime({ authUrl: authPath });

      realtime.connection.on('connected', function() {
        realtime.connection.off();
        realtime.connection.close();
        test.ok(true, 'Connected to Ably using authUrl with TokenDetails JSON payload');
        test.done();
        return;
      });

      realtime.connection.on('failed', function(err) {
        realtime.close();
        test.ok(false, "Failed: " + err);
        test.done();
        return;
      });
    });
  };

  exports.teardown = function(test) {
    realtime.close();
    test.done();
  };

  return module.exports = helper.withTimeout(exports);
});
