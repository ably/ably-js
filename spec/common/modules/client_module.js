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

  return module.exports = {
    AblyRest:     ablyRest,
    AblyRealtime: ablyRealtime
  };
});
