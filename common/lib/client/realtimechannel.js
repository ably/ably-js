var RealtimeChannel = (function() {
	var actions = ProtocolMessage.Action;
	var flags = ProtocolMessage.Flag;
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
    	this.state = 'initialized';
    	this.subscriptions = new EventEmitter();
    	this.pendingEvents = [];
		this.syncChannelSerial = undefined;
		this.setOptions(options);
	}
	Utils.inherits(RealtimeChannel, Channel);

	RealtimeChannel.invalidStateError = {
		statusCode: 400,
		code: 90001,
		message: 'Channel operation failed (invalid channel state)'
	};

	RealtimeChannel.channelDetachedErr = {
		statusCode: 409,
		code: 90006,
		message: 'Channel is detached'
	};

	RealtimeChannel.prototype.setOptions = function(options, callback) {
		callback = callback || noop;
		options = this.options = Utils.prototypicalClone(defaultOptions, options);
		if(options.encrypted) {
			if(!Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
			Crypto.getCipher(options, function(err, cipher) {
				options.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, (options.cipher = null));
		}
	};

	RealtimeChannel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1],
			options = this.options;

		if(typeof(callback) !== 'function') {
			callback = noop;
			++argCount;
		}
		var connectionManager = this.connectionManager;
		if(!ConnectionManager.activeState(connectionManager.state)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(argCount == 2) {
			if(!Utils.isArray(messages))
				messages = [messages];
			messages = Message.fromValuesArray(messages);
		} else {
			messages = [Message.fromValues({name: arguments[0], data: arguments[1]})];
		}
		for(var i = 0; i < messages.length; i++)
			Message.encode(messages[i], options);

		this._publish(messages, callback);
	};

	RealtimeChannel.prototype._publish = function(messages, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
		switch(this.state) {
			case 'attached':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
				var msg = new ProtocolMessage();
				msg.action = actions.MESSAGE;
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
		this.setPendingState('attaching');
    };

    RealtimeChannel.prototype.attachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
    	var msg = ProtocolMessage.fromValues({action: actions.ATTACH, channel: this.name});
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
		this.setPendingState('detaching');
		this.setSuspended(RealtimeChannel.channelDetachedErr, true);
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.detach()', 'sending DETACH message');
    	var msg = ProtocolMessage.fromValues({action: actions.DETACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function(/* [event], listener, [callback] */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var callback = (args[2] || (args[2] = noop));
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

	RealtimeChannel.prototype.sync = function() {
		/* check preconditions */
		switch(this.state) {
			case 'initialised':
			case 'detaching':
			case 'detached':
				throw new ErrorInfo("Unable to sync to channel; not attached", 40000);
			default:
		}
		var connectionManager = this.connectionManager;
		if(!ConnectionManager.activeState(connectionManager.state))
			throw connectionManager.getStateError();

		/* send sync request */
		var syncMessage = ProtocolMessage.fromValues({action: actions.SYNC, channel: this.name});
		syncMessage.channelSerial = this.syncChannelSerial;
		connectionManager.send(syncMessage);
	};

	RealtimeChannel.prototype.sendMessage = function(msg, callback) {
		this.connectionManager.send(msg, this.options.queueEvents, callback);
	};

	RealtimeChannel.prototype.sendPresence = function(presence, callback) {
		var msg = ProtocolMessage.fromValues({
			action: actions.PRESENCE,
			channel: this.name,
			presence: [PresenceMessage.fromValues(presence)]
		});
		this.sendMessage(msg, callback);
	};

	RealtimeChannel.prototype.onMessage = function(message) {
		var syncChannelSerial;
		switch(message.action) {
		case actions.ATTACHED:
			this.setAttached(message);
			break;

		case actions.DETACHED:
			this.setDetached(message);
			break;

		case actions.SYNC:
			syncChannelSerial = this.syncChannelSerial = message.channelSerial;
		case actions.PRESENCE:
			var presence = message.presence,
				id = message.id,
				connectionId = message.connectionId,
				timestamp = message.timestamp,
				options = this.options;

			for(var i = 0; i < presence.length; i++) {
				try {
					var presenceMsg = presence[i];
					PresenceMessage.decode(presenceMsg, options);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					var errmsg = 'Unexpected error decrypting message; err = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', errmsg);
					var err = new Error(errmsg);
					this.emit('error', err);
				}
				if(!presenceMsg.connectionId) presenceMsg.connectionId = connectionId;
				if(!presenceMsg.timestamp) presenceMsg.timestamp = timestamp;
				if(!presenceMsg.id) presenceMsg.id = id + ':' + i;
			}
			this.presence.setPresence(presence, true, syncChannelSerial);
			break;

		case actions.MESSAGE:
			var messages = message.messages,
				id = message.id,
				connectionId = message.connectionId,
				timestamp = message.timestamp,
				options = this.options;

			for(var i = 0; i < messages.length; i++) {
				try {
					var msg = messages[i];
					Message.decode(msg, options);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					var errmsg = 'Unexpected error decrypting message; err = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', errmsg);
					var err = new Error(errmsg);
					this.emit('error', err);
				}
				if(!msg.connectionId) msg.connectionId = connectionId;
				if(!msg.timestamp) msg.timestamp = timestamp;
				if(!msg.id) msg.id = id + ':' + i;
			}
			this.onEvent(messages);
			break;

		case actions.ERROR:
			/* there was a channel-specific error */
			var err = message.error;
			if(err && err.code == 80016) {
				/* attach/detach operation attempted on superseded transport handle */
				this.checkPendingState();
			} else {
				this.setDetached(message);
			}
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
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setAttached', 'activating channel; name = ' + this.name + '; message flags = ' + message.flags);
		this.clearStateTimer();

		/* update any presence included with this message */
		if(message.presence)
			this.presence.setPresence(message.presence, false);

		/* ensure we don't transition multiple times */
		if(this.state != 'attaching')
			return;

		this.state = 'attached';
		var pendingEvents = this.pendingEvents, pendingCount = pendingEvents.length;
		if(pendingCount) {
			this.pendingEvents = [];
			var msg = ProtocolMessage.fromValues({action: actions.MESSAGE, channel: this.name, messages: []});
			var multicaster = Multicaster();
			Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + pendingCount + ' queued messages');
			for(var i = 0; i < pendingCount; i++) {
				var event = pendingEvents[i];
				Array.prototype.push.apply(msg.messages, event.messages);
				multicaster.push(event.callback);
			}
			this.sendMessage(msg, multicaster);
		}
		if((message.flags & ( 1 << flags.HAS_PRESENCE)) > 0)
			this.presence.awaitSync();
		this.presence.setAttached();
		this.emit('attached');
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		this.clearStateTimer();

		var msgErr = message.error;
		if(msgErr) {
			/* this is an error message */
			this.state = 'failed';
			var err = {statusCode: msgErr.statusCode, code: msgErr.code, message: msgErr.message};
			this.failPendingMessages(err);
			this.emit('failed', err);
		} else {
			this.failPendingMessages({statusCode: 404, code: 90001, message: 'Channel detached'});
			if(this.state !== 'detached') {
				this.state = 'detached';
				this.emit('detached');
			}
		}
	};

	RealtimeChannel.prototype.setSuspended = function(err, suppressEvent) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name + ', err ' + (err ? err.message : 'none'));
		this.clearStateTimer();
		this.failPendingMessages(err);
		this.presence.setSuspended(err);
		if (!suppressEvent)
			this.emit('detached');
	};

	RealtimeChannel.prototype.setPendingState = function(state) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'name = ' + this.name + ', state = ' + state);
		this.state = state;
		this.clearStateTimer();

		/* if not currently connected, do nothing */
		if(this.connectionManager.state.state != 'connected') {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'not connected');
			return;
		}

		/* send the event and await response */
		this.checkPendingState();

		/* set a timer to handle no response */
		var self = this;
		this.stateTimer = setTimeout(function() {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'timer expired');
			self.stateTimer = null;
			/* retry */
			self.checkPendingState();
		}, Defaults.sendTimeout)
	};

	RealtimeChannel.prototype.checkPendingState = function() {
		var result = false;
		switch(this.state) {
			case 'attaching':
				this.attachImpl();
				result = true;
				break;
			case 'detaching':
				this.detachImpl();
				result = true;
				break;
			case 'attached':
				/* resume any sync operation that was in progress */
				this.sync();
			default:
				break;
		}
		return result;
	};

	RealtimeChannel.prototype.clearStateTimer = function() {
		var stateTimer = this.stateTimer;
		if(stateTimer) {
			clearTimeout(stateTimer);
			this.stateTimer = null;
		}
	};

	RealtimeChannel.prototype.failPendingMessages = function(err) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.failPendingMessages', 'channel; name = ' + this.name + ', err = ' + Utils.inspectError(err));
		for(var i = 0; i < this.pendingEvents.length; i++)
			try {
				this.pendingEvents[i].callback(err);
			} catch(e) {}
		this.pendingEvents = [];
	};

	return RealtimeChannel;
})();
