"use strict";

define(['ably', 'testapp'], function(Ably, testAppModule) {
  describe('REST Auth', function() {
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

    var stripQualifier = function(qualifiedKeyId) {
      return qualifiedKeyId.split('.')[1];
    };

    var AblyRest = function(options) {
      var keyIndex = options.key || 0;
      return new Ably.Rest({ key: testApp['key' + keyIndex + 'Str'], useBinaryProtocol: false, wsHost: 'sandbox-realtime.ably.io', host: 'sandbox-rest.ably.io' });
    }

    describe('Ably.Rest#time', function() {
      it('obtains the server time', function(done) {
        AblyRest({ key: 0 }).time(function(err, time) {
          if(err) {
            throw err;
          }
          var timeOffset = time - Date.now();
          expect(Math.abs(timeOffset)).toBeLessThan(5000);
          done();
        });
      }, 5000);
    });
  });
});
