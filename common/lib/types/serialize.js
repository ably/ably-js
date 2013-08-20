this.Serialize = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function Serialize() {}

	var TData = Serialize.TData = {},
		TMessage = Serialize.TMessage = {},
		TPresence = Serialize.TPresence = {},
		TChannelMessage = Serialize.TChannelMessage = {},
		TMessageArray = Serialize.TMessageArray = {},
		TMessageSet = Serialize.TMessageSet = {},
		BUFFER = messagetypes.TType.BUFFER;

	TData.fromREST = function(jsonObject) {
		var tData, jsonData = jsonObject.data, encoding = jsonObject.encoding;
		if(encoding) {
			tData = new TData();
			tData.type = BUFFER;
			tData.binaryData = new Buffer(jsonData, encoding);
		} else {
			tData = Data.toTData(jsonData);
		}
		jsonObject.data = jsonData;
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	messagetypes.TMessage.prototype.toJSON = function() {
		var tData = this.data, result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			tags: this.tags
		};
		var value = Data.fromTData(tData);
		if(tData.type == BUFFER) {
			result.encoding = 'base64'
			value = value.toString('base64');
		}
		result.data = value;
		return result;
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	messagetypes.TPresence.prototype.toJSON = function() {
		var tData = this.clientData, result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			tags: this.tags
		};
		var value = Data.fromTData(tData);
		if(tData.type == BUFFER) {
			result.encoding = 'base64'
			value = value.toString('base64');
		}
		result.clientData = value;
		return result;
	};

	TData.fromREST = function(jsonObject, jsonData) {
		var tData, jsonData, encoding = jsonObject.encoding;
		if(encoding) {
			tData = new TData();
			tData.type = BUFFER;
			tData.binaryData = new Buffer(jsonData, encoding);
		} else {
			tData = Data.toTData(jsonData);
		}
		return tData;
	};

	TMessage.fromJSON = function(jsonObject) {
		jsonObject.data = TData.fromREST(jsonObject, jsonObject.data);
		return new messagetypes.TMessage(jsonObject);
	};

	TPresence.fromJSON = function(jsonObject) {
		jsonObject.clientData = TData.fromREST(jsonObject, jsonObject.clientData);
		return new messagetypes.TPresence(jsonObject);
	};

	TChannelMessage.fromJSON = function(jsonObject) {
		var elements;
		if(elements = jsonObject.messages) {
			var count = elements.length;
			var messages = jsonObject.messages = new Array(count);
			for(var i = 0; i < count; i++) messages[i] = TMessage.fromJSON(elements[i]);
		}
		if(elements = jsonObject.presence) {
			var count = elements.length;
			var presence = jsonObject.presence = new Array(count);
			for(var i = 0; i < count; i++) presence[i] = TPresence.fromJSON(elements[i]);
		}
		return new messagetypes.TChannelMessage(jsonObject);
	};

	TChannelMessage.decode = function(encoded, binary) {
		var result, err;
		if(binary) {
			if(err = ThriftUtil.decodeSync((result = new messagetypes.TChannelMessage()), encoded)) throw err;
		} else {
			result = TChannelMessage.fromJSON(JSON.parse(encoded));
		}
		return result;
	};

	/* NOTE: decodes to items */
	TMessageSet.decode = function(encoded, binary) {
		var items = null, err;
		if(encoded) {
			if(binary) {
				var ob;
				if(err = ThriftUtil.decodeSync((ob = new messagetypes.TMessageSet()), encoded)) throw err;
				items = ob.items;
			} else {
				var elements = JSON.parse(encoded), count = elements.length;
				items = new Array(count);
				for(var i = 0; i < count; i++) items[i] = TChannelMessage.fromJSON(elements[i]);
			}
		}
		return items;
	};

	TChannelMessage.encode = function(message, binary) {
		return binary ? ThriftUtil.encodeSync(message) : JSON.stringify(message);
	};

	TMessageSet.encode = function(items, binary) {
		return binary ? ThriftUtil.encodeSync(new messagetypes.TMessageSet({items:items})) : JSON.stringify(items);
	};

	TMessageArray.encode = function(items, binary) {
		return binary
			? ThriftUtil.encodeSync(new messagetypes.TMessageArray({items:items.map(TMessage.fromJSON)}))
			: JSON.stringify(items);
	};

	TMessageArray.decode = function(encoded, binary) {
		var items = null, err;
		if(encoded) {
			if(binary) {
				var ob;
				if(err = ThriftUtil.decodeSync((ob = new messagetypes.TMessageArray()), encoded)) throw err;
				items = ob.items;
			} else {
				var elements = JSON.parse(encoded), count = elements.length;
				items = new Array(count);
				for(var i = 0; i < count; i++) items[i] = TMessage.fromJSON(elements[i]);
			}
		}
		return items;
	};

	return Serialize;
})();
