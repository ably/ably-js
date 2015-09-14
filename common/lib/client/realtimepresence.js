var RealtimePresence = (function() {
	var presenceAction = PresenceMessage.Action;
	var presenceActionToEvent = ['absent', 'present', 'enter', 'leave', 'update'];

	function memberKey(item) {
		return item.clientId + ':' + item.connectionId;
	}

	function RealtimePresence(channel, options) {
		EventEmitter.call(this);
		Presence.call(this, channel);
		this.clientId = options.clientId;
		this.members = new PresenceMap(this);
	}
	Utils.inherits(RealtimePresence, Presence);

	RealtimePresence.prototype.enter = function(data, callback) {
		if(!this.clientId)
			throw new Error('clientId must be specified to enter a presence channel');
		this._enterOrUpdateClient(this.clientId, data, callback, 'enter');
	};

	RealtimePresence.prototype.update = function(data, callback) {
		if(!this.clientId) {
			throw new Error('clientId must be specified to update presence data');
		}
		this._enterOrUpdateClient(this.clientId, data, callback, 'update');
	};

	RealtimePresence.prototype.enterClient = function(clientId, data, callback) {
		this._enterOrUpdateClient(clientId, data, callback, 'enter')
	};

	RealtimePresence.prototype.updateClient = function(clientId, data, callback) {
		this._enterOrUpdateClient(clientId, data, callback, 'update')
	};

	RealtimePresence.prototype._enterOrUpdateClient = function(clientId, data, callback, action) {
		if (!callback && (typeof(data)==='function')) {
			callback = data;
			data = null;
		}

		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.' + action + 'Client()',
		  action + 'ing; channel = ' + this.channel.name + ', client = ' + clientId)

		var presence = PresenceMessage.fromValues({
			action : presenceAction[action.toUpperCase()],
			clientId : clientId,
			data: data
		});
		var channel = this.channel;
		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'initialized':
			case 'detached':
				var self = this;
				channel.attach(function(err) {
					// If error in attaching, callback immediately
					if(err) {
						self.pendingPresence = null;
						callback(err);
					}
				});
			case 'attaching':
				this.pendingPresence = {
					presence : presence,
					callback : callback
				};
				break;
			default:
				var err = new Error('Unable to enter presence channel (incompatible state)');
				err.code = 90001;
				callback(err);
		}
	};

	RealtimePresence.prototype.leave = function(data, callback) {
		if (!callback && (typeof(data)==='function')) {
			callback = data;
			data = '';
		}
		if(!this.clientId)
			throw new Error('clientId must have been specified to enter or leave a presence channel');
		this.leaveClient(this.clientId, data, callback);
	};

	RealtimePresence.prototype.leaveClient = function(clientId, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = PresenceMessage.fromValues({
			action : presenceAction.LEAVE,
			clientId : clientId,
			data: data
		});
		var channel = this.channel;
		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'attaching':
				this.pendingPresence = {
					presence : presence,
					callback : callback
				};
				break;
			case 'initialized':
				/* we're not attached; therefore we let any entered status
				 * timeout by itself instead of attaching just in order to leave */
				this.pendingPresence = null;
				var err = new Error('Unable to enter presence channel (incompatible state)');
				err.code = 90001;
				callback(err);
				break;
			default:
				/* there is no connection; therefore we let
				 * any entered status will timeout by itself */
				this.pendingPresence = null;
				callback(ConnectionError.failed);
		}
	};

	RealtimePresence.prototype.get = function(/* params, callback */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var params = args[0],
			callback = args[1] || noop,
			members = this.members;

		members.waitSync(function() {
			callback(null, params ? members.list(params) : members.values());
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
				callback = noop;
			}
		}

		if(params && params.untilAttach) {
			if(this.channel.state === 'attached') {
				delete params.untilAttach;
				params.from_serial = this.channel.attachSerial;
			} else {
				throw new ErrorInfo("option untilAttach requires the channel to be attached, was: " + this.channel.state, 40000, 400);
			}
		}

		Presence.prototype._history.call(this, params, callback);
	};

	RealtimePresence.prototype.setPresence = function(presenceSet, broadcast, syncChannelSerial) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.setPresence()', 'received presence for ' + presenceSet.length + ' participants; syncChannelSerial = ' + syncChannelSerial);
		var syncCursor, match, members = this.members;
		if(syncChannelSerial && (match = syncChannelSerial.match(/^\w+:(.*)$/)) && (syncCursor = match[1]))
			this.members.startSync();

		for(var i = 0; i < presenceSet.length; i++) {
			var presence = presenceSet[i];
			switch(presence.action) {
				case presenceAction.LEAVE:
					broadcast &= members.remove(presence);
					break;
				case presenceAction.UPDATE:
				case presenceAction.ENTER:
					presence = PresenceMessage.fromValues(presence);
					presence.action = presenceAction.PRESENT;
				case presenceAction.PRESENT:
					broadcast &= members.put(presence);
					break;
			}
		}
		/* if this is the last message in a sequence of sync updates, end the sync */
		if(!syncCursor)
			members.endSync();

		/* broadcast to listeners */
		if(broadcast) {
			for(var i = 0; i < presenceSet.length; i++) {
				var presence = presenceSet[i];
				this.emit(presenceActionToEvent[presence.action], presence);
			}
		}
	};

	RealtimePresence.prototype.setAttached = function() {
		var pendingPresence = this.pendingPresence;
		if(pendingPresence) {
			var presence = pendingPresence.presence, callback = pendingPresence.callback;
			Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.setAttached', 'sending queued presence; action = ' + presence.action);
			this.channel.sendPresence(presence, callback);
			this.pendingPresence = null;
		}
	};

	RealtimePresence.prototype.setSuspended = function(err) {
		var pendingPresence = this.pendingPresence;
		if(pendingPresence) {
			pendingPresence.callback(err);
			this.pendingPresence = null;
		}
	};

	RealtimePresence.prototype.awaitSync = function() {
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.awaitSync(); channel = ' + this.channel.name);
		this.members.startSync();
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
			if(item.clientId == clientId && item.action != presenceAction.ABSENT)
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
			if(item.action == presenceAction.ABSENT) continue;
			if(clientId && clientId != item.clientId) continue;
			if(connectionId && connectionId != item.connectionId) continue;
			result.push(item);
		}
		return result;
	};

	PresenceMap.prototype.put = function(item) {
		var map = this.map, key = memberKey(item);
		/* we've seen this member, so do not remove it at the end of sync */
		if(this.residualMembers)
			delete this.residualMembers[key];

		/* compare the timestamp of the new item with any existing member (or ABSENT witness) */
		var existingItem = map[key];
		if(existingItem && item.timestamp < existingItem.timestamp) {
			/* no item supersedes a newer item with the same key */
			return false;
		}
		map[key] = item;
		return true;

	};

	PresenceMap.prototype.values = function() {
		var map = this.map, result = [];
		for(var key in map) {
			var item = map[key];
			if(item.action != presenceAction.ABSENT)
				result.push(item);
		}
		return result;
	};

	PresenceMap.prototype.remove = function(item) {
		var map = this.map, key = memberKey(item);
		var existingItem = map[key];
		if(existingItem) {
			delete map[key];
			if(existingItem.action == PresenceMessage.Action.ABSENT)
				return false;
		}
		return true;
	};

	PresenceMap.prototype.startSync = function() {
		var map = this.map, syncInProgress = this.syncInProgress;
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.startSync(); channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
		/* we might be called multiple times while a sync is in progress */
		if(!this.syncInProgress) {
			this.residualMembers = Utils.copy(map);
			this.syncInProgress = true;
		}
	};

	PresenceMap.prototype.endSync = function() {
		var map = this.map, syncInProgress = this.syncInProgress;
		Logger.logAction(Logger.LOG_MINOR, 'PresenceMap.endSync(); channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
		if(syncInProgress) {
			/* we can now strip out the ABSENT members, as we have
			 * received all of the out-of-order sync messages */
			for(var memberKey in map) {
				var entry = map[memberKey];
				if(entry.action == presenceAction.ABSENT) {
					delete map[memberKey];
				}
			}
			/* any members that were present at the start of the sync,
			 * and have not been seen in sync, can be removed */
			for(var memberKey in this.residualMembers) {
				delete map[memberKey];
			}
			this.residualMembers = null;

			/* finish, notifying any waiters */
			this.syncInProgress = false;
		}
		this.emit('sync');
	};

	PresenceMap.prototype.waitSync = function(callback) {
		if(!this.syncInProgress) {
			callback();
			return;
		}
		this.once('sync', callback);
	};

	return RealtimePresence;
})();
