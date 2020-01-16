var ProtocolMessage = (function() {

	function ProtocolMessage() {
		this.action = undefined;
		this.flags = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.count = undefined;
		this.error = undefined;
		this.connectionId = undefined;
		this.connectionKey = undefined;
		this.connectionSerial = undefined;
		this.channel = undefined;
		this.channelSerial = undefined;
		this.msgSerial = undefined;
		this.messages = undefined;
		this.presence = undefined;
		this.auth = undefined;
		this.params = undefined;
	}

	var actions = ProtocolMessage.Action = {
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
		'MESSAGE' : 15,
		'SYNC' : 16,
		'AUTH' : 17
	};

	ProtocolMessage.channelModes = [ 'PRESENCE', 'PUBLISH', 'SUBSCRIBE', 'PRESENCE_SUBSCRIBE' ];

	ProtocolMessage.ActionName = [];
	Utils.arrForEach(Utils.keysArray(ProtocolMessage.Action, true), function(name) {
		ProtocolMessage.ActionName[actions[name]] = name;
	});

	var flags = {
		/* Channel attach state flags */
		'HAS_PRESENCE':       1 << 0,
		'HAS_BACKLOG':        1 << 1,
		'RESUMED':            1 << 2,
		'TRANSIENT':          1 << 4,
		'ATTACH_RESUME':      1 << 5,
		/* Channel mode flags */
		'PRESENCE':           1 << 16,
		'PUBLISH':            1 << 17,
		'SUBSCRIBE':          1 << 18,
		'PRESENCE_SUBSCRIBE': 1 << 19
	};
	var flagNames = Utils.keysArray(flags);
	flags.MODE_ALL = flags.PRESENCE | flags.PUBLISH | flags.SUBSCRIBE | flags.PRESENCE_SUBSCRIBE;

	ProtocolMessage.prototype.hasFlag = function(flag) {
		return ((this.flags & flags[flag]) > 0);
	};

	ProtocolMessage.prototype.setFlag = function(flag) {
		return this.flags = this.flags | flags[flag];
	};

	ProtocolMessage.prototype.getMode = function() {
		return this.flags && (this.flags & flags.MODE_ALL);
	};

	ProtocolMessage.prototype.encodeModesToFlags = function(modes) {
		var self = this;
		Utils.arrForEach(modes, function(mode) {
			self.setFlag(mode);
		});
	};

	ProtocolMessage.prototype.decodeModesFromFlags = function() {
		var modes = [],
			self = this;
		Utils.arrForEach(ProtocolMessage.channelModes, function(mode) {
			if(self.hasFlag(mode)) {
				modes.push(mode);
			}
		});
		return modes.length > 0 ? modes : undefined;
	};

	ProtocolMessage.serialize = Utils.encodeBody;

	ProtocolMessage.deserialize = function(serialized, format) {
		var deserialized = Utils.decodeBody(serialized, format);
		return ProtocolMessage.fromDeserialized(deserialized);
	};

	ProtocolMessage.fromDeserialized = function(deserialized) {
		var error = deserialized.error;
		if(error) deserialized.error = ErrorInfo.fromValues(error);
		var messages = deserialized.messages;
		if(messages) for(var i = 0; i < messages.length; i++) messages[i] = Message.fromValues(messages[i]);
		var presence = deserialized.presence;
		if(presence) for(var i = 0; i < presence.length; i++) presence[i] = PresenceMessage.fromValues(presence[i], true);
		return Utils.mixin(new ProtocolMessage(), deserialized);
	};

	ProtocolMessage.fromValues = function(values) {
		return Utils.mixin(new ProtocolMessage(), values);
	};

	function toStringArray(array) {
		var result = [];
		if (array) {
			for (var i = 0; i < array.length; i++) {
				result.push(array[i].toString());
			}
		}
		return '[ ' + result.join(', ') + ' ]';
	}

	var simpleAttributes = 'id channel channelSerial connectionId connectionKey connectionSerial count msgSerial timestamp'.split(' ');

	ProtocolMessage.stringify = function(msg) {
		var result = '[ProtocolMessage';
		if(msg.action !== undefined)
			result += '; action=' + ProtocolMessage.ActionName[msg.action] || msg.action;

		var attribute;
		for (var attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
			attribute = simpleAttributes[attribIndex];
			if(msg[attribute] !== undefined)
				result += '; ' + attribute + '=' + msg[attribute];
		}

		if(msg.messages)
			result += '; messages=' + toStringArray(Message.fromValuesArray(msg.messages));
		if(msg.presence)
			result += '; presence=' + toStringArray(PresenceMessage.fromValuesArray(msg.presence));
		if(msg.error)
			result += '; error=' + ErrorInfo.fromValues(msg.error).toString();
		if(msg.auth && msg.auth.accessToken)
			result += '; token=' + msg.auth.accessToken;
		if(msg.flags)
			result += '; flags=' + Utils.arrFilter(flagNames, function(flag) {
				return msg.hasFlag(flag);
			}).join(',');
		if(msg.params) {
			var stringifiedParams = '';
			Utils.forInOwnNonNullProps(msg.params, function(prop) {
				if (stringifiedParams.length > 0) {
					stringifiedParams += '; ';
				}
				stringifiedParams += prop + '=' + msg.params[prop];
			});
			if (stringifiedParams.length > 0) {
				result += '; params=[' + stringifiedParams + ']';
			}
		}
		result += ']';
		return result;
	};

	/* Only valid for channel messages */
	ProtocolMessage.isDuplicate = function(a, b) {
		if (a && b) {
			if ((a.action === actions.MESSAGE || a.action === actions.PRESENCE) &&
				(a.action === b.action) &&
				(a.channel === b.channel) &&
				(a.id === b.id)) {
				if (a.action === actions.PRESENCE) {
					return true;
				} else if (a.messages.length === b.messages.length) {
					for (var i = 0; i < a.messages.length; i++) {
						var aMessage = a.messages[i];
						var bMessage = b.messages[i];
						if ((aMessage.extras && aMessage.extras.delta && aMessage.extras.delta.format) !==
							(bMessage.extras && bMessage.extras.delta && bMessage.extras.delta.format)) {
							return false;
						}
					}

					return true;
				}
			}
		}

		return false;
	};

	return ProtocolMessage;
})();
