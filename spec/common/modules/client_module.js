"use strict";

/* Shared test helper used for creating Rest and Real-time clients */

define(['ably', 'globals', 'spec/common/modules/testapp_module'], function(Ably, ablyGlobals, testAppHelper) {
	var utils = Ably.Realtime.Utils;
	function mixinOptions(dest, src) {
		for (var key in src) {
			if (src.hasOwnProperty(key)) {
				dest[key] = src[key];
			}
		}
		return dest;
	}

	function ablyClientOptions(options) {
		options = options || {};
		var clientOptions = mixinOptions({}, ablyGlobals);
		var authMethods = ['authUrl', 'authCallback', 'token', 'tokenDetails', 'key'];
		if(options) {
			mixinOptions(clientOptions, options);

			/* Use a default api key if no auth methods provided */
			if(utils.arrEvery(authMethods, function(method) {
				return !(method in clientOptions);
			})) {
				clientOptions.key = testAppHelper.getTestApp().keys[0].keyStr;
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
		Ably:         Ably,
		AblyRest:     ablyRest,
		AblyRealtime: ablyRealtime
	};
});
