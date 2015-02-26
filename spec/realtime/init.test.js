"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var realtime, exports = {};

  exports.setupInit = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, helper.displayError(err));
      } else {
        test.ok(true, 'app set up');
      }
      test.done();
    });
  };

  /*
   * Base init case
   */
  exports.initbase0 = function(test) {
    test.expect(1);
    try {
      var realtime = helper.AblyRealtime();
      realtime.connection.on('connected', function() {
        test.ok(true, 'Verify init with key');
        test.done();
        realtime.close();
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, 'connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Init with key failed with exception: ' + e.stack);
      test.done();
    }
  };

  /* check default httpHost selection */
  exports.init_defaulthost = function(test) {
    test.expect(1);
    try {
      // TODO: Karma issue with iFrame and XHR transports means we have to force alternative transports
      // XHR error:
      //   EventEmitter.emit(): Unexpected listener exception: TypeError: undefined is not a function; stack = TypeError: undefined is not a function
      //    at callListener (http://localhost:9876/base/browser/static/ably.js?f465f17ef34b12ef3b289873fbc1bd522732d114:4155:19)
      //    at XHRRequest.EventEmitter.emit (http://localhost:9876/base/browser/static/ably.js?f465f17ef34b12ef3b289873fbc1bd522732d114:4172:5)
      //    at XHRRequest.complete (http://localhost:9876/base/browser/static/ably.js?f465f17ef34b12ef3b289873fbc1bd522732d114:8108:9)
      //    at XMLHttpRequest.xhr.onerror (http://localhost:9876/base/browser/static/ably.js?f465f17ef34b12ef3b289873fbc1bd522732d114:8149:9)'
      // Iframe error:
      //    Uncaught TypeError: Cannot read property 'destWindow' of null
      //      at /Users/matthew/Projects/Ably/clients/ably-js/browser/static/ably.js:8608
      //
      var realtime = helper.AblyRealtime({ key: 'not_a.real:key', transports: ['web_socket', 'jsonp'] });
      var defaultHost = realtime.connection.connectionManager.httpHosts[0];
      var hostWithoutEnv = defaultHost.replace(/^\w+\-rest/, 'rest');
      test.equal(hostWithoutEnv, 'rest.ably.io', 'Verify correct default rest host chosen');
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.done();
          realtime.close();
        });
      }
      exitOnState('failed');
      exitOnState('disconnected');
    } catch(e) {
      test.ok(false, 'Init with key failed with exception: ' + e.stack);
      test.done();
    }
  };

  // TODO: Cannot get this test to pass ever in Karma environment, so manually removing for now
  if (isBrowser && window.__karma__ && window.__karma__.start) {
    delete exports.init_defaulthost;
  }

  return module.exports = helper.withTimeout(exports);
});
