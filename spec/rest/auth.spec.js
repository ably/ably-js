"use strict";

define(['ably', 'spec/common/testapp'], function(ably, testAppModule) {
  var testApp;

  beforeAll(function(done) {
    testAppModule.setup(function(err, newTestApp) {
      if (err) {
        throw "Could not set up Test App: " + JSON.stringify(err);
      } else {
        testApp = newTestApp;
        done();
      }
    });
  });

  afterAll(function(done) {
    testAppModule.tearDown(testApp, function(err) {
      if (err) {
        throw "Could not tear down Test App: " + JSON.stringify(err);
      } else {
        testApp = null;
        done();
      }
    });
  });

  describe("REST Auth", function() {
    it('should have a valid TestApp', function(done) {
      expect(testApp).toBeDefined();
      expect(testApp.appId).toBeDefined();
      done();
    });
  });
});
