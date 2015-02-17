/* global console, jasmine, define, beforeAll, afterAll, global, __ABLY__, Ably */
"use strict";

/* Shared test helper used for creating Rest and Real-time clients */

define(['ably', 'testapp_module'], function(Ably, testAppHelper) {
  function ablyClientOptions(options) {
    var keyIndex = options.key || 0,
        environment = options.environment || __ABLY__.environment,
        clientOptions = { key: testAppHelper.getTestApp()['key' + keyIndex + 'Str'], environment: __ABLY__.environment };

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

  var exports = {
    AblyRest: function(options) {
      return ablyRest(options);
    },
    AblyRealtime: function(options) {
      return ablyRealtime(options);
    }
  };

  var isBrowser = (typeof(window) === 'object');
  if (isBrowser) {
    return exports;
  } else {
    module.exports = exports;
  }
});
