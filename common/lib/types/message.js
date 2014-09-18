var Message = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var TData = messagetypes.TData;

	/* public constructor */
	function Message(channelSerial, timestamp, name, data) {
		this.channelSerial = channelSerial;
		this.timestamp = timestamp;
		this.name = name;
		this.data = data;
	}

	Message.encrypt = function(msg, cipher) {
		var cipherData = new TData(), data = msg.data;
		cipherData.cipherData = cipher.encrypt(Crypto.Data.asPlaintext(data));
		cipherData.type = data.type;
		msg.data = cipherData;
	};

	Message.decrypt = function(msg, cipher) {
		var data = msg.data;
		if(data.cipherData)
			msg.data = Crypto.Data.fromPlaintext(cipher.decrypt(data.cipherData), data.type);
	};

	return Message;
})();
