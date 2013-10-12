this.Data = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var TData = messagetypes.TData;
	var TType = messagetypes.TType;
	var CipherData = Crypto.CipherData;

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
			msg.type = messagetypes.TType.JSONARRAY;
			msg.stringData = JSON.stringify(data);
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
			if(typeof(Buffer) !== 'undefined' && Buffer.isBuffer(data)) {
				msg.type = messagetypes.TType.BUFFER;
				msg.binaryData = data;
			} else {
				msg.type = messagetypes.TType.JSONOBJECT;
				msg.stringData = JSON.stringify(data);
			}
			return true;
		},
		'[object Function]': function(msg, data) {
			msg.type = messagetypes.TType.JSONOBJECT;
			msg.stringData = JSON.stringify(data);
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

	function Data() {}

	Data.fromTData = function(tData) {
		var result = undefined;
		if(tData) {
			if(tData.cipherData)
				return new CipherData(tData.cipherData, tData.type);

			switch(tData.type) {
				case 1: /* TRUE */
					result = true;
					break;
				case 2: /* FALSE */
					result = false;
					break;
				case 3: /* INT32 */
					result = tData.i32Data;
					break;
				case 4: /* INT64 */
					result = tData.i64Data;
					break;
				case 5: /* DOUBLE */
					result = tData.doubleData;
					break;
				case 6: /* STRING */
					result = tData.stringData;
					break;
				case 7: /* BUFFER */
					result = tData.binaryData;
					break;
				case 8: /* JSONARRAY */
				case 9: /* JSONOBJECT */
					result = JSON.parse(tData.stringData);
					break;
				case 0: /* NONE */
			}
		}
		return result;
	};

	Data.toTData = function(value) {
		var result = new messagetypes.TData();
		var func = resolveTypes[typeof(value)];
		if(func && func(result, value))
			return result;
		throw new Error('Unsupported data type: ' + Object.prototype.toString.call(value));
	};

	Data.asPlaintext = function(tData) {
		var result;
		switch(tData.type) {
			case TType.STRING:
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
				result = new Buffer(tData.stringData);
				break;
			case TType.NONE:
			case TType.TRUE:
			case TType.FALSE:
				break;
			case TType.INT32:
				result = new Buffer(4);
				result.writeInt32BE(tData.i32Data, 0, true);
				break;
			case TType.INT64:
				result = new Buffer(8);
				result.writeInt64BE(tData.i64Data, 0, true);
				break;
			case TType.DOUBLE:
				result = new Buffer(8);
				result.writeDouble64BE(tData.doubleData, 0, true);
				break;
			case TType.BUFFER:
				result = tData.binaryData;
				break;
		}
		return result;
	};

	Data.fromPlaintext = function(plaintext, type) {
		var result = new TData();
		result.type = type;
		switch(type) {
			case TType.INT32:
				result.i32Data = plaintext.readInt32BE(0, true);
				break;
			case TType.INT64:
				result.i64Data = plaintext.readInt64BE(0, true);
				break;
			case TType.DOUBLE:
				result.doubleData = plaintext.readDoubleBE(0, true);
				break;
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
			case TType.STRING:
				result.stringData = plaintext.toString();
				break;
			case TType.BUFFER:
				result.binaryData = plaintext;
				break;
		/*	case TType.NONE:
			case TType.TRUE:
			case TType.FALSE: */
			default:
		}
		return result;
	};

	return Data;
})();
