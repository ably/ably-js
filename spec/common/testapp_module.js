/* global console, jasmine, define, beforeAll, afterAll, global, __ABLY__, Ably */
"use strict";

/* Shared test helper used within Jasmine tests */

define(['testapp'], function(testAppModule) {
  var isBrowser = (typeof(window) === 'object');

  function globalObject() {
    if (isBrowser) {
      return window;
    } else {
      return global;
    }
  }

  function updateTestApp(newTestApp) {
    globalObject().AblyTestApp = newTestApp;
  }

  function getTestApp() {
    return globalObject().AblyTestApp;
  }

  function incrementBeforeAllCounter(quantity) {
    if (!globalObject().AblyBeforeAllCounter) { globalObject().AblyBeforeAllCounter = 0; }
    globalObject().AblyBeforeAllCounter += quantity;
    return globalObject().AblyBeforeAllCounter;
  }

  function getBeforeAllCounter() {
    return globalObject().AblyBeforeAllCounter;
  }

  function setup(done) {
    incrementBeforeAllCounter(1);
    if (getTestApp()) { return done(); }

    testAppModule.setup(function(err, newTestApp) {
      if (err) {
        throw "Could not set up Test App: " + JSON.stringify(err);
      } else {
        updateTestApp(newTestApp);
        console.log("Test App " + getTestApp().appId + " has been set up");
        done();
      }
    });
  }

  function tearDown(done) {
    if (incrementBeforeAllCounter(-1) <= 0) { return done(); } // tearDown only if last afterAll block to run
    if (!getTestApp()) { return done(); }

    testAppModule.tearDown(getTestApp(), function(err) {
      if (err) {
        throw "Could not tear down Test App: " + JSON.stringify(err);
      } else {
        console.log("Test App " + getTestApp().appId + " has been torn down");
        updateTestApp(null);
        done();
      }
    });
  }

  var exports = {
    setup: setup,
    tearDown: tearDown,
    getTestApp: function() {
      return getTestApp();
    }
  };

  var isBrowser = (typeof(window) === 'object');
  if (isBrowser) {
    return exports;
  } else {
    module.exports = exports;
  }
});
