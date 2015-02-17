/* global console, define, global, module */
"use strict";

/*
  Test App creation helper used within Jasmine tests.
  Ensures setup and tear down only occurs once across a single test run
*/

define(['testapp'], function(testAppModule) {
  var isBrowser = (typeof(window) === 'object'),
      globalObject = isBrowser? window : global;

  if (!globalObject.AblySetupBlockCounter) { globalObject.AblySetupBlockCounter = 0; }

  function updateTestApp(newTestApp) {
    globalObject.AblyTestApp = newTestApp;
  }

  function configuredTestApp() {
    return globalObject.AblyTestApp;
  }

  function incrementSetupBlockCounter() {
    globalObject.AblySetupBlockCounter += 1;
  }

  function decrementSetupBlockCounter() {
    globalObject.AblySetupBlockCounter -= 1;
  }

  /* setup is typically called by a beforeAll test suite block.
     If setup is called more than once i.e. across multiple suites,
     then no need to recreate a test app */
  function setup(done, forceSetup) {
    incrementSetupBlockCounter();
    if (configuredTestApp() && !forceSetup) { return done(); }

    testAppModule.setup(function(err, newTestApp) {
      if (err) {
        throw "Could not set up Test App: " + JSON.stringify(err);
      } else {
        updateTestApp(newTestApp);
        console.log("Test App " + configuredTestApp().appId + " has been set up");
        done();
      }
    });
  }

  /* tearDown is typically called by an afterAll test suite block.
     If tearDown is called more than once i.e. across multiple suites,
     and other test suites are still to run, then we must not yet delete the test app */
  function tearDown(done, forceTearDown) {
    decrementSetupBlockCounter();
    if (!forceTearDown && (globalObject.AblySetupBlockCounter === 0)) { return done(); } // tearDown only if last afterAll block to run
    if (!configuredTestApp() && !forceTearDown) { return done(); }

    testAppModule.tearDown(configuredTestApp(), function(err) {
      if (err) {
        throw "Could not tear down Test App: " + JSON.stringify(err);
      } else {
        console.log("Test App " + configuredTestApp().appId + " has been torn down");
        updateTestApp(null);
        done();
      }
    });
  }

  function reset(done) {
    setup(function() {
      tearDown(function() {
        done();
      }, true);
    }, true);
  }

  var exports = {
    setup: setup,
    tearDown: tearDown,
    reset: reset,
    getTestApp: function() { return globalObject.AblyTestApp; }
  };

  if (isBrowser) {
    return exports;
  } else {
    module.exports = exports;
  }
});
