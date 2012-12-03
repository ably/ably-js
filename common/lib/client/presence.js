var Presence = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function Presence(channel, options) {
		EventEmitter.call(this);
		this.channel = channel;
		this.clientId = options.clientId;
		this.clients = {};
	}
	Utils.inherits(Presence, EventEmitter);

	Presence.prototype.enter = function(clientData, callback) {
		if(!this.clientId)
			throw new Error('clientId must be specified to enter a presence channel');
		this.enterClient(this.clientId, clientData, callback);
	};

	Presence.prototype.enterClient = function(clientId, clientData, callback) {
		Logger.logAction('Presence.enterClient()', 'entering; channel = ' + this.channel.name + ', client = ' + clientId);
		this.clients[clientId] = clientData;
		var presence = new messagetypes.TPresence({
			state : messagetypes.TPresenceState.ENTER,
			clientId : this.clientId
		});
		presence.clientData = Channel.createPayload(clientData);
		if (this.channel.state == 'pending')
			this.pendingPresence = {
				presence : 'enter',
				callback : callback
			};
		else if (this.channel.state == 'subscribed')
			channel.sendPresence(presence, listener);
	};

	Presence.prototype.leave = function(callback) {
		if(!this.clientId)
			throw new Error('clientId must have been specified to enter or leave a presence channel');
		this.leaveClient(this.clientId, callback);
	};

	Presence.prototype.leaveClient = function(clientId, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
		delete this.clients[clientId];
		var presence = new messagetypes.TPresence({
			state : messagetypes.TPresenceState.LEAVE,
			clientId : this.channel.ably.options.clientId
		});
		if (this.channel.state == 'subscribed')
			this.channel.sendPresence(presence, callback);
		else if (this.channel.state == 'pending')
			this.pendingPresence = {
				presence : 'leave',
				callback : callback
			};
		else
			delete this.pendingPresence;
	};

	Presence.prototype.get = function(clientId) {
		return clients[clientId || this.clientId];
	};

	Presence.prototype.setPresence = function(presenceSet, broadcast) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.setPresence()', 'received presence for ' + presenceSet.length + ' participants; channel = ' + this.channel.name + ', client = ' + clientId);
		for(var i in presenceSet) {
			var presence = presenceSet[i];
			var clientData = undefined, clientId = presence.clientId;
			if(presence.state == 'leave')
				delete this.clients[clientId];
			else
				clientData = this.clients[clientId] = Message.getPayload(presence.clientData);
			if(broadcast)
				this.emit(presence.state, clientId, clientData);
		}
	};

	Presence.prototype.setSubscribed = function() {
		if(this.pendingPresence) {
			Logger.logAction(Logger.LOG_MICRO, 'Presence.setSubscribed', 'sending queued presence; state = ' + this.state);
			this.channel.sendPresence(this.pendingPresence.presence, this.pendingPresence.callback);
			delete this.pendingPresence;
		}
	};

	Presence.prototype.setSuspended = function(connectionState) {
		if(this.pendingPresence) {
			this.pendingPresence.callback(connectionState.defaultMessage);
			delete this.pendingPresence;
		}
	};

	return Presence;
})();
