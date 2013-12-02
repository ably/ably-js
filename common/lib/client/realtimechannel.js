var RealtimeChannel = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;
	var noop = function() {};

	var defaultOptions = {
		queueEvents: true
	};

	/* public constructor */
	function RealtimeChannel(realtime, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel()', 'started; name = ' + name);
		Channel.call(this, realtime, name, options);
    	this.presence = new Presence(this, options);
    	this.connectionManager = realtime.connection.connectionManager;
    	this.options = Utils.prototypicalClone(defaultOptions, options);
    	this.state = 'initialized';
    	this.subscriptions = new EventEmitter();
    	this.pendingEvents = [];
	}
	Utils.inherits(RealtimeChannel, Channel);

	RealtimeChannel.invalidStateError = {
		statusCode: 400,
		code: 90001,
		reason: 'Channel operation failed (invalid channel state)'
	};

	RealtimeChannel.prototype.setOptions = function(channelOpts, callback) {
		callback = callback || noop;
		if(channelOpts && channelOpts.encrypted) {
			var self = this;
			Crypto.getCipher(channelOpts, function(err, cipher) {
				self.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, this.cipher = null);
		}
	};

	RealtimeChannel.prototype.publish = function() {
		var connectionManager = this.connectionManager;
		if(!ConnectionManager.activeState(connectionManager.state)) {
			callback(connectionManager.getStateError());
			return;
		}
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1];
		if(typeof(callback) !== 'function') {
			callback = noop;
			++argCount;
		}
		if(argCount == 2) {
			if(!Utils.isArray(messages))
				messages = [messages];
			var tMessages = new Array(messages.length);
			for(var i = 0; i < messages.length; i++) {
				var message = messages[i];
				var tMessage = tMessages[i] = new messagetypes.TMessage();
				tMessage.name = message.name;
				tMessage.data = Data.toTData(message.data);
			}
			messages = tMessages;
		} else {
			var message = new messagetypes.TMessage();
			message.name = arguments[0];
			message.data = Data.toTData(arguments[1]);
			messages = [message];
		}
		var cipher = this.cipher;
		if(cipher) {
			for(var i = 0; i < messages.length; i++)
				Message.encrypt(messages[i], cipher);
		}
		this._publish(messages, callback);
	};

	RealtimeChannel.prototype._publish = function(messages, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
		switch(this.state) {
			case 'attached':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
				var msg = new messagetypes.TProtocolMessage();
				msg.action = messagetypes.TAction.MESSAGE;
				msg.channel = this.name;
				msg.messages = messages;
				this.sendMessage(msg, callback);
				break;
			default:
				this.attach();
			case 'attaching':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'queueing message');
				this.pendingEvents.push({messages: messages, callback: callback});
				break;
		}
	};

	RealtimeChannel.prototype.onEvent = function(messages) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.onEvent()', 'received message');
		var subscriptions = this.subscriptions;
    	for(var i = 0; i < messages.length; i++) {
    		var message = messages[i];
    		subscriptions.emit(message.name, message);
    	}
    };

    RealtimeChannel.prototype.attach = function(callback) {
    	callback = callback || noop;
    	var connectionManager = this.connectionManager;
    	var connectionState = connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(this.state == 'attached') {
			callback();
			return;
		}
		if(this.state == 'failed') {
			callback(connectionManager.getStateError());
			return;
		}
		this.once(function(err) {
			switch(this.event) {
			case 'attached':
				callback();
				break;
			case 'detached':
			case 'failed':
				callback(err || connectionManager.getStateError());
			}
		});
		this.attachImpl();
    };

    RealtimeChannel.prototype.attachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
		this.state = 'attaching';
    	var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.ATTACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

    RealtimeChannel.prototype.detach = function(callback) {
    	callback = callback || noop;
    	var connectionManager = this.connectionManager;
    	var connectionState = connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(this.state == 'detached') {
			callback();
			return;
		}
		this.setSuspended();
		this.once(function(err) {
			switch(this.event) {
			case 'detached':
				callback();
				break;
			case 'attached':
				/* this shouldn't happen ... */
				callback(ConnectionError.unknownChannelErr);
				break;
			case 'failed':
				callback(err || connectionManager.getStateError());
				break;
			}
		});
		this.detachImpl();
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending DETACH message');
		this.state = 'detaching';
    	var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.DETACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function(/* [event], listener */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var callback = args[2] = (args[2] || noop);
		var subscriptions = this.subscriptions;

		if(event === null || !Utils.isArray(event))
			subscriptions.on(event, listener);
		else
			for(var i = 0; i < event.length; i++)
				subscriptions.on(event[i], listener);

		this.attach(callback);
	};

	RealtimeChannel.prototype.unsubscribe = function(/* [event], listener */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var subscriptions = this.subscriptions;

		if(event === null || !Utils.isArray(event))
			subscriptions.off(event, listener);
		else
			for(var i = 0; i < event.length; i++)
				subscriptions.off(event[i], listener);
	};

	RealtimeChannel.prototype.sendMessage = function(msg, callback) {
		this.connectionManager.send(msg, this.options.queueEvents, callback);
	};

	RealtimeChannel.prototype.sendPresence = function(presence, callback) {
		var msg = new messagetypes.TProtocolMessage({
			action: messagetypes.TAction.PRESENCE,
			channel: this.name,
			presence: [presence]
		});
		this.sendMessage(msg, callback);
	};

	RealtimeChannel.prototype.onMessage = function(message) {
		switch(message.action) {
		case actions.ATTACHED:
			this.setAttached(message);
			break;
		case actions.DETACHED:
			this.setDetached(message);
			break;
		case actions.PRESENCE:
			this.presence.setPresence(message.presence, true);
			break;
		case actions.MESSAGE:
			var tMessages = message.messages;
			if(tMessages) {
				var messages = new Array(tMessages.length),
					cipher = this.cipher;
				for(var i = 0; i < messages.length; i++) {
					var tMessage = tMessages[i];
					if(cipher) {
						try {
							Message.decrypt(tMessage, cipher);
						} catch(e) {
							/* decrypt failed .. the most likely cause is that we have the wrong key */
							var msg = 'Unexpected error decrypting message; err = ' + e;
							Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', msg);
							var err = new Error(msg);
							this.emit('error', err);
						}
					}
					messages[i] = new Message(
						tMessage.channelSerial,
						tMessage.timestamp,
						tMessage.name,
						Data.fromTData(tMessage.data)
					);
				}
				this.onEvent(messages);
			}
			break;
		case actions.ERROR:
			/* there was a channel-specific error */
			this.setDetached(message);
			break;
		default:
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', 'Fatal protocol error: unrecognised action (' + message.action + ')');
			this.connectionManager.abort(ConnectionError.unknownChannelErr);
		}
	};

	RealtimeChannel.mergeTo = function(dest, src) {
		var result = false;
		var action;
		if(dest.channel == src.channel) {
			if((action = dest.action) == src.action) {
				switch(action) {
				case actions.MESSAGE:
					for(var i = 0; i < src.messages.length; i++)
						dest.messages.push(src.messages[i]);
					result = true;
					break;
				case actions.PRESENCE:
					for(var i = 0; i < src.presence.length; i++)
						dest.presence.push(src.presence[i]);
					result = true;
					break;
				default:
				}
			}
		}
		return result;
	};

	RealtimeChannel.prototype.setAttached = function(message) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setAttached', 'activating channel; name = ' + this.name);
		/* update any presence included with this message */
		if(message.presence)
			this.presence.setPresence(message.presence, false);

		/* ensure we don't transition multiple times */
		if(this.state != 'attaching')
			return;

		this.state = 'attached';
		this.emit('attached');
		try {
			if(this.pendingEvents.length) {
				var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.MESSAGE, channel: this.name, messages: []});
				var multicaster = new Multicaster();
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + this.pendingEvents.length + ' queued messages');
				for(var i = 0; i < this.pendingEvents.length; i++) {
					var event = this.pendingEvents[i];
					Array.prototype.push.apply(msg.messages, event.messages);
					multicaster.push(event.callback);
				}
				this.sendMessage(msg, multicaster);
			}
			this.presence.setAttached();
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setAttached()', 'Unexpected exception sending pending messages: ' + e.stack);
		}
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		var msgErr = message.error;
		if(msgErr) {
			/* this is an error message */
			this.state = 'failed';
			var err = {statusCode: msgErr.statusCode, code: msgErr.code, reason: msgErr.reason};
			this.emit('failed', err);
		} else if (this.state !== 'detached') {
			this.state = 'detached';
			this.emit('detached');
		}
	};

	RealtimeChannel.prototype.setSuspended = function() {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name);
		this.state = 'detached';
		for(var i = 0; i < this.pendingEvents.length; i++)
			try {
				this.pendingEvents[i].callback(new Error('Channel is detached'));
			} catch(e) {}
		this.pendingEvents = [];
		this.presence.setSuspended();
		this.emit('detached');
	};

	return RealtimeChannel;
})();
