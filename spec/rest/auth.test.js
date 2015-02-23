"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var currentTime, rest, exports = {};

  var stripQualifier = function(qualifiedKeyId) {
    return qualifiedKeyId.split('.')[1];
  };

  exports.setupauth = function(test) {
    test.expect(1);
    helper.setupApp(function() {
      rest = helper.AblyRest();
      rest.time(function(err, time) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        currentTime = Math.floor(time/1000);
        test.ok(true, 'Obtained time');
        test.done();
      });
    });
  };

  /*
   * Base token generation case
   */
  exports.authbase0 = function(test) {
    test.expect(1);
    rest.auth.requestToken(function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(5);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.equal(tokenDetails.expires, 60*60 + tokenDetails.issued_at, 'Verify default expiry period');
      test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Base token generation with options
   */
  exports.authbase1 = function(test) {
    test.expect(1);
    rest.auth.requestToken(null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(4);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Generate token and init library with it
   */
  exports.authbase2 = function(test) {
    test.expect(1);
    rest.auth.requestToken(function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.ok((tokenDetails.id), 'Verify token id');
      try {
        var restInit = helper.AblyRest({ authToken: tokenDetails.id });
        test.done();
      } catch(e) {
        test.ok(false, helper.displayError(e));
        test.done();
      }
    });
  };

  /*
   * Token generation with explicit timestamp
   */
  exports.authtime0 = function(test) {
    test.expect(1);
    var localTime = Math.floor(Date.now()/1000);
    rest.auth.requestToken({timestamp:localTime}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(4);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Token generation with explicit timestamp (invalid)
   */
  exports.authtime1 = function(test) {
    test.expect(1);
    var badTime = Math.floor(Date.now()/1000) - 30*60;
    rest.auth.requestToken({timestamp:badTime}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 401, 'Verify token request rejected with bad timestamp');
        test.done();
        return;
      }
      test.ok(false, 'Invalid timestamp, expected rejection');
      test.done();
    });
  };

  /*
   * Token generation with system timestamp
   */
  exports.authtime2 = function(test) {
    test.expect(1);
    rest.auth.requestToken({queryTime:true}, null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(4);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Token generation with duplicate nonce
   */
  exports.authnonce0 = function(test) {
    test.expect(1);
    var localTime = Math.floor(Date.now()/1000);
    rest.auth.requestToken({timestamp:localTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      rest.auth.requestToken({timestamp:localTime, nonce:'1234567890123456'}, function(err, tokenDetails) {
        if(err) {
          test.equal(err.statusCode, 401, 'Verify request rejected with duplicated nonce');
          test.done();
          return;
        }
        test.ok(false, 'Invalid nonce, expected rejection');
        test.done();
      });
    });
  };

  /*
   * Token generation with clientId
   */
  exports.authclientid0 = function(test) {
    test.expect(1);
    var testClientId = 'test client id';
    rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(5);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.equal(tokenDetails.clientId, testClientId, 'Verify client id');
      test.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Token generation with capability that subsets key capability
   */
  exports.authcapability0 = function(test) {
    test.expect(1);
    var testCapability = {onlythischannel:['subscribe']};
    rest.auth.requestToken({capability:testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(4);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Token generation with specified key
   */
  exports.authkey0 = function(test) {
    test.expect(1);
    var key1Id = helper.getTestApp().appId + '.' + helper.getTestApp().key1Id;
    var testKeyOpts = { keyId: key1Id, keyValue: helper.getTestApp().key1Value };
    var testCapability = JSON.parse(helper.getTestApp().key1.capability);
    rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.expect(5);
      test.ok((tokenDetails.id), 'Verify token id');
      test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
      test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
      test.equal(stripQualifier(tokenDetails.key), helper.getTestApp().key1Id, 'Verify token key');
      test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Token generation with explicit auth
   */
  exports.authexplicit_simple = function(test) {
    test.expect(1);
    rest.auth.getAuthHeaders(function(err, authHeaders) {
      rest.auth.requestToken({requestHeaders: authHeaders}, null, function(err, tokenDetails) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        test.expect(4);
        test.ok((tokenDetails.id), 'Verify token id');
        test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
        test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
        test.equal(stripQualifier(tokenDetails.key), helper.getTestApp().key0Id, 'Verify token key');
        test.done();
      });
    });
  };

  /*
   * Token generation with explicit auth, different key
   */
  exports.authexplicit_key = function(test) {
    test.expect(1);
    rest.auth.getAuthHeaders(function(err, authHeaders) {
      var key1Id = helper.getTestApp().appId + '.' + helper.getTestApp().key1Id;
      var testKeyOpts = {keyId: key1Id, keyValue: helper.getTestApp().key1Value, requestHeaders: authHeaders};
      var testCapability = JSON.parse(helper.getTestApp().key1.capability);
      rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        test.expect(5);
        test.ok((tokenDetails.id), 'Verify token id');
        test.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
        test.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
        test.equal(stripQualifier(tokenDetails.key), helper.getTestApp().key1Id, 'Verify token key');
        test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
        test.done();
      });
    });
  };

  /*
   * Token generation with invalid mac
   */
  exports.authmac0 = function(test) {
    test.expect(1);
    rest.auth.requestToken({mac: '12345'}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 401, 'Verify request rejected with bad mac');
        test.done();
        return;
      }
      test.ok(false, 'Invalid mac, expected rejection');
      test.done();
    });
  };

  /*
   * Specify non-default ttl
   */
  exports.authttl0 = function(test) {
    test.expect(1);
    rest.auth.requestToken({ttl:100}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }
      test.equal(tokenDetails.expires, 100 + tokenDetails.issued_at, 'Verify non-default expiry period');
      test.done();
    });
  };

  /*
   * Excessive ttl
   */
  exports.authttl1 = function(test) {
    test.expect(1);
    rest.auth.requestToken({ttl: 365*24*60*60}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with excessive expiry');
        test.done();
        return;
      }
      test.ok(false, 'Excessive expiry, expected rejection');
      test.done();
    });
  };

  /*
   * Negative ttl
   */
  exports.authttl2 = function(test) {
    test.expect(1);
    rest.auth.requestToken({ttl: -1}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with negative expiry');
        test.done();
        return;
      }
      test.ok(false, 'Negative expiry, expected rejection');
      test.done();
    });
  };

  /*
   * Invalid ttl
   */
  exports.authttl3 = function(test) {
    test.expect(1);
    rest.auth.requestToken({ttl: 'notanumber'}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with invalid expiry');
        test.done();
        return;
      }
      test.ok(false, 'Invalid expiry, expected rejection');
      test.done();
    });
  };

  return module.exports = exports;
});
