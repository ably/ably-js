var Presence = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var presenceState = messagetypes.TPresenceState;
	var presenceStateToEvent = ['enter', 'leave', 'update'];

	function memberKey(clientId, memberId) {
		return clientId + ':' + memberId;
	}

	function Presence(channel, options) {
		EventEmitter.call(this);
		this.channel = channel;
		this.clientId = options.clientId;
		this.members = {};
	}
	Utils.inherits(Presence, EventEmitter);

	Presence.prototype.enter = function(clientData, callback) {
		if (!callback && (typeof(clientData)==='function')) {
			callback = clientData;
			clientData = '';
		}
		if(!this.clientId)
			throw new Error('clientId must be specified to enter a presence channel');
		this.enterClient(this.clientId, clientData, callback);
	};

	Presence.prototype.enterClient = function(clientId, clientData, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.enterClient()', 'entering; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = new messagetypes.TPresence({
			state : presenceState.ENTER,
			clientId : clientId,
			clientData: Data.toTData(clientData)
		});
		var channel = this.channel;
		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'initialized':
				channel.attach();
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

	Presence.prototype.leave = function(callback) {
		if(!this.clientId)
			throw new Error('clientId must have been specified to enter or leave a presence channel');
		this.leaveClient(this.clientId, callback);
	};

	Presence.prototype.leaveClient = function(clientId, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = new messagetypes.TPresence({
			state : presenceState.LEAVE,
			clientId : clientId
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
				break
			default:
				/* there is no connection; therefore we let
				 * any entered status will timeout by itself */
				this.pendingPresence = null;
				callback(ConnectionError.failed);
		}
	};

	Presence.prototype.get = function(key) {
		return key ? this.members[key] : Utils.valuesArray(this.members, true);
	};

	Presence.prototype.setPresence = function(presenceSet, broadcast) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.setPresence()', 'received presence for ' + presenceSet.length + ' participants');
		for(var i = 0; i < presenceSet.length; i++) {
			var presence = presenceSet[i];
			var key = memberKey.call(presence.clientId, presence.memberId);
			var member = new PresenceMessage(presence.clientId, Data.fromTData(presence.clientData), presence.memberId);
			switch(presence.state) {
				case presenceState.LEAVE:
					delete this.members[key];
					break;
				case presenceState.UPDATE:
					if(presence.inheritMemberId)
						delete this.members[memberKey.call(presence.clientId, presence.inheritMemberId)];
				case presenceState.ENTER:
					clientData = this.members[key] = member;
					break;
			}
			if(broadcast)
				this.emit(presenceStateToEvent[presence.state], member);
		}
	};

	Presence.prototype.setAttached = function() {
		if(this.pendingPresence) {
			Logger.logAction(Logger.LOG_MICRO, 'Presence.setAttached', 'sending queued presence; state = ' + this.state);
			this.channel.sendPresence(this.pendingPresence.presence, this.pendingPresence.callback);
			this.pendingPresence = null;
		}
	};

	Presence.prototype.setSuspended = function() {
		if(this.pendingPresence) {
			this.pendingPresence.callback(new Error('Channel is detached'));
			this.pendingPresence = null;
		}
	};

	return Presence;
})();
