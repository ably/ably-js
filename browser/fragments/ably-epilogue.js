	if(typeof Realtime !== 'undefined') {
		Ably.msgpack = msgpack;
		Ably.Rest = Rest;
		Ably.Realtime = Realtime;
		Realtime.ConnectionManager = ConnectionManager;
		Realtime.BufferUtils = Rest.BufferUtils = BufferUtils;
		if(typeof(Crypto) !== 'undefined') Realtime.Crypto = Rest.Crypto = Crypto;
		Realtime.Defaults = Rest.Defaults = Defaults;
		Realtime.Http = Rest.Http = Http;
		Realtime.Utils = Rest.Utils = Utils;
		Realtime.Http = Rest.Http = Http;
		Realtime.Message = Rest.Message = Message;
		Realtime.PresenceMessage = Rest.PresenceMessage = PresenceMessage;
		Realtime.ProtocolMessage = Rest.ProtocolMessage = ProtocolMessage;
	}

	/* CommonJS support */
	if (typeof global.exports === "object") {
		for (var obj in global.Ably) {
			if (global.Ably.hasOwnProperty(obj)) {
				global.exports[obj] = global.Ably[obj];
			}
		}
		/* SystemJS support for default exports to be added to the root of the module
		   https://github.com/frankwallis/plugin-typescript/issues/185 */
		global.exports.__esModule = true;
	}

	/* AMD support */
	if (typeof global.define === "function" && global.define.amd) {
		global.define("ably", [], function() {
			return global.Ably;
		});
	}

}).call({});
