'use strict';

/* Shared test helper used for creating Rest and Real-time clients */

define(['ably', 'globals', 'test/common/modules/testapp_module'], function (Ably, ablyGlobals, testAppHelper) {
  var utils = Ably.Realtime.Utils;

  function ablyClientOptions(helper, options) {
    helper = helper.addingHelperFunction('ablyClientOptions');
    helper.recordPrivateApi('call.Utils.copy');
    var clientOptions = utils.copy(ablyGlobals);
    helper.recordPrivateApi('call.Utils.mixin');
    utils.mixin(clientOptions, options);
    var authMethods = ['authUrl', 'authCallback', 'token', 'tokenDetails', 'key'];

    /* Use a default api key if no auth methods provided */
    if (
      authMethods.every(function (method) {
        return !(method in clientOptions);
      })
    ) {
      clientOptions.key = testAppHelper.getTestApp().keys[0].keyStr;
    }

    return clientOptions;
  }

  function ablyRest(helper, options) {
    helper = helper.addingHelperFunction('ablyRest');
    return new Ably.Rest(ablyClientOptions(helper, options));
  }

  function ablyRealtime(helper, options) {
    helper = helper.addingHelperFunction('ablyRealtime');
    return new Ably.Realtime(ablyClientOptions(helper, options));
  }

  return (module.exports = {
    Ably: Ably,
    AblyRest: ablyRest,
    AblyRealtime: ablyRealtime,
    ablyClientOptions,
  });
});
