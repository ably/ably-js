var RealtimeChannel = (function() {
	var actions = ProtocolMessage.Action;
	var noop = function() {};
	var statechangeOp = 'statechange';
	var syncOp = 'sync';

	/* public constructor */
	function RealtimeChannel(realtime, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel()', 'started; name = ' + name);
		Channel.call(this, realtime, name, options);
		this.realtime = realtime;
		this.presence = new RealtimePresence(this, realtime.options);
		this.connectionManager = realtime.connection.connectionManager;
		this.state = 'initialized';
		this.subscriptions = new EventEmitter();
		this.syncChannelSerial = undefined;
		this.attachSerial = undefined;
		this.setOptions(options);
		this.errorReason = null;
		this._requestedFlags = null;
		this._mode = null;
	}
	Utils.inherits(RealtimeChannel, Channel);

	RealtimeChannel.invalidStateError = function(state) {
		return {
			statusCode: 400,
			code: 90001,
			message: 'Channel operation failed as channel state is ' + state
		};
	};

	RealtimeChannel.progressOps = {
		statechange: statechangeOp,
		sync: syncOp
	};

	RealtimeChannel.processListenerArgs = function(args) {
		/* [event], listener, [callback] */
		args = Array.prototype.slice.call(args);
		if(typeof args[0] === 'function') {
			args.unshift(null);
		}
		if(args[args.length - 1] == undefined) {
			args.pop();
		}
		return args;
	};

	RealtimeChannel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1];

		if(typeof(callback) !== 'function') {
			if(Platform.promisify) {
				return Platform.promisify(this.publish).apply(this, arguments);
			}
			callback = noop;
			++argCount;
		}
		if(!this.connectionManager.activeState()) {
			callback(this.connectionManager.getStateError());
			return;
		}
		if(argCount == 2) {
			if(Utils.isObject(messages))
				messages = [Message.fromValues(messages)];
			else if(Utils.isArray(messages))
				messages = Message.fromValuesArray(messages);
			else
				throw new ErrorInfo('The single-argument form of publish() expects a message object or an array of message objects', 40013, 400);
		} else {
			messages = [Message.fromValues({name: arguments[0], data: arguments[1]})];
		}
		var options = this.channelOptions;
		var self = this;
		Message.encodeArray(messages, options, function(err) {
			if (err) {
				callback(err);
				return;
			}
			self._publish(messages, callback);
		});
	};

	RealtimeChannel.prototype._publish = function(messages, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
		var state = this.state;
		switch(state) {
			case 'failed':
			case 'suspended':
				callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError(state)));
				break;
			default:
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message; channel state is ' + state);
				var msg = new ProtocolMessage();
				msg.action = actions.MESSAGE;
				msg.channel = this.name;
				msg.messages = messages;
				this.sendMessage(msg, callback);
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

	RealtimeChannel.prototype.attach = function(flags, callback) {
		if(typeof(flags) === 'function') {
			callback = flags;
			flags = null;
		}
		if(!callback) {
			if(Platform.promisify) {
				return Platform.promisify(this.attach).apply(this, arguments);
			}
			callback = function(err) {
				if(err) {
					Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.attach()', 'Channel attach failed: ' + err.toString());
				}
			}
		}
		if(flags) {
			this._requestedFlags = flags;
		}
		var connectionManager = this.connectionManager;
		if(!connectionManager.activeState()) {
			callback(connectionManager.getStateError());
			return;
		}
		switch(this.state) {
			case 'attached':
				/* If flags requested, always do a re-attach. TODO only do this if if
				* current mode differs from requested mode */
				if(!flags) {
					callback();
					break;
				} /* else fallthrough */
			default:
				this.requestState('attaching');
			case 'attaching':
				this.once(function(stateChange) {
					switch(this.event) {
						case 'attached':
							callback();
							break;
						case 'detached':
						case 'suspended':
						case 'failed':
							callback(stateChange.reason || connectionManager.getStateError());
					}
				});
			}
    };

	RealtimeChannel.prototype.attachImpl = function() {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
		this.setInProgress(statechangeOp, true);
		var attachMsg = ProtocolMessage.fromValues({action: actions.ATTACH, channel: this.name});
		if(this._requestedFlags) {
			Utils.arrForEach(this._requestedFlags, function(flag) {
				attachMsg.setFlag(flag);
			})
		}
		this.sendMessage(attachMsg, noop);
	};

	RealtimeChannel.prototype.detach = function(callback) {
		if(!callback) {
			if(Platform.promisify) {
				return Platform.promisify(this.detach).apply(this, arguments);
			}
			callback = noop;
		}
		callback = callback || noop;
		var connectionManager = this.connectionManager;
		if(!connectionManager.activeState()) {
			callback(connectionManager.getStateError());
			return;
		}
		switch(this.state) {
			case 'detached':
			case 'failed':
				callback();
				break;
			default:
				this.requestState('detaching');
			case 'detaching':
				this.once(function(stateChange) {
					switch(this.event) {
						case 'detached':
							callback();
							break;
						case 'failed':
						case 'attached':
							callback(stateChange.reason || connectionManager.getStateError());
							break;
						default:
							/* this shouldn't happen ... */
							callback(ConnectionError.unknownChannelErr);
							break;
					}
				});
		}
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.detach()', 'sending DETACH message');
		this.setInProgress(statechangeOp, true);
		var msg = ProtocolMessage.fromValues({action: actions.DETACH, channel: this.name});
		this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function(/* [event], listener, [callback] */) {
		var args = RealtimeChannel.processListenerArgs(arguments);
		var event = args[0];
		var listener = args[1];
		var callback = args[2];
		var subscriptions = this.subscriptions;
		var events;

		if(!callback) {
			if(Platform.promisify) {
				return Platform.promisify(this.subscribe).call(this, event, listener);
			}
			callback = noop;
		}

		if(this.state === 'failed') {
			callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError('failed')));
			return;
		}

		subscriptions.on(event, listener);

		return this.attach(callback);
	};

	RealtimeChannel.prototype.unsubscribe = function(/* [event], listener, [callback] */) {
		var args = RealtimeChannel.processListenerArgs(arguments);
		var event = args[0];
		var listener = args[1];
		var callback = args[2];
		var subscriptions = this.subscriptions;
		var events;

		if(!callback) {
			if(Platform.promisify) {
				return Platform.promisify(this.unsubscribe).call(this, event, listener);
			}
			callback = noop;
		}

		if(this.state === 'failed') {
			callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError('failed')));
			return;
		}

		subscriptions.off(event, listener);
		callback();
	};

	RealtimeChannel.prototype.sync = function() {
		/* check preconditions */
		switch(this.state) {
			case 'initialized':
			case 'detaching':
			case 'detached':
				throw new ErrorInfo("Unable to sync to channel; not attached", 40000);
			default:
		}
		var connectionManager = this.connectionManager;
		if(!connectionManager.activeState()) {
			throw connectionManager.getStateError();
		}

		/* send sync request */
		var syncMessage = ProtocolMessage.fromValues({action: actions.SYNC, channel: this.name});
		if(this.syncChannelSerial) {
			syncMessage.channelSerial = this.syncChannelSerial;
		}
		connectionManager.send(syncMessage);
	};

	RealtimeChannel.prototype.sendMessage = function(msg, callback) {
		this.connectionManager.send(msg, this.realtime.options.queueMessages, callback);
	};

	RealtimeChannel.prototype.sendPresence = function(presence, callback) {
		var msg = ProtocolMessage.fromValues({
			action: actions.PRESENCE,
			channel: this.name,
			presence: (Utils.isArray(presence) ?
				PresenceMessage.fromValuesArray(presence) :
				[PresenceMessage.fromValues(presence)])
		});
		this.sendMessage(msg, callback);
	};

	RealtimeChannel.prototype.onMessage = function(message) {
		var syncChannelSerial, isSync = false;
		switch(message.action) {
		case actions.ATTACHED:
			this.attachSerial = message.channelSerial;
			this._mode = message.getMode();
			if(this.state === 'attached') {
				if(!message.hasFlag('RESUMED')) {
					/* On a loss of continuity, the presence set needs to be re-synced */
					this.presence.onAttached(message.hasFlag('HAS_PRESENCE'))
					var change = new ChannelStateChange(this.state, this.state, false, message.error);
					this.emit('update', change);
				}
			} else {
				this.notifyState('attached', message.error, message.hasFlag('RESUMED'), message.hasFlag('HAS_PRESENCE'));
			}
			break;

		case actions.DETACHED:
			var err = message.error ? ErrorInfo.fromValues(message.error) : new ErrorInfo('Channel detached', 90001, 404);
			if(this.state === 'detaching') {
				this.notifyState('detached', err);
			} else if(this.state === 'attaching') {
				/* Only retry immediately if we were previously attached. If we were
				 * attaching, go into suspended, fail messages, and wait a few seconds
				 * before retrying */
				this.notifyState('suspended', err);
			} else {
				this.requestState('attaching', err);
			}
			break;

		case actions.SYNC:
			/* syncs can have channelSerials, but might not if the sync is one page long */
			isSync = true;
			syncChannelSerial = this.syncChannelSerial = message.channelSerial;
			/* syncs can happen on channels with no presence data as part of connection
			 * resuming, in which case protocol message has no presence property */
			if(!message.presence) break;
		case actions.PRESENCE:
			var presence = message.presence,
				id = message.id,
				connectionId = message.connectionId,
				timestamp = message.timestamp;

			var options = this.channelOptions;
			for(var i = 0; i < presence.length; i++) {
				try {
					var presenceMsg = presence[i];
					PresenceMessage.decode(presenceMsg, options);
				} catch (e) {
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', e.toString());
				}
				if(!presenceMsg.connectionId) presenceMsg.connectionId = connectionId;
				if(!presenceMsg.timestamp) presenceMsg.timestamp = timestamp;
				if(!presenceMsg.id) presenceMsg.id = id + ':' + i;
			}
			this.presence.setPresence(presence, isSync, syncChannelSerial);
			break;

		case actions.MESSAGE:
			var messages = message.messages,
				id = message.id,
				connectionId = message.connectionId,
				timestamp = message.timestamp;

			var options = this.channelOptions;
			for(var i = 0; i < messages.length; i++) {
				try {
					var msg = messages[i];
					Message.decode(msg, options);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', e.toString());
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
				this.notifyState('failed', ErrorInfo.fromValues(err));
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

	RealtimeChannel.prototype.onAttached = function() {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.onAttached', 'activating channel; name = ' + this.name);
	};

	RealtimeChannel.prototype.notifyState = function(state, reason, resumed, hasPresence) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.notifyState', 'name = ' + this.name + ', current state = ' + this.state + ', notifying state ' + state);
		this.clearStateTimer();

		if(state === this.state) {
			return;
		}
		this.presence.actOnChannelState(state, hasPresence, reason);
		if(state === 'suspended' && this.connectionManager.state.sendEvents) {
			this.startRetryTimer();
		} else {
			this.cancelRetryTimer();
		}
		if(reason) {
			this.errorReason = reason;
		}
		var change = new ChannelStateChange(this.state, state, resumed, reason);
		var logLevel = state === 'failed' ? Logger.LOG_ERROR : Logger.LOG_MAJOR;
		Logger.logAction(logLevel, 'Channel state for channel "' + this.name + '"', state + (reason ? ('; reason: ' + reason) : ''));

		/* Note: we don't set inProgress for pending states until the request is actually in progress */
		if(state === 'attached') {
			this.onAttached();
			this.setInProgress(syncOp, hasPresence);
			this.setInProgress(statechangeOp, false);
		} else if(state === 'detached' || state === 'failed' || state === 'suspended') {
			this.setInProgress(statechangeOp, false);
			this.setInProgress(syncOp, false);
		}

		this.state = state;
		this.emit(state, change);
	};

	RealtimeChannel.prototype.requestState = function(state, reason) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.requestState', 'name = ' + this.name + ', state = ' + state);
		this.notifyState(state, reason);
		/* send the event and await response */
		this.checkPendingState();
	};

	RealtimeChannel.prototype.checkPendingState = function() {
		/* if can't send events, do nothing */
		var cmState = this.connectionManager.state;
		/* Allow attach messages to queue up when synchronizing, since this will be
		 * the state we'll be in when upgrade transport.active triggers a checkpendingstate */
		if(!(cmState.sendEvents || cmState.forceQueueEvents)) {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.checkPendingState', 'sendEvents is false; state is ' + this.connectionManager.state.state);
			return;
		}

		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.checkPendingState', 'name = ' + this.name + ', state = ' + this.state);
		/* Only start the state timer running when actually sending the event */
		switch(this.state) {
			case 'attaching':
				this.startStateTimerIfNotRunning();
				this.attachImpl();
				break;
			case 'detaching':
				this.startStateTimerIfNotRunning();
				this.detachImpl();
				break;
			case 'attached':
				/* resume any sync operation that was in progress */
				this.sync();
			default:
				break;
		}
	};

	RealtimeChannel.prototype.timeoutPendingState = function() {
		switch(this.state) {
			case 'attaching':
				var err = new ErrorInfo('Channel attach timed out', 90007, 408);
				this.notifyState('suspended', err);
				break;
			case 'detaching':
				var err = new ErrorInfo('Channel detach timed out', 90007, 408);
				this.notifyState('attached', err);
				break;
			default:
				this.checkPendingState();
				break;
		}
	};

	RealtimeChannel.prototype.startStateTimerIfNotRunning = function() {
		var self = this;
		if(!this.stateTimer) {
			this.stateTimer = setTimeout(function() {
				Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.startStateTimerIfNotRunning', 'timer expired');
				self.stateTimer = null;
				self.timeoutPendingState();
			}, this.realtime.options.timeouts.realtimeRequestTimeout);
		}
	};

	RealtimeChannel.prototype.clearStateTimer = function() {
		var stateTimer = this.stateTimer;
		if(stateTimer) {
			clearTimeout(stateTimer);
			this.stateTimer = null;
		}
	};

	RealtimeChannel.prototype.startRetryTimer = function() {
		var self = this;
		if(this.retryTimer) return;

		this.retryTimer = setTimeout(function() {
			/* If connection is not connected, just leave in suspended, a reattach
			 * will be triggered once it connects again */
			if(self.state === 'suspended' && self.connectionManager.state.sendEvents) {
				self.retryTimer = null;
				Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel retry timer expired', 'attempting a new attach');
				self.requestState('attaching');
			}
		}, this.realtime.options.timeouts.channelRetryTimeout);
	};

	RealtimeChannel.prototype.cancelRetryTimer = function() {
		if(this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.suspendTimer = null;
		}
	};

	RealtimeChannel.prototype.setInProgress = function(operation, value) {
		this.rest.channels.setInProgress(this, operation, value);
	};

	RealtimeChannel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.history()', 'channel = ' + this.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}

		if(params && params.untilAttach) {
			if(this.state !== 'attached') {
				callback(new ErrorInfo("option untilAttach requires the channel to be attached", 40000, 400));
				return;
			}
			if(!this.attachSerial) {
				callback(new ErrorInfo("untilAttach was specified and channel is attached, but attachSerial is not defined", 40000, 400));
				return;
			}
			delete params.untilAttach;
			params.from_serial = this.attachSerial;
		}

		Channel.prototype._history.call(this, params, callback);
	};

	RealtimeChannel.prototype.whenState = function(state, listener) {
		EventEmitter.prototype.whenState.call(this, state, this.state, listener);
	}

	return RealtimeChannel;
})();
