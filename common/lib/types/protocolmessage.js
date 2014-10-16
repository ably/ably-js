var ProtocolMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack');

	function ProtocolMessage() {
		this.action = undefined;
		this.count = undefined;
		this.error = undefined;
		this.connectionId = undefined;
		this.connectionSerial = undefined;
		this.channel = undefined;
		this.channelSerial = undefined;
		this.msgSerial = undefined;
		this.timestamp = undefined;
		this.messages = undefined;
		this.presence = undefined;
	}

	ProtocolMessage.Action = {
		'HEARTBEAT' : 0,
		'ACK' : 1,
		'NACK' : 2,
		'CONNECT' : 3,
		'CONNECTED' : 4,
		'DISCONNECT' : 5,
		'DISCONNECTED' : 6,
		'CLOSE' : 7,
		'CLOSED' : 8,
		'ERROR' : 9,
		'ATTACH' : 10,
		'ATTACHED' : 11,
		'DETACH' : 12,
		'DETACHED' : 13,
		'PRESENCE' : 14,
		'MESSAGE' : 15
	};

	ProtocolMessage.encode = function(msg, format) {
		return (format == 'msgpack') ? msgpack.pack(msg): JSON.stringify(msg);
	};

	ProtocolMessage.decode = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.unpack(encoded) : JSON.parse(String(encoded));
		return ProtocolMessage.fromDecoded(decoded);
	};

	ProtocolMessage.fromDecoded = function(decoded) {
		var error = decoded.error;
		if(error) decoded.error = ErrorInfo.fromValues(error);
		var messages = decoded.messages;
		if(messages) for(var i = 0; i < messages.length; i++) messages[i] = Message.fromDecoded(messages[i]);
		var presence = decoded.presence;
		if(presence) for(var i = 0; i < presence.length; i++) presence[i] = PresenceMessage.fromDecoded(presence[i]);
		return Utils.mixin(new ProtocolMessage(), decoded);
	};

	ProtocolMessage.fromValues = function(values) {
		return Utils.mixin(new ProtocolMessage(), values);
	};

	return ProtocolMessage;
})();
