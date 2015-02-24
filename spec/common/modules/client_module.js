"use strict";

/* Shared test helper used for creating Rest and Real-time clients */

define(['ably', 'globals', 'spec/common/modules/testapp_module'], function(Ably, ablyGlobals, testAppHelper) {
  function ablyClientOptions(options) {
    if (!options) { options = {}; }

    var environment = options.environment || ablyGlobals.environment,
        clientOptions = { environment: environment };

    if (options.authToken) {
      clientOptions.authToken = options.authToken;
    } else {
      clientOptions.key = testAppHelper.getTestApp()['key' + (options.key || 0) + 'Str'];
    }

    if (options.useBinaryProtocol !== undefined) { clientOptions.useBinaryProtocol = options.useBinaryProtocol; }

    var ignoreOptions = ['environment', 'authToken', 'key'];
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        if (ignoreOptions.indexOf(key) === -1) {
          clientOptions[key] = options[key];
        }
      }
    }

    return clientOptions;
  }

  function ablyRest(options) {
    return new Ably.Rest(ablyClientOptions(options));
  }

  function ablyRealtime(options) {
    return new Ably.Realtime(ablyClientOptions(options));
  }

  return module.exports = {
    AblyRest:     ablyRest,
    AblyRealtime: ablyRealtime
  };
});
