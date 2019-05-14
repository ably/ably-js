var RealtimePresence = (function() {
	var noop = function() {};

	function memberKey(item) {
		return item.clientId + ':' + item.connectionId;
	}

	function getClientId(realtimePresence) {
		return realtimePresence.channel.realtime.auth.clientId;
	}

	function isAnonymousOrWildcard(realtimePresence) {
		var realtime = realtimePresence.channel.realtime;
		/* If not currently connected, we can't assume that we're an anonymous
		 * client, as realtime may inform us of our clientId in the CONNECTED
		 * message. So assume we're not anonymous and leave it to realtime to
		 * return an error if we are */
		var clientId = realtime.auth.clientId;
		return (!clientId || (clientId === '*')) && realtime.connection.state === 'connected';
	}

	/* Callback is called only in the event of an error */
	function waitAttached(channel, callback, action) {
		switch(channel.state) {
			case 'attached':
			case 'suspended':
				action();
				break;
			case 'initialized':
			case 'detached':
			case 'detaching':
			case 'attaching':
				channel.attach(function(err) {
					if(err) callback(err);
					else action();
				});
				break;
			default:
				callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError(channel.state)));
		}
	}

	function RealtimePresence(channel, options) {
		Presence.call(this, channel);
		this.syncComplete = false;
		this.members = new PresenceMap(this);
		this._myMembers = new PresenceMap(this);
		this.subscriptions = new EventEmitter();
		this.pendingPresence = [];
	}
	Utils.inherits(RealtimePresence, Presence);

	RealtimePresence.prototype.enter = function(data, callback) {
		if(isAnonymousOrWildcard(this)) {
			throw new ErrorInfo('clientId must be specified to enter a presence channel', 40012, 400);
		}
		return this._enterOrUpdateClient(undefined, data, 'enter', callback);
	};

	RealtimePresence.prototype.update = function(data, callback) {
		if(isAnonymousOrWildcard(this)) {
			throw new ErrorInfo('clientId must be specified to update presence data', 40012, 400);
		}
		return this._enterOrUpdateClient(undefined, data, 'update', callback);
	};

	RealtimePresence.prototype.enterClient = function(clientId, data, callback) {
		return this._enterOrUpdateClient(clientId, data, 'enter', callback);
	};

	RealtimePresence.prototype.updateClient = function(clientId, data, callback) {
		return this._enterOrUpdateClient(clientId, data, 'update', callback);
	};

	RealtimePresence.prototype._enterOrUpdateClient = function(clientId, data, action, callback) {
		if (!callback) {
			if (typeof(data)==='function') {
				callback = data;
				data = null;
			} else {
				if(this.channel.realtime.options.promises) {
					return Utils.promisify(this, '_enterOrUpdateClient', [clientId, data, action]);
				}
				callback = noop;
			}
		}

		var channel = this.channel;
		if(!channel.connectionManager.activeState()) {
			callback(channel.connectionManager.getError());
			return;
		}

		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.' + action + 'Client()',
		  'channel = ' + channel.name + ', client = ' + (clientId || '(implicit) ' + getClientId(this)));

		var presence = PresenceMessage.fromValues({
			action : action,
			data   : data
		});
		if (clientId) {
			presence.clientId = clientId;
		}

		var self = this;
		PresenceMessage.encode(presence, channel.channelOptions, function(err) {
			if (err) {
				callback(err);
				return;
			}
			switch(channel.state) {
				case 'attached':
					channel.sendPresence(presence, callback);
					break;
				case 'initialized':
				case 'detached':
					channel.attach();
				case 'attaching':
					self.pendingPresence.push({
						presence : presence,
						callback : callback
					});
					break;
				default:
					err = new ErrorInfo('Unable to ' + action + ' presence channel (incompatible state)', 90001);
					err.code = 90001;
					callback(err);
			}
		});
	};

	RealtimePresence.prototype.leave = function(data, callback) {
		if(isAnonymousOrWildcard(this)) {
			throw new ErrorInfo('clientId must have been specified to enter or leave a presence channel', 40012, 400);
		}
		return this.leaveClient(undefined, data, callback);
	};

	RealtimePresence.prototype.leaveClient = function(clientId, data, callback) {
		if (!callback) {
			if (typeof(data)==='function') {
				callback = data;
				data = null;
			} else {
				if(this.channel.realtime.options.promises) {
					return Utils.promisify(this, 'leaveClient', [clientId, data]);
				}
				callback = noop;
			}
		}

		var channel = this.channel;
		if(!channel.connectionManager.activeState()) {
			callback(channel.connectionManager.getError());
			return;
		}

		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = PresenceMessage.fromValues({
			action : 'leave',
			data   : data
		});
		if (clientId) { presence.clientId = clientId; }

		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'attaching':
				this.pendingPresence.push({
					presence : presence,
					callback : callback
				});
				break;
			case 'initialized':
			case 'failed':
				/* we're not attached; therefore we let any entered status
				 * timeout by itself instead of attaching just in order to leave */
				var err = new ErrorInfo('Unable to leave presence channel (incompatible state)', 90001);
				callback(err);
				break;
			default:
				/* there is no connection; therefore we let
				 * any entered status timeout by itself */
				callback(ConnectionError.failed);
		}
	};

	RealtimePresence.prototype.get = function(/* params, callback */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var params = args[0],
			callback = args[1],
			waitForSync = !params || ('waitForSync' in params ? params.waitForSync : true);

		if(!callback) {
			if(this.channel.realtime.options.promises) {
				return Utils.promisify(this, 'get', args);
			}
			callback = noop;
		}

		function returnMembers(members) {
			callback(null, params ? members.list(params) : members.values());
		}

		/* Special-case the suspended state: can still get (stale) presence set if waitForSync is false */
		if(this.channel.state === 'suspended') {
			if(waitForSync) {
				callback(ErrorInfo.fromValues({
					statusCode: 400,
					code: 91005,
					message: 'Presence state is out of sync due to channel being in the SUSPENDED state'
				}));
			} else {
				returnMembers(this.members);
			}
			return;
		}

		var self = this;
		waitAttached(this.channel, callback, function() {
			var members = self.members;
			if(waitForSync) {
				members.waitSync(function() {
					returnMembers(members);
				});
			} else {
				returnMembers(members);
			}
		});
	};

	RealtimePresence.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.history()', 'channel = ' + this.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				if(this.channel.realtime.options.promises) {
					return Utils.promisify(this, 'history', arguments);
				}
				callback = noop;
			}
		}

		if(params && params.untilAttach) {
			if(this.channel.state === 'attached') {
				delete params.untilAttach;
				params.from_serial = this.channel.properties.attachSerial;
			} else {
				callback(new ErrorInfo("option untilAttach requires the channel to be attached, was: " + this.channel.state, 40000, 400));
			}
		}

		Presence.prototype._history.call(this, params, callback);
	};

	RealtimePresence.prototype.setPresence = function(presenceSet, isSync, syncChannelSerial) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.setPresence()', 'received presence for ' + presenceSet.length + ' participants; syncChannelSerial = ' + syncChannelSerial);
		var syncCursor, match, members = this.members, myMembers = this._myMembers,
			broadcastMessages = [], connId = this.channel.connectionManager.connectionId;

		if(isSync) {
			this.members.startSync();
			if(syncChannelSerial && (match = syncChannelSerial.match(/^[\w\-]+:(.*)$/))) {
				syncCursor = match[1];
			}
		}

		for(var i = 0; i < presenceSet.length; i++) {
			var presence = PresenceMessage.fromValues(presenceSet[i]);
			switch(presence.action) {
				case 'leave':
					if(members.remove(presence)) {
						broadcastMessages.push(presence);
					}
					if(presence.connectionId === connId && !presence.isSynthesized()) {
						myMembers.remove(presence);
					}
					break;
				case 'enter':
				case 'present':
				case 'update':
					if(members.put(presence)) {
						broadcastMessages.push(presence);
					}
					if(presence.connectionId === connId) {
						myMembers.put(presence);
					}
					break;
			}
		}
		/* if this is the last (or only) message in a sequence of sync updates, end the sync */
		if(isSync && !syncCursor) {
			members.endSync();
			/* RTP5c2: re-enter our own members if they haven't shown up in the sync */
			this._ensureMyMembersPresent();
			this.channel.setInProgress(RealtimeChannel.progressOps.sync, false);
			this.channel.syncChannelSerial = null;
		}

		/* broadcast to listeners */
		for(var i = 0; i < broadcastMessages.length; i++) {
			var presence = broadcastMessages[i];
			this.subscriptions.emit(presence.action, presence);
		}
	};

	RealtimePresence.prototype.onAttached = function(hasPresence) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimePresence.onAttached()', 'channel = ' + this.channel.name + ', hasPresence = ' + hasPresence);

		if(hasPresence) {
			this.members.startSync();
		} else {
			this._synthesizeLeaves(this.members.values());
			this.members.clear();
			this._ensureMyMembersPresent();
		}

		/* NB this must be after the _ensureMyMembersPresent call, which may add items to pendingPresence */
		var pendingPresence = this.pendingPresence,
			pendingPresCount = pendingPresence.length;

		if(pendingPresCount) {
			this.pendingPresence = [];
			var presenceArray = [];
			var multicaster = Multicaster();
			Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.onAttached', 'sending ' + pendingPresCount + ' queued presence messages');
			for(var i = 0; i < pendingPresCount; i++) {
				var event = pendingPresence[i];
				presenceArray.push(event.presence);
				multicaster.push(event.callback);
			}
			this.channel.sendPresence(presenceArray, multicaster);
		}
	};

	RealtimePresence.prototype.actOnChannelState = function(state, hasPresence, err) {
		switch(state) {
			case 'attached':
				this.onAttached(hasPresence);
				break;
			case 'detached':
			case 'failed':
				this._clearMyMembers();
				this.members.clear();
				/* falls through */
			case 'suspended':
				this.failPendingPresence(err);
				break;
		}
	};

	RealtimePresence.prototype.failPendingPresence = function(err) {
		if(this.pendingPresence.length) {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.failPendingPresence', 'channel; name = ' + this.channel.name + ', err = ' + Utils.inspectError(err));
			for(var i = 0; i < this.pendingPresence.length; i++)
				try {
					this.pendingPresence[i].callback(err);
				} catch(e) {}
			this.pendingPresence = [];
		}
	};

	RealtimePresence.prototype._clearMyMembers = function() {
		this._myMembers.clear();
	};

	RealtimePresence.prototype._ensureMyMembersPresent = function() {
		var self = this, members = this.members, myMembers = this._myMembers,
			reenterCb = function(err) {
				if(err) {
					var msg = 'Presence auto-re-enter failed: ' + err.toString();
					var wrappedErr = new ErrorInfo(msg, 91004, 400);
					Logger.logAction(Logger.LOG_ERROR, 'RealtimePresence._ensureMyMembersPresent()', msg);
					var change = new ChannelStateChange(self.channel.state, self.channel.state, true, wrappedErr);
					self.channel.emit('update', change);
				}
			};

		for(var memberKey in myMembers.map) {
			if(!(memberKey in members.map)) {
				var entry = myMembers.map[memberKey];
				Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence._ensureMyMembersPresent()', 'Auto-reentering clientId "' + entry.clientId + '" into the presence set');
				this._enterOrUpdateClient(entry.clientId, entry.data, 'enter', reenterCb);
				delete myMembers.map[memberKey];
			}
		}
	};

	RealtimePresence.prototype._synthesizeLeaves = function(items) {
		var subscriptions = this.subscriptions;
		Utils.arrForEach(items, function(item) {
			var presence = PresenceMessage.fromValues({
				action: 'leave',
				connectionId: item.connectionId,
				clientId: item.clientId,
				data: item.data,
				encoding: item.encoding,
				timestamp: Utils.now()
			});
			subscriptions.emit('leave', presence);
		});
	};

	/* Deprecated */
	RealtimePresence.prototype.on = function() {
		Logger.deprecated('presence.on', 'presence.subscribe');
		this.subscribe.apply(this, arguments);
	};

	/* Deprecated */
	RealtimePresence.prototype.off = function() {
		Logger.deprecated('presence.off', 'presence.unsubscribe');
		this.unsubscribe.apply(this, arguments);
	};

	RealtimePresence.prototype.subscribe = function(/* [event], listener, [callback] */) {
		var args = RealtimeChannel.processListenerArgs(arguments);
		var event = args[0];
		var listener = args[1];
		var callback = args[2];
		var channel = this.channel;
		var self = this;

		if(!callback) {
			if(this.channel.realtime.options.promises) {
				return Utils.promisify(this, 'subscribe', [event, listener]);
			}
			callback = noop;
		}

		if(channel.state === 'failed') {
			callback(ErrorInfo.fromValues(RealtimeChannel.invalidStateError('failed')));
			return;
		}

		this.subscriptions.on(event, listener);
		channel.attach(callback);
	};

	RealtimePresence.prototype.unsubscribe = function(/* [event], listener */) {
		var args = RealtimeChannel.processListenerArgs(arguments);
		var event = args[0];
		var listener = args[1];
		this.subscriptions.off(event, listener);
	};

	function PresenceMap(presence) {
		EventEmitter.call(this);
		this.presence = presence;
		this.map = {};
		this.syncInProgress = false;
		this.residualMembers = null;
	}
	Utils.inherits(PresenceMap, EventEmitter);

	PresenceMap.prototype.get = function(key) {
		return this.map[key];
	};

	PresenceMap.prototype.getClient = function(clientId) {
		var map = this.map, result = [];
		for(var key in map) {
			var item = map[key];
			if(item.clientId == clientId && item.action != 'absent')
				result.push(item);
		}
		return result;
	};

	PresenceMap.prototype.list = function(params) {
		var map = this.map,
			clientId = params && params.clientId,
			connectionId = params && params.connectionId,
			result = [];

		for(var key in map) {
			var item = map[key];
			if(item.action === 'absent') continue;
			if(clientId && clientId != item.clientId) continue;
			if(connectionId && connectionId != item.connectionId) continue;
			result.push(item);
		}
		return result;
	};

	function newerThan(item, existing) {
		/* RTP2b1: if either is synthesised, compare by timestamp */
		if(item.isSynthesized() || existing.isSynthesized()) {
			return item.timestamp > existing.timestamp;
		}

		/* RTP2b2 */
		var itemOrderings = item.parseId(),
			existingOrderings = existing.parseId();
		if(itemOrderings.msgSerial === existingOrderings.msgSerial) {
			return itemOrderings.index > existingOrderings.index;
		} else {
			return itemOrderings.msgSerial > existingOrderings.msgSerial;
		}
	}

	PresenceMap.prototype.put = function(item) {
		if(item.action === 'enter' || item.action === 'update') {
			item = PresenceMessage.fromValues(item);
			item.action = 'present';
		}
		var map = this.map, key = memberKey(item);
		/* we've seen this member, so do not remove it at the end of sync */
		if(this.residualMembers)
			delete this.residualMembers[key];

		/* compare the timestamp of the new item with any existing member (or ABSENT witness) */
		var existingItem = map[key];
		if(existingItem && !newerThan(item, existingItem)) {
			return false;
		}
		map[key] = item;
		return true;

	};

	PresenceMap.prototype.values = function() {
		var map = this.map, result = [];
		for(var key in map) {
			var item = map[key];
			if(item.action != 'absent')
				result.push(item);
		}
		return result;
	};

	PresenceMap.prototype.remove = function(item) {
		var map = this.map, key = memberKey(item);
		var existingItem = map[key];

		if(existingItem && !newerThan(item, existingItem)) {
			return false;
		}

		/* RTP2f */
		if(this.syncInProgress) {
			item = PresenceMessage.fromValues(item);
			item.action = 'absent';
			map[key] = item;
		} else {
			delete map[key];
		}

		return true;
	};

	PresenceMap.prototype.startSync = function() {
		var map = this.map, syncInProgress = this.syncInProgress;
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.startSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
		/* we might be called multiple times while a sync is in progress */
		if(!this.syncInProgress) {
			this.residualMembers = Utils.copy(map);
			this.setInProgress(true);
		}
	};

	PresenceMap.prototype.endSync = function() {
		var map = this.map, syncInProgress = this.syncInProgress;
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.endSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
		if(syncInProgress) {
			/* we can now strip out the ABSENT members, as we have
			 * received all of the out-of-order sync messages */
			for(var memberKey in map) {
				var entry = map[memberKey];
				if(entry.action === 'absent') {
					delete map[memberKey];
				}
			}
			/* any members that were present at the start of the sync,
			 * and have not been seen in sync, can be removed, and leave events emitted */
			this.presence._synthesizeLeaves(Utils.valuesArray(this.residualMembers));
			for(var memberKey in this.residualMembers) {
				delete map[memberKey];
			}
			this.residualMembers = null;

			/* finish, notifying any waiters */
			this.setInProgress(false);
		}
		this.emit('sync');
	};

	PresenceMap.prototype.waitSync = function(callback) {
		var syncInProgress = this.syncInProgress;
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.waitSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
		if(!syncInProgress) {
			callback();
			return;
		}
		this.once('sync', callback);
	};

	PresenceMap.prototype.clear = function(callback) {
		this.map = {};
		this.setInProgress(false);
		this.residualMembers = null;
	};

	PresenceMap.prototype.setInProgress = function(inProgress) {
		Logger.logAction(Logger.LOG_MICRO, 'PresenceMap.setInProgress()', 'inProgress = ' + inProgress);
		this.syncInProgress = inProgress;
		this.presence.syncComplete = !inProgress;
	};

	return RealtimePresence;
})();
