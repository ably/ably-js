	if(typeof Realtime !== 'undefined') {
		var Types = {
			ClientOptions: function(obj) { return (obj); }
		};
		Ably.Types = Types;
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
}).call({});

/* CommonJS support */
if (typeof exports === "object" && exports) {
	for (var obj in window.Ably) {
		if (window.Ably.hasOwnProperty(obj)) {
			exports[obj] = window.Ably[obj];
		}
	}
	/* SystemJS support for default exports to be added to the root of the module
	   https://github.com/frankwallis/plugin-typescript/issues/185 */
	exports.__esModule = true;
}

/* AMD support */
if (typeof define === "function" && define.amd) {
  define("ably", [], function() {
    return window.Ably;
  });
}
