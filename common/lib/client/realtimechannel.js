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
    	this.pendingSubscriptions = {};
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
    	message.payload = Message.createPayload(data);
		if(this.state == 'attached') {
			Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
    		var msg = new messagetypes.TChannelMessage();
    		msg.action = messagetypes.TAction.EVENT;
    		msg.name = name;
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
    	for(var i in messages) {
    		var message = messages[i];
    		subscriptions.emit(message.name, message);
    	}
    };

    RealtimeChannel.prototype.attach = function(callback) {
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

		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending ATTACH message');
		this.state = 'pending';
    	var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.ATTACH, channel: this.name});
    	this.sendMessage(msg, noop);
	};

    RealtimeChannel.prototype.detach = function(callback) {
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

		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending DETACH message');
    	var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.DETACH, channel: this.name});
    	this.sendMessage(msg);
	};

	var any = '*';

	RealtimeChannel.prototype.subscribe = function() {
		var args = Array.prototype.slice.call(arguments);
		var isAny = (typeof(args[0]) == 'function');
		if(isAny)
			args.unshift(any);

		var events = args[0];
		var listener = args[1];
		var callback = args[2] = (args[2] || noop);

		if(this.state == 'attached') {
			this.subscribeAttached(events, listener, callback);
			return;
		}

		if(this.state != 'pending')
			this.attach();
		var self = this;
		this.once(function(err) {
			switch(this.event) {
			case 'attached':
				self.subscribeAttached(events, listener, callback);
				break;
			case 'detached':
			case 'failed':
				callback(err || self.connectionManager.state.defaultMessage);
			}
		});
	};

	RealtimeChannel.prototype.subscribeAttached = function(events, handler, callback) {
		if(!events) {
			callback();
			return;
		}
		if(events.__proto__ !== Array.prototype) {
			this.subscribeForEvent(events, handler, callback);
			return;
		}
		for(var i = 0; i < events.length; i++) {
			this.subscribeForEvent(events[i], handler, callback);
		}
	};

	RealtimeChannel.prototype.subscribeForEvent = function(name, listener, callback) {
		/* determine if there is already a listener for this event */
		var hasListener = this.subscriptions.listeners(name===any ? null : name);
		/* if there is a listener already, nothing to do */
		if(hasListener) {
			callback();
			return;
		}

		/* send the subscription message */
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending SUBSCRIBE message');
		var pendingSubscriptions = this.pendingSubscriptions[name];
		if(!pendingSubscriptions) {
			pendingSubscriptions = [];
			this.pendingSubscriptions[name] = pendingSubscriptions;
		}
		pendingSubscriptions.push({listener: listener, callback: callback});
    	var msg = new messagetypes.TChannelMessage({
    		action: messagetypes.TAction.SUBSCRIBE,
    		channel: this.name,
    		name: name
    	});
    	this.sendMessage(msg, noop);
	};

	RealtimeChannel.prototype.unsubscribe = function() {
		var args = Array.prototype.slice.call(arguments);
		var isAny = (typeof(args[0]) == 'function');
		if(isAny)
			args.unshift(any);

		var events = args[0];
		var listener = args[1];
		var callback = args[2] = (args[2] || noop);

		if(this.state == 'attached') {
			this.unsubscribeAttached(events, listener, callback);
			return;
		}

		if(this.state != 'pending')
			this.attach();
		var self = this;
		this.once(function(err) {
			switch(this.event) {
			case 'attached':
				self.unsubscribeAttached(events, listener, callback);
				break;
			case 'detached':
			case 'failed':
				callback(err || self.connectionManager.state.defaultMessage);
			}
		});
	};

	RealtimeChannel.prototype.unsubscribeAttached = function(events, handler, callback) {
		if(!events) {
			callback();
			return;
		}
		if(events.__proto__ !== Array.prototype) {
			this.unsubscribeForEvent(events, handler, callback);
			return;
		}
		for(var i = 0; i < events.length; i++) {
			this.unsubscribeForEvent(events[i], handler, callback);
		}
	};

	RealtimeChannel.prototype.unsubscribeForEvent = function(name, listener, callback) {
		/* remove from the set of subscriptions if it's there */
		var subscriptions = this.subscriptions;
		subscriptions.off(name, listener);
		/* if there are still listeners for this event, nothing more to do */
		var hasListener = subscriptions.listeners(name===any ? null : name);
		if(hasListener) {
			callback();
			return;
		}

		/* send the unsubscription message */
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.unsubscribe()', 'sending UNSUBSCRIBE message');
    	var msg = new messagetypes.TChannelMessage({
    		action: messagetypes.TAction.UNSUBSCRIBE,
    		channel: this.name,
    		name: name
    	});
    	this.sendMessage(msg, noop);
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
		case 3: /* ERROR */
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', 'Error received: statusCode = ' + message.statusCode + '; reason = ' + message.reason);
			this.abort(UIMessages.FAIL_REASON_REFUSED);
			break;
		case 5: /* ATTACHED */
			this.setAttached(message);
			break;
		case 7: /* DETACHED */
			this.setDetached(message);
			break;
		case 9: /* SUBSCRIBED */
			this.setSubscribed(message);
			break;
		case 11: /* UNSUBSCRIBED */
			this.setUnsubscribed(message);
			break;
		case 12: /* PRESENCE */
			this.setPresence(message.presence);
			break;
		case 13: /* EVENT */
			var tMessages = message.messages;
			if(tMessages) {
				var messages = new Array(tMessages.length);
				for(var i in tMessages) {
					var tMessage = tMessages[i];
					messages[i] = new Message(
						tMessage.channelSerial,
						tMessage.timestamp,
						tMessage.name,
						Message.getPayload(tMessage.payload)
					);
				}
				this.onEvent(messages);
			}
			break;
		case 1: /* CONNECT */
		case 4: /* ATTACH */
		case 6: /* DETACH */
		case 8: /* SUBSCRIBE */
		case 10: /* UNSUBSCRIBE */
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
					for(var i in src.messages)
						dest.messages.push(src.messages[i]);
					result = true;
					break;
				case 9: /* PRESENCE */
					for(var i in src.presence)
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
				var msg = new messagetypes.TChannelMessage({action: messagetypes.TAction.EVENT, name: this.name});
				var multicaster = new Multicaster();
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + this.pendingEvents.length + ' queued messages');
				for(var i in this.pendingEvents) {
					var event = this.pendingEvents[i];
					msg.addToEvents(event.message);
					multicaster.push(event.callback);
				}
				this.sendMessage(msg, multicaster);
			}
			this.presence.setSubscribed();
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setSubscribed()', 'Unexpected exception sending pending messages: ' + e.stack);
		}
	};

	RealtimeChannel.prototype.setSubscribed = function(message) {
		var name = message.name;
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSubscribed', 'activating event; name = ' + name);
		var pendingSubscriptions = this.pendingSubscriptions[name];
		if(pendingSubscriptions) {
			var subscriptions = this.subscriptions;
			Utils.nextTick(function() {
				for(var i in pendingSubscriptions) {
					subscriptions.on(name, pendingSubscriptions[i].listener);
					pendingSubscriptions[i].callback();
				}
			});
			delete this.pendingSubscriptions[message.name];
		}
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		var oldState = this.state;
		this.state = 'detached';
		if(oldState == 'pending') {
			/* this is an error message */
			this.emit('failed', message);
		} else {
			this.emit('detached');
		}
	};

	RealtimeChannel.prototype.setUnsubscribed = function(message) {
		var name = message.name;
		var pendingSubscriptions = this.pendingSubscriptions[name];
		if(pendingSubscriptions) {
			/* this is an error message */
			Utils.nextTick(function() {
				for(var i in pendingSubscriptions)
					pendingSubscriptions[i].callback(message.reason || UIMessages.FAIL_REASON_REFUSED);
			});
			delete this.pendingSubscriptions[name];
		}
		this.subscriptions.off(name);
	};

	RealtimeChannel.prototype.setSuspended = function(connectionState) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name);
		this.state = 'detached';
		for(var i in this.pendingEvents)
			try {
				this.pendingEvents[i].callback(connectionState.defaultMessage);
			} catch(e) {}
		this.pendingEvents = [];
		this.presence.setSuspended(connectionState);
		this.emit('detached');
	};

	return RealtimeChannel;
})();
