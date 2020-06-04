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
		this.properties = {
			attachSerial: undefined
		};
		this.setOptions(options);
		this.errorReason = null;
		this._requestedFlags = null;
		this._mode = null;
		/* Temporary; only used for the checkChannelsOnResume option */
		this._attachedMsgIndicator = false;
		this._attachResume = false;
		this._decodingContext = {
			channelOptions: this.channelOptions,
			plugins: realtime.options.plugins || { },
			baseEncodedPreviousPayload: undefined
		};
		this._lastPayload = {
			messageId: null,
			protocolMessageChannelSerial: null,
			decodeFailureRecoveryInProgress: null
		};
		/* Only differences between this and the public event emitter is that this emits an
		 * update event for all ATTACHEDs, whether resumed or not */
		this._allChannelChanges = new EventEmitter();
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

	RealtimeChannel.prototype.setOptions = function(options, callback) {
		if(!callback) {
			if (this.rest.options.promises) {
				return Utils.promisify(this, 'setOptions', arguments);
			}

			callback = function(err){
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setOptions()', 'Set options failed: ' + err.toString());
				}
			};
		}
		var err = validateChannelOptions(options);
		if(err) {
			callback(err);
			return;
		}
		Channel.prototype.setOptions.call(this, options);
		if (this._decodingContext)
			this._decodingContext.channelOptions = this.channelOptions;
		if(this._shouldReattachToSetOptions(options)) {
			/* This does not just do _attach(true, null, callback) because that would put us
			 * into the 'attaching' state until we receive the new attached, which is
			 * conceptually incorrect: we are still attached, we just have a pending request to
			 * change some channel params. Per RTL17 going into the attaching state would mean
			 * rejecting messages until we have confirmation that the options have changed,
			 * which would unnecessarily lose message continuity. */
			this.attachImpl();
			this._allChannelChanges.once(function(stateChange) {
				switch(this.event) {
					case 'update':
					case 'attached':
						callback(null);
						return;
					default:
						callback(stateChange.reason);
						return;
				}
			});
		} else {
			callback();
		}
	};

	function validateChannelOptions(options) {
		if(options && 'params' in options && !Utils.isObject(options.params)) {
			return new ErrorInfo('options.params must be an object', 40000, 400);
		}
		if(options && 'modes' in options){
			if(!Utils.isArray(options.modes)){
				return new ErrorInfo('options.modes must be an array', 40000, 400);
			}
			for(var i = 0; i < options.modes.length; i++){
				var currentMode = options.modes[i];
				if(!currentMode || typeof currentMode !== 'string' || !Utils.arrIn(ProtocolMessage.channelModes, String.prototype.toUpperCase.call(currentMode))){
					return new ErrorInfo('Invalid channel mode: ' + currentMode, 40000, 400);
				}
			}
		}
	}

	RealtimeChannel.prototype._shouldReattachToSetOptions = function(options) {
		return (this.state === 'attached' || this.state === 'attaching') && (options.params || options.modes);
	};

	RealtimeChannel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1];

		if(typeof(callback) !== 'function') {
			if(this.realtime.options.promises) {
				return Utils.promisify(this, 'publish', arguments);
			}
			callback = noop;
			++argCount;
		}
		if(!this.connectionManager.activeState()) {
			callback(this.connectionManager.getError());
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
		var self = this,
			maxMessageSize = this.realtime.options.maxMessageSize;
		Message.encodeArray(messages, this.channelOptions, function(err) {
			if (err) {
				callback(err);
				return;
			}
			/* RSL1i */
			var size = Message.getMessagesSize(messages);
			if(size > maxMessageSize) {
				callback(new ErrorInfo('Maximum size of messages that can be published at once exceeded ( was ' + size + ' bytes; limit is ' + maxMessageSize + ' bytes)', 40009, 400));
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
			if(this.realtime.options.promises) {
				return Utils.promisify(this, 'attach', arguments);
			}
			callback = function(err) {
				if(err) {
					Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.attach()', 'Channel attach failed: ' + err.toString());
				}
			}
		}
		if(flags) {
			Logger.deprecated('channel.attach() with flags', 'channel.setOptions() with channelOptions.params');
			/* If flags requested, always do a re-attach. TODO only do this if
			 * current mode differs from requested mode */
			this._requestedFlags = flags;
		} else if (this.state === 'attached') {
			callback();
			return;
		}

		this._attach(false, null, callback);
	};

	RealtimeChannel.prototype._attach = function(forceReattach, attachReason, callback) {
		if(!callback) {
			callback = function(err) {
				if (err) {
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel._attach()', 'Channel attach failed: ' + err.toString());
				}
			}
		}

		var connectionManager = this.connectionManager;
		if(!connectionManager.activeState()) {
			callback(connectionManager.getError());
			return;
		}

		if (this.state !== 'attaching' || forceReattach) {
			this.requestState('attaching', attachReason);
		}

		this.once(function(stateChange) {
			switch(this.event) {
				case 'attached':
					callback();
					break;
				case 'detached':
				case 'suspended':
				case 'failed':
					callback(stateChange.reason || connectionManager.getError());
					break;
				case 'detaching':
					callback(new ErrorInfo('Attach request superseded by a subsequent detach request', 90000, 409));
					break;
			}
		});
	};

	RealtimeChannel.prototype.attachImpl = function() {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
		this.setInProgress(statechangeOp, true);
		var attachMsg = ProtocolMessage.fromValues({action: actions.ATTACH, channel: this.name, params: this.channelOptions.params});
		if(this._requestedFlags) {
			attachMsg.encodeModesToFlags(this._requestedFlags);
		} else if(this.channelOptions.modes) {
			attachMsg.encodeModesToFlags(Utils.allToUpperCase(this.channelOptions.modes));
		}
		if(this._attachResume) {
			attachMsg.setFlag('ATTACH_RESUME');
		}
		if(this._lastPayload.decodeFailureRecoveryInProgress) {
			attachMsg.channelSerial = this._lastPayload.protocolMessageChannelSerial;
		}
		this.sendMessage(attachMsg, noop);
	};

	RealtimeChannel.prototype.detach = function(callback) {
		if(!callback) {
			if(this.realtime.options.promises) {
				return Utils.promisify(this, 'detach', arguments);
			}
			callback = noop;
		}
		var connectionManager = this.connectionManager;
		if(!connectionManager.activeState()) {
			callback(connectionManager.getError());
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
						case 'attached':
						case 'suspended':
						case 'failed':
							callback(stateChange.reason || connectionManager.getError());
							break;
						case 'attaching':
							callback(new ErrorInfo('Detach request superseded by a subsequent attach request', 90000, 409));
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

		if(!callback) {
			if(this.realtime.options.promises) {
				return Utils.promisify(this, 'subscribe', [event, listener]);
			}
			callback = noop;
		}

		if(this.state === 'failed') {
			callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError('failed')));
			return;
		}

		this.subscriptions.on(event, listener);

		return this.attach(callback);
	};

	RealtimeChannel.prototype.unsubscribe = function(/* [event], listener */) {
		var args = RealtimeChannel.processListenerArgs(arguments);
		var event = args[0];
		var listener = args[1];
		this.subscriptions.off(event, listener);
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
			throw connectionManager.getError();
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
			this._attachedMsgIndicator = true;
			this.properties.attachSerial = message.channelSerial;
			this._mode = message.getMode();
			this.params = message.params || {};
			var modesFromFlags = message.decodeModesFromFlags();
			this.modes = (modesFromFlags && Utils.allToLowerCase(modesFromFlags)) || undefined;
			var resumed = message.hasFlag('RESUMED');
			var hasPresence = message.hasFlag('HAS_PRESENCE');
			if(this.state === 'attached') {
				/* attached operations to change options set the inprogress mutex, but leave
				 * channel in the attached state */
				this.setInProgress(statechangeOp, false);
				if(!resumed) {
					/* On a loss of continuity, the presence set needs to be re-synced */
					this.presence.onAttached(hasPresence);
				}
				var change = new ChannelStateChange(this.state, this.state, resumed, message.error);
				this._allChannelChanges.emit('update', change);
				if(!resumed || this.channelOptions.updateOnAttached) {
					this.emit('update', change);
				}
			} else {
				this.notifyState('attached', message.error, resumed, hasPresence);
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

			//RTL17
			if(this.state !== 'attached') {
				Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.onMessage()', 'Message "' + message.id + '" skipped as this channel "' + this.name + '" state is not "attached" (state is "' + this.state + '").');
				return;
			}

			var messages = message.messages,
				firstMessage = messages[0],
				lastMessage = messages[messages.length - 1],
				id = message.id,
				connectionId = message.connectionId,
				timestamp = message.timestamp;

			if(firstMessage.extras && firstMessage.extras.delta && firstMessage.extras.delta.from !== this._lastPayload.messageId) {
				var msg = 'Delta message decode failure - previous message not available for message "' + message.id + '" on this channel "' + this.name + '".';
				Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', msg);
				this._startDecodeFailureRecovery(new ErrorInfo(msg, 40018, 400));
				break;
			}

			for(var i = 0; i < messages.length; i++) {
				var msg = messages[i];
				try {
					Message.decode(msg, this._decodingContext);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', e.toString());
					switch(e.code) {
						case 40018:
							/* decode failure */
							this._startDecodeFailureRecovery(e);
							return;
						case 40019:
							/* No vcdiff plugin passed in - no point recovering, give up */
						case 40021:
							/* Browser does not support deltas, similarly no point recovering */
							this.notifyState('failed', e);
							return;
					}
				}
				if(!msg.connectionId) msg.connectionId = connectionId;
				if(!msg.timestamp) msg.timestamp = timestamp;
				if(!msg.id) msg.id = id + ':' + i;
			}
			this._lastPayload.messageId = lastMessage.id;
			this._lastPayload.protocolMessageChannelSerial = message.channelSerial;
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

	RealtimeChannel.prototype._startDecodeFailureRecovery = function(reason) {
		var self = this;
		if(!this._lastPayload.decodeFailureRecoveryInProgress) {
			Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.onMessage()', 'Starting decode failure recovery process.');
			this._lastPayload.decodeFailureRecoveryInProgress = true;
			this._attach(true, reason, function() {
				self._lastPayload.decodeFailureRecoveryInProgress = false;
			});
		}
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

		if(state === 'attached') {
			this._attachResume = true;
		} else if(state === 'detaching' || state === 'failed') {
			this._attachResume = false;
		}

		this.state = state;
		this._allChannelChanges.emit(state, change);
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
				if(this.rest.options.promises) {
					return Utils.promisify(this, 'history', arguments);
				}
				callback = noop;
			}
		}

		if(params && params.untilAttach) {
			if(this.state !== 'attached') {
				callback(new ErrorInfo("option untilAttach requires the channel to be attached", 40000, 400));
				return;
			}
			if(!this.properties.attachSerial) {
				callback(new ErrorInfo("untilAttach was specified and channel is attached, but attachSerial is not defined", 40000, 400));
				return;
			}
			delete params.untilAttach;
			params.from_serial = this.properties.attachSerial;
		}

		Channel.prototype._history.call(this, params, callback);
	};

	RealtimeChannel.prototype.whenState = function(state, listener) {
		return EventEmitter.prototype.whenState.call(this, state, this.state, listener);
	}

	return RealtimeChannel;
})();
