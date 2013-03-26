this.PresenceMessage = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function PresenceMessage() {}

	PresenceMessage.decodeTPresence = function(encoded, callback) { Thrift.decode(new messagetypes.decodeTPresence(), encoded, callback); }
	PresenceMessage.decodeTPresenceArray = function(encoded, callback) { Thrift.decode(new messagetypes.decodeTPresenceArray(), encoded, callback); }

})();
