"use strict";

/* Shared test helper for the Jasmine test suite that simplifies
   the dependencies by provoding common methods in a single dependency */

define(['spec/common/modules/testapp_module', 'spec/common/modules/client_module'], function(testAppModule, clientModule) {
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

  return module.exports = {
    setupApp:     testAppModule.setup,
    tearDownApp:  testAppModule.tearDown,
    getTestApp:   testAppModule.getTestApp,

    AblyRest:     clientModule.AblyRest,
    AblyRealtime: clientModule.AblyRealtime,

    displayError: displayError
  };
});
