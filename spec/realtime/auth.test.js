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

      var authPath = "http://echo.ably.io/?type=json&body=" + encodeURIComponent(JSON.stringify(tokenDetails));

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

      var authPath = "http://echo.ably.io/?type=text&body=" + tokenDetails['token'];

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

  /*
   * Use authCallback for authentication with tokenRequest response
   */
  exports.auth_useAuthCallback_tokenRequestResponse = function(test) {
    test.expect(3);

    var rest = helper.AblyRest();
    var authCallback = function(tokenParams, callback) {
      rest.auth.createTokenRequest(null, tokenParams, function(err, tokenRequest) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        test.ok("nonce" in tokenRequest);
        callback(null, tokenRequest);
      });
    };

    realtime = helper.AblyRealtime({ authCallback: authCallback });

    realtime.connection.on('connected', function() {
      realtime.connection.close();
      test.equal(realtime.auth.method, 'token');
      test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
      test.done();
      return;
    });

    realtime.connection.on('failed', function(err) {
      realtime.close();
      test.ok(false, "Failed: " + err);
      test.done();
      return;
    });
  };

  /*
   * Use authCallback for authentication with tokenDetails response
   */
  exports.auth_useAuthCallback_tokenDetailsResponse = function(test) {
    test.expect(3);

    var rest = helper.AblyRest();
    var authCallback = function(tokenParams, callback) {
      rest.auth.requestToken(null, tokenParams, function(err, tokenDetails) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        test.ok("token" in tokenDetails);
        callback(null, tokenDetails);
      });
    };

    realtime = helper.AblyRealtime({ authCallback: authCallback });

    realtime.connection.on('connected', function() {
      realtime.connection.close();
      test.equal(realtime.auth.method, 'token');
      test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
      test.done();
      return;
    });

    realtime.connection.on('failed', function(err) {
      realtime.close();
      test.ok(false, "Failed: " + err);
      test.done();
      return;
    });
  };

  /*
   * Use authCallback for authentication with token string response
   */
  exports.auth_useAuthCallback_tokenStringResponse = function(test) {
    test.expect(3);

    var rest = helper.AblyRest();
    var authCallback = function(tokenParams, callback) {
      rest.auth.requestToken(null, tokenParams, function(err, tokenDetails) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        test.ok("token" in tokenDetails);
        callback(null, tokenDetails.token);
      });
    };

    realtime = helper.AblyRealtime({ authCallback: authCallback });

    realtime.connection.on('connected', function() {
      realtime.connection.close();
      test.equal(realtime.auth.method, 'token');
      test.ok(true, 'Connected to Ably using authCallback returning a TokenRequest');
      test.done();
      return;
    });

    realtime.connection.on('failed', function(err) {
      realtime.close();
      test.ok(false, "Failed: " + err);
      test.done();
      return;
    });
  };

  exports.teardown = function(test) {
    realtime.close();
    test.done();
  };

  return module.exports = helper.withTimeout(exports);
});
