"use strict";

/* Shared test helper for the Jasmine test suite that simplifies
   the dependencies by providing common methods in a single dependency */

define(['spec/common/modules/testapp_module', 'spec/common/modules/client_module', 'spec/common/modules/testdata_module'],
  function(testAppModule, clientModule, testDataModule) {
    var displayError = function(err) {
      if(typeof(err) == 'string')
        return err;

      var result = '';
      if(err.statusCode)
        result += err.statusCode + '; ';
      if(typeof(err.message) == 'string')
        result += err.message;
      if(typeof(err.message) == 'object')
        result += JSON.stringify(err.message);

      return result;
    };

    /* Wraps all tests with a timeout so that they don't run indefinitely */
    var withTimeout = function(exports, defaultTimeout) {
      var timeout = defaultTimeout || 25 * 1000;

      for (var needle in exports) {
        if (exports.hasOwnProperty(needle)) {
          (function(originalFn) {
            exports[needle] = function(test) {
              var originalDone = test.done;
              test.done = function() {
                clearTimeout(timer);
                originalDone.apply(test, arguments);
              };
              var timer = setTimeout(function() {
                test.ok(false, "Test timed out after " + (timeout / 1000) + "s");
                test.done();
              }, timeout);
              originalFn(test);
            };
          })(exports[needle]);
        }
      }

      return exports;
    };

    return module.exports = {
      setupApp:     testAppModule.setup,
      tearDownApp:  testAppModule.tearDown,
      createStats:  testAppModule.createStatsFixtureData,
      getTestApp:   testAppModule.getTestApp,

      Ably:         clientModule.Ably,
      AblyRest:     clientModule.AblyRest,
      AblyRealtime: clientModule.AblyRealtime,

      loadTestData: testDataModule.loadTestData,

      displayError: displayError,
      withTimeout:  withTimeout
    };
  });
