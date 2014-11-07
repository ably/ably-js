var PresenceMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function PresenceMessage() {
		this.action = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.clientData = undefined;
		this.xform = undefined;
		this.memberId = undefined;
		this.inheritMemberId = undefined;
	}

	PresenceMessage.Action = {
		'ENTER' : 0,
		'LEAVE' : 1,
		'UPDATE' : 2
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PresenceMessage.prototype.toJSON = function() {
		var result = {
			name: this.name,
			clientId: this.clientId,
			memberId: this.memberId,
			timestamp: this.timestamp,
			action: this.action,
			xform: this.xform
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var clientData = this.clientData;
		if(arguments.length > 0 && BufferUtils.isBuffer(clientData)) {
			var xform = this.xform;
			result.xform = xform ? (xform + '/base64') : 'base64';
			clientData = clientData.toString('base64');
		}
		result.clientData = clientData;
		return result;
	};

	PresenceMessage.encrypt = function(msg, options) {
		var data = msg.clientData, xform = msg.xform;
		if(!BufferUtils.isBuffer(data)) {
			data = Crypto.Data.utf8Encode(String(data));
			xform = xform ? (xform + '/utf-8') : 'utf-8';
		}
		msg.clientData = options.cipher.encrypt(data);
		msg.xform = xform ? (xform + '/cipher') : 'cipher';
	};

	PresenceMessage.encode = function(msg, options) {
		if(options != null && options.encrypted)
			PresenceMessage.encrypt(msg, options);
	};

	PresenceMessage.decode = function(message, options) {
		var xform = message.xform;
		if(xform) {
			var i = 0, j = xform.length, data = message.clientData;
			try {
				while((i = j) >= 0) {
					j = xform.lastIndexOf('/', i - 1);
					var subXform = xform.substring(j + 1, i);
					if(subXform == 'base64') {
						data = BufferUtils.base64Decode(String(data));
						continue;
					}
					if(subXform == 'utf-8') {
						data = Crypto.Data.utf8Decode(data);
						continue;
					}
					if(subXform == 'cipher' && options != null && options.encrypted) {
						data = options.cipher.decrypt(data);
						continue;
					}
					/* FIXME: can we do anything generically with msgpack here? */
					break;
				}
			} finally {
				this.xform = (i <= 0) ? null : xform.substring(0, i);
				this.clientData = data;
			}
		}
	};

	PresenceMessage.fromResponseBody = function(encoded, options, format) {
		if(format)
			body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

		for(var i = 0; i < body.length; i++) {
			var msg = body[i] = PresenceMessage.fromDecoded(body[i]);
			PresenceMessage.decode(msg, options);
		}
		return body;
	};

	PresenceMessage.fromDecoded = function(values) {
		return Utils.mixin(new PresenceMessage(), values);
	};

	PresenceMessage.fromValues = function(values) {
		var result = Utils.mixin(new PresenceMessage(), values);
		result.clientData = Data.toData(result.clientData);
		result.timestamp = result.timestamp || Date.now();
		return result;
	};

	PresenceMessage.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	return PresenceMessage;
})();
