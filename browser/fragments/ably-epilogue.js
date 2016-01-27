if(typeof Realtime !== 'undefined') {
	Ably.Rest = Rest;
	Ably.Realtime = Realtime;
	Realtime.ConnectionManager = ConnectionManager;
	Realtime.BufferUtils = Rest.BufferUtils = BufferUtils;
	if(typeof(Crypto) !== 'undefined') Realtime.Crypto = Rest.Crypto = Crypto;
	Realtime.Defaults = Rest.Defaults = Defaults;
	Realtime.Http = Rest.Http = Http;
	Realtime.Utils = Rest.Utils = Utils;
	Realtime.Message = Rest.Message = Message;
	Realtime.PresenceMessage = Rest.PresenceMessage = PresenceMessage;
	Realtime.ProtocolMessage = Rest.ProtocolMessage = ProtocolMessage;
}
}).call({});
