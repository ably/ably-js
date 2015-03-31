"use strict";

/* Shared test helper used for creating Rest and Real-time clients */

define(['ably', 'globals', 'spec/common/modules/testapp_module'], function(Ably, ablyGlobals, testAppHelper) {
	var ignoreOptions = ['authToken', 'key'];

	function mixinOptions(dest, src) {
		for (var key in src) {
			if (src.hasOwnProperty(key)) {
				if (ignoreOptions.indexOf(key) === -1) {
					dest[key] = src[key];
				}
			}
		}
		return dest;
	}

	function ablyClientOptions(options) {
		options = options || {};
		var clientOptions = mixinOptions({}, ablyGlobals);
		if(options) {
			mixinOptions(clientOptions, options);
			if (options.authToken) {
				clientOptions.authToken = options.authToken;
			} else {
				if (options.key) {
					clientOptions.key = options.key;
				} else {
					clientOptions.key = testAppHelper.getTestApp().keys[0].keyStr;
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
		Ably:         Ably,
		AblyRest:     ablyRest,
		AblyRealtime: ablyRealtime
	};
});
