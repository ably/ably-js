this.Serialize = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function Serialize() {}

	var TData = Serialize.TData = {},
		TMessage = Serialize.TMessage = {},
		TPresence = Serialize.TPresence = {},
		TProtocolMessage = Serialize.TProtocolMessage = {},
		TMessageArray = Serialize.TMessageArray = {},
		TMessageBundle = Serialize.TMessageBundle = {},
		BUFFER = messagetypes.TType.BUFFER;

	/**
	 * Overload toString() to be useful
	 * @return {*}
	 */
	messagetypes.TError.prototype.toString = function() {
		var result = '[' + this.constructor.name;
		if(this.message) result += ': ' + this.message;
		if(this.statusCode) result += '; statusCode=' + this.statusCode;
		if(this.code) result += '; code=' + this.code;
		result += ']';
		return result;
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

		var value;
		if(value = Data.isCipherData(tData)) {
			result.encoding = 'cipher+base64';
			value = Crypto.Data.asBase64(value);
			result.type = tData.type;
		} else {
			value = Data.fromTData(tData);
			if(tData.type == BUFFER) {
				result.encoding = 'base64';
				value = value.toString('base64');
			}
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
			memberId: this.memberId,
			timestamp: this.timestamp,
			state: this.state,
			tags: this.tags
		};
		var value = Data.fromTData(tData);
		if(tData && (tData.type == BUFFER)) {
			result.encoding = 'base64'
			value = value.toString('base64');
		}
		result.clientData = value;
		return result;
	};

	TData.fromREST = function(jsonObject, jsonData) {
		var tData, encoding = jsonObject.encoding;
		switch(encoding) {
			case 'cipher+base64':
				tData = new messagetypes.TData();
				tData.type = jsonObject.type;
				tData.cipherData = Crypto.Data.fromBase64(jsonData);
				break;
			case 'base64':
				tData = new messagetypes.TData();
				tData.type = BUFFER;
				tData.binaryData = new Buffer(jsonData, 'base64');
				break;
			default:
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

	TProtocolMessage.fromJSON = function(jsonObject) {
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
		return new messagetypes.TProtocolMessage(jsonObject);
	};

	TProtocolMessage.decode = function(encoded, binary) {
		var result, err;
		if(binary) {
			if(err = ThriftUtil.decodeSync((result = new messagetypes.TProtocolMessage()), encoded)) throw err;
		} else {
			result = TProtocolMessage.fromJSON(JSON.parse(encoded));
		}
		return result;
	};

	/* NOTE: decodes to items */
	TMessageBundle.decode = function(encoded, binary) {
		var items = null, err;
		if(encoded) {
			if(binary) {
				var ob;
				if(err = ThriftUtil.decodeSync((ob = new messagetypes.TMessageBundle()), encoded)) throw err;
				items = ob.items;
			} else {
				var elements = JSON.parse(encoded), count = elements.length;
				items = new Array(count);
				for(var i = 0; i < count; i++) items[i] = TProtocolMessage.fromJSON(elements[i]);
			}
		}
		return items;
	};

	TProtocolMessage.encode = function(message, binary) {
		return binary ? ThriftUtil.encodeSync(message) : JSON.stringify(message);
	};

	TMessageBundle.encode = function(items, binary) {
		return binary ? ThriftUtil.encodeSync(new messagetypes.TMessageBundle({items:items})) : JSON.stringify(items);
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
