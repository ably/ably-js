var RealtimeChannel = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
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

	RealtimeChannel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'name = ' + name);
    	var connectionState = this.connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionState.defaultMessage);
			return;
		}
    	var message = new messagetypes.TMessage();
    	message.name = name;
    	message.data = Message.createPayload(data);
		if(this.state == 'attached') {
			Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
    		var msg = new messagetypes.TChannelMessage();
    		msg.action = messagetypes.TAction.EVENT;
    		msg.channel = this.name;
    		msg.messages = [message];
    		this.sendMessage(msg, callback);
    		return;
		}
		if(this.state != 'pending') {
			this.attach();
		}
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'queueing message');
		this.pendingEvents.push({message: message, listener: callback});
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
			callback(connectionState.defaultMessage);
			return;
		}
		if(this.state == 'attached') {
			callback();
			return;
		}
		if(this.state == 'failed') {
			callback(connectionState.defaultMessage);
			return;
		}
		this.once(function(err) {
			switch(this.event) {
			case 'attached':
				callback();
				break;
			case 'detached':
			case 'failed':
				callback(err || connectionManager.state.defaultMessage);
			}
		});
		this.attachImpl();
    };

    RealtimeChannel.prototype.attachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
		this.state = 'pending';
    	var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.ATTACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

    RealtimeChannel.prototype.detach = function(callback) {
    	callback = callback || noop;
    	var connectionManager = this.connectionManager;
    	var connectionState = connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionState.defaultMessage);
			return;
		}
		if(this.state == 'detached') {
			callback();
			return;
		}
		this.once(function(err) {
			switch(this.event) {
			case 'detached':
				callback();
				break;
			case 'attached':
				/* this shouldn't happen ... */
				callback(UIMessages.FAIL_REASON_UNKNOWN);
				break;
			case 'failed':
				callback(err || connectionManager.state.defaultMessage);
				break;
			}
		});
		this.detachImpl();
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending DETACH message');
    	var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.DETACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function() {
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

	RealtimeChannel.prototype.unsubscribe = function() {
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
		var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.PRESENCE, name: name});
		this.sendMessage(msg, callback);
	};

	RealtimeChannel.prototype.onMessage = function(message) {
		switch(message.action) {
		case 5: /* ATTACHED */
			this.setAttached(message);
			break;
		case 7: /* DETACHED */
			this.setDetached(message);
			break;
		case 12: /* PRESENCE */
			this.setPresence(message.presence);
			break;
		case 13: /* EVENT */
			var tMessages = message.messages;
			if(tMessages) {
				var messages = new Array(tMessages.length);
				for(var i = 0; i < messages.length; i++) {
					var tMessage = tMessages[i];
					messages[i] = new Message(
						tMessage.channelSerial,
						tMessage.timestamp,
						tMessage.name,
						Message.getPayload(tMessage.data)
					);
				}
				this.onEvent(messages);
			}
			break;
		case 1: /* CONNECT */
		case 4: /* ATTACH */
		case 6: /* DETACH */
		default:
			Logger.logAction(Logger.LOG_ERROR, 'Transport.onChannelMessage()', 'Fatal protocol error: unrecognised action (' + message.action + ')');
			this.abort(UIMessages.FAIL_REASON_FAILED);
		}
	};

	RealtimeChannel.mergeTo = function(dest, src) {
		var result = false;
		var action;
		if(dest.channel == src.channel) {
			if((action = dest.action) == src.action) {
				switch(action) {
				case 10: /* EVENT */
					for(var i = 0; i < src.messages.length; i++)
						dest.messages.push(src.messages[i]);
					result = true;
					break;
				case 9: /* PRESENCE */
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
		this.state = 'attached';
		if(message.presence)
			this.presence.setPresence(message.presence, false);

		this.emit('attached');
		try {
			if(this.pendingEvents.length) {
				var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.EVENT, channel: this.name, messages: []});
				var multicaster = new Multicaster();
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + this.pendingEvents.length + ' queued messages');
				for(var i = 0; i < this.pendingEvents.length; i++) {
					var event = this.pendingEvents[i];
					msg.messages.push(event.message);
					multicaster.push(event.callback);
				}
				this.sendMessage(msg, multicaster);
			}
			this.presence.setAttached();
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setSubscribed()', 'Unexpected exception sending pending messages: ' + e.stack);
		}
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		if(message.code) {
			/* this is an error message */
			this.state = 'failed';
			var err = {statusCode: message.statusCode, code: message.code, reason: message.reason};
			this.emit('failed', err);
		} else {
			this.state = 'detached';
			this.emit('detached');
		}
	};

	RealtimeChannel.prototype.setSuspended = function(connectionState) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name);
		this.state = 'detached';
		for(var i = 0; i < this.pendingEvents.length; i++)
			try {
				this.pendingEvents[i].callback(connectionState.defaultMessage);
			} catch(e) {}
		this.pendingEvents = [];
		this.presence.setSuspended(connectionState);
		this.emit('detached');
	};

	return RealtimeChannel;
})();
