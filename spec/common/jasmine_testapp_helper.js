/* global define, beforeAll, afterAll, __ABLY__, Ably */
"use strict";

/* Shared test helper used within Jasmine tests */

define(['testapp'], function(testAppModule) {
  var testApp;

  function addTestHooks() {
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
  }

  function ablyClientOptions(options) {
    var keyIndex = options.key || 0,
        environment = options.environment || __ABLY__.environment,
        clientOptions = { key: testApp['key' + keyIndex + 'Str'], environment: __ABLY__.environment };

    if (options.host) { clientOptions.host = options.host; }
    if (options.wsHost) { clientOptions.wsHost = options.wsHost; }
    if (options.restHost) { clientOptions.host = options.restHost; }

    return clientOptions;
  }

  function ablyRest(options) {
    return new Ably.Rest(ablyClientOptions(options));
  }

  function ablyRealtime(options) {
    return new Ably.Realtime(ablyClientOptions(options));
  }

  return {
    setupTestApp: function() {
      addTestHooks();
    },
    AblyRest: function(options) {
      return ablyRest(options);
    },
    AblyRealtime: function(options) {
      return ablyRealtime(options);
    }
  };
});
