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
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      }
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Init with key failed with exception: ' + e.stack);
      test.done();
    }
  };

  /* check default  httpHost selection */
  exports.init_defaulthost = function(test) {
    test.expect(1);
    try {
      var realtime = helper.AblyRealtime({ key: 'not_a.real:key' });
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

  return module.exports = helper.withTimeout(exports);
});
