var Message = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	var resolveObjects = {
			'[object Null]': function(msg, data) {
				msg.type = messagetypes.TType.NONE;
				return true;
			},
			'[object Buffer]': function(msg, data) {
				msg.type = messagetypes.TType.BUFFER;
				msg.binaryData = data;
				return true;
			},
			'[object ArrayBuffer]': function(msg, data) {
				msg.type = messagetypes.TType.BUFFER;
				msg.binaryData = data;
				return true;
			},
			'[object Array]': function(msg, data) {
				msg.type = messagetypes.TType.LIST;
				msg.listData = data;
				return true;
			},
			'[object String]': function(msg, data) {
				msg.type = messagetypes.TType.STRING;
				msg.stringData = data.valueOf();
				return true;
			},
			'[object Number]': function(msg, data) {
				msg.type = messagetypes.TType.DOUBLE;
				msg.doubleData = data.valueOf();
				return true;
			},
			'[object Boolean]': function(msg, data) {
				msg.type = data.valueOf() ? messagetypes.TType.TRUE : messagetypes.TType.FALSE;
				return true;
			},
			'[object Object]': function(msg, data) {
				result.type = messagetypes.TType.MAP;
				result.mapData = data;
				return true;
			},
			'[object Function]': function(msg, data) {
				result.type = messagetypes.TType.MAP;
				result.mapData = data;
				return true;
			}
	};

	var resolveTypes = {
			'undefined': function(msg, data) {
				msg.type = messagetypes.TType.NONE;
				return true;
			},
			'boolean': function(msg, data) {
				msg.type = data ? messagetypes.TType.TRUE : messagetypes.TType.FALSE;
				return true;
			},
			'string': function(msg, data) {
				msg.type = messagetypes.TType.STRING;
				msg.stringData = data;
				return true;
			},
			'number': function(msg, data) {
				msg.type = messagetypes.TType.DOUBLE;
				msg.doubleData = data;
				return true;
			},
			'object': function(msg, data) {
				var func = resolveObjects[Object.prototype.toString.call(data)];
				return (func && func(msg, data));
			}
	};

	var getPayload = function(payload) {
		var result = undefined;
		switch(payload.type) {
		case 1: /* TRUE */
			result = true;
			break;
		case 2: /* FALSE */
			result = false;
			break;
		case 3: /* INT32 */
			result = payload.i32Data;
			break;
		case 4: /* INT64 */
			result = payload.i64Data;
			break;
		case 5: /* DOUBLE */
			result = payload.doubleData;
			break;
		case 6: /* STRING */
			result = payload.stringData;
			break;
		case 7: /* BUFFER */
			result = payload.binaryData;
			break;
		case 8: /* LIST */
			result = payload.listData;
			break;
		case 9: /* MAP */
			result = payload.mapData;
			break;
		case 0: /* NONE */
		}
		return result;
	};

	/* public constructor */
	function Message(channelSerial, timestamp, name, data) {
		this.channelSerial = channelSerial;
		this.timestamp = timestamp;
		this.name = name;
		this.data = data;
	}

	Message.createPayload = function(data)  {
		var result = new messagetypes.TData();
		var func = resolveTypes[typeof(data)];
		if(func && func(result, data))
			return result;
		throw new Error('Unsupported data type: ' + Object.prototype.toString.call(data));
	};

	Message.getPayload = getPayload;

	return Message;
})();
