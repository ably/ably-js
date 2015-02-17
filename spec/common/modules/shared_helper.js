"use strict";

/* Shared test helper for the Jasmine test suite that simplifies
   the dependencies by provoding common methods in a single dependency */

define(['spec/common/modules/testapp_module', 'spec/common/modules/client_module'], function(testAppModule, clientModule) {
  return module.exports = {
    setupApp:     testAppModule.setup,
    tearDownApp:  testAppModule.tearDown,

    AblyRest:     clientModule.AblyRest,
    AblyRealtime: clientModule.AblyRealtime
  };
});
