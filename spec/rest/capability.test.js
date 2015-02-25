"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var currentTime, rest, testApp, exports = {};

  var invalid0 = {
      channel0:['publish_']
    };

  var invalid1 = {
      channel0:['*', 'publish']
    };

  var invalid2 = {
      channel0:[]
    };

  exports.setupcapability = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }

      rest = helper.AblyRest();
      testApp = helper.getTestApp();
      rest.time(function(err, time) {
        if(err) {
          test.ok(false, displayError(err));
          test.done();
          return;
        }
        currentTime = time;
        test.ok(true, 'Obtained time');
        test.done();
      });
    });
  };

  /*
   * Blanket intersection with specified key
   */
  exports.authcapability0 = function(test) {
    test.expect(1);
    var key1Id = testApp.appId + '.' + testApp.key1Id;
    var testKeyOpts = {keyId: key1Id, keyValue: testApp.key1.value};
    var testCapability = JSON.parse(testApp.key1.capability);
    rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Equal intersection with specified key
   */
  exports.authcapability1 = function(test) {
    test.expect(1);
    var key1Id = testApp.appId + '.' + testApp.key1Id;
    var testKeyOpts = {keyId: key1Id, keyValue: testApp.key1.value};
    var testCapability = JSON.parse(testApp.key1.capability);
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Empty ops intersection
   */
  exports.authcapability2 = function(test) {
    test.expect(1);
    var key1Id = testApp.appId + '.' + testApp.key1Id;
    var testKeyOpts = {keyId: key1Id, keyValue: testApp.key1.value};
    var testCapability = {testchannel:['subscribe']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 401, 'Verify request rejected with insufficient capability');
        test.done();
        return;
      }
      test.ok(false, 'Invalid capability, expected rejection');
      test.done();
    });
  };

  /*
   * Empty paths intersection
   */
  exports.authcapability3 = function(test) {
    test.expect(1);
    var key4Id = testApp.appId + '.' + testApp.key4Id;
    var testKeyOpts = {keyId: key4Id, keyValue: testApp.key4.value};
    var testCapability = {channelx:['publish']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 401, 'Verify request rejected with insufficient capability');
        test.done();
        return;
      }
      test.ok(false, 'Invalid capability, expected rejection');
      test.done();
    });
  };

  /*
   * Ops intersection non-empty
   */
  exports.authcapability4 = function(test) {
    test.expect(1);
    var key4Id = testApp.appId + '.' + testApp.key4Id;
    var testKeyOpts = {keyId: key4Id, keyValue: testApp.key4.value};
    var testCapability = {channel2:['presence', 'subscribe']};
    var expectedIntersection = {channel2:['subscribe']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Paths intersection non-empty
   */
  exports.authcapability5 = function(test) {
    test.expect(1);
    var key4Id = testApp.appId + '.' + testApp.key4Id;
    var testKeyOpts = {keyId: key4Id, keyValue: testApp.key4.value};
    var testCapability = {
      channel2:['presence', 'subscribe'],
      channelx:['presence', 'subscribe']
    };
    var expectedIntersection = {channel2:['subscribe']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Ops wildcard matching
   */
  exports.authcapability6 = function(test) {
    test.expect(1);
    var key4Id = testApp.appId + '.' + testApp.key4Id;
    var testKeyOpts = {keyId: key4Id, keyValue: testApp.key4.value};
    var testCapability = {channel2:['*']};
    var expectedIntersection = {channel2:['publish', 'subscribe']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };
  exports.authcapability7 = function(test) {
    test.expect(1);
    var key4Id = testApp.appId + '.' + testApp.key4Id;
    var testKeyOpts = {keyId: key4Id, keyValue: testApp.key4.value};
    var testCapability = {channel6:['publish', 'subscribe']};
    var expectedIntersection = {channel6:['publish', 'subscribe']};
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };

  /*
   * Resources wildcard matching
   */
  exports.authcapability8 = function(test) {
    test.expect(1);
    var key2Id = testApp.appId + '.' + testApp.key2Id;
    var testKeyOpts = {keyId: key2Id, keyValue: testApp.key2.value};
    var testCapability = {cansubscribe:['subscribe']};
    var expectedIntersection = testCapability;
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };
  exports.authcapability9 = function(test) {
    test.expect(1);
    var key2Id = testApp.appId + '.' + testApp.key2Id;
    var testKeyOpts = {keyId: key2Id, keyValue: testApp.key2.value};
    var testCapability = {'canpublish:check':['publish']};
    var expectedIntersection = testCapability;
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };
  exports.authcapability10 = function(test) {
    test.expect(1);
    var key2Id = testApp.appId + '.' + testApp.key2Id;
    var testKeyOpts = {keyId: key2Id, keyValue: testApp.key2.value};
    var testCapability = {'cansubscribe:*':['subscribe']};
    var expectedIntersection = testCapability;
    rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
      if(err) {
        test.ok(false, displayError(err));
        test.done();
        return;
      }
      test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
      test.done();
    });
  };

  /* Invalid capabilities */
  exports.invalid0 = function(test) {
    test.expect(1);
    rest.auth.requestToken({capability: invalid0}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
        test.done();
        return;
      }
      test.ok(false, 'Invalid capability, expected rejection');
      test.done();
    });
  };
  exports.invalid1 = function(test) {
    test.expect(1);
    rest.auth.requestToken({capability: invalid1}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
        test.done();
        return;
      }
      test.ok(false, 'Invalid capability, expected rejection');
      test.done();
    });
  };
  exports.invalid2 = function(test) {
    test.expect(1);
    rest.auth.requestToken({capability: invalid2}, function(err, tokenDetails) {
      if(err) {
        test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
        test.done();
        return;
      }
      test.ok(false, 'Invalid capability, expected rejection');
      test.done();
    });
  };

  return module.exports = helper.withTimeout(exports);
});
