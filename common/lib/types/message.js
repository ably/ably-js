var Message = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	/* public constructor */
	function Message(channelSerial, timestamp, name, data) {
		this.channelSerial = channelSerial;
		this.timestamp = timestamp;
		this.name = name;
		this.data = data;
	}

	Message.decodeTChannelMessage = function(encoded, callback) { Thrift.decode(new messagetypes.TChannelMessage(), encoded, callback); }
	Message.decodeTMessageArray = function(encoded, callback) { Thrift.decode(new messagetypes.TMessageArray(), encoded, callback); }
	Message.decodeTMessageSet = function(encoded, callback) { Thrift.decode(new messagetypes.TMessageSet(), encoded, callback); }
	Message.decodeTMessage = function(encoded, callback) { Thrift.decode(new messagetypes.TMessage(), encoded, callback); }
	Message.encodeTMessageSync = function(message, callback) { return Thrift.encodeSync(new messagetypes.TMessage(message)); }

	return Message;
})();
