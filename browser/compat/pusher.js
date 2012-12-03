window.Pusher = window.Pusher || (function() {

	/**
	 * Mapping from Ably to Pusher connection state names
	 */
	var connectionStates = {
		initialized:  'initialized',
		connecting:   'connecting',
		connected:    'connected',
		disconnected: 'disconnected',
		suspended:    'unavailable',
		closed:       'disconnected',
		failed:       'failed'
	};

	function startsWith(string, substr) {
		return string.substr(0, substr.length) == substr;
	}

	/**
	 * Create a Pusher instance
	 * @param applicationKey: the Ably applicationId;
	 * @param options: connection options.
	 * 
	 * The following Pusher-defined options are supported:
	 * - encrypted
	 *
	 * The following Ably-defined options are additionally supported:
	 * - (TBD)
	 * 
	 * Compatibility:
	 * There are differences between Pusher and Ably authentication regimes
	 * so not all Pusher auth param options are supported.
	 */
	function Pusher(applicationKey, options) {
		var ablyOptions = {
			applicationId: applicationKey,
			encrypted: options.encrypted
		};
		var ably = this.ably = new Ably(ablyOptions);
		this.connection = new PusherConnection(ably.connection);
		this.channels = {};
	}

	/**
	 * Disconnect the current connection
	 */
	Pusher.prototype.disconnect = function() {
		this.ably.disconnect();
	};

	/**
	 * Obtain the current channel instance for the given channelName
	 * @param channelName: the channel name
	 * @returns a Channel object, if subscription to that channel had
	 * already been initiated.
	 */
	Pusher.prototype.channel = function(channelName) {
		return this.channels[channelName];
	};

	/**
	 * Initiate subscription to a channel.
	 * @param channelName: the channel name
	 * @returns a Channel object.
	 * 
	 * Compatibility:
	 * (FIXME) Check Pusher behaviour if subscription is re-initiated
	 * for an already-existing channel.
	 */
	Pusher.prototype.subscribe = function(channelName) {
		return (this.channels[channelName] = new PusherChannel(pusher, channelName));
	};

	/**
	 * End subscription to a channel.
	 * @param channelName: the channel name
	 */
	Pusher.prototype.unsubscribe = function(channelName) {
		var subscribed = this.channels[channelName];
		if(subscribed)
			subscribed.channel.detach();
	};

	/**
	 * Internal: a class that wraps an Ably Connection instance,
	 * and emulates a Pusher Connection object.
	 * 
	 * Compatibility:
	 * (FIXME) Check actual Pusher behaviour with regard to period
	 * 'connecting_in' events. This implementation will emit a single
	 * 'connecting_in' event only for each state change.
	 * 
	 * Connection state change sequences will not be identical to
	 * Pusher in call cases, although they will correspond quite
	 * closely.
	 */
	function PusherConnection(connection) {
		EventEmitter.call(this);
		this.connection = connection;

		var self = this;
		connection.on(function(change) {
			var previous = connectionStates[change.previous];
			var current = self.state = connectionStates[change.current];
			self.emit(current);
			self.emit('state_change', {previous: previous, current: current});
			if(change.retryIn)
				self.emit('connecting_in', change.retryIn);
		});
	}
	Utils.inherits(PusherConnection, EventEmitter);

	/**
	 * Bind to a connection state change event.
	 * @param state: the name of the connection state
	 * to be associated with this event handler.
	 * @param callback: the function to call on the occurrence
	 * of a state transition ending in the given state.
	 * 
	 * Compatibility:
	 * All Pusher connection state events are emitted.
	 */
	PusherConnection.prototype.bind = function() {
		this.on.apply(this, arguments);
	};

	/**
	 * Internal: a class that wraps an Ably Channel instance,
	 * and emulates a Pusher Channel object.
	 * 
	 * Compatibility:
	 * A channel name stem of 'private-' is ignored. This means
	 * that a client is equally capable of authenticating to
	 * a "public" or private channel.
	 * 
	 * The Pusher 'members' channel property is enabled for
	 * channels starting with 'presence-'
	 * 
	 * Only a 403 error is returned if there is a subscription
	 * error. Other error codes are TBD. (FIXME)
	 */
	function PusherChannel(pusher, channelName) {
		EventEmitter.call(this);
		if(startsWith(channelName, 'presence-')) {
			/* FIXME: where to get myId and myInfo? */
			/* FIXME: enforce authentication */
			this.members = new Members(this);
		}

		var self = this;
		this.channel = pusher.ably.attach(channelName, function(err) {
			if(err)
				self.emit('pusher:subscription_error', 403, err);
			else
				self.emit('pusher:subscription_succeeded', self.members);
		});
	}
	Utils.inherits(PusherChannel, EventEmitter);

	/**
	 * Bind to a channel event.
	 * @param event: the name of the event
	 * to be associated with this event handler.
	 * @param callback: the function to call on the occurrence
	 * of the event.
	 */
	PusherChannel.prototype.bind = function(event, callback) {
		this.channel.on(event, function(message) {
			callback(message.data);
		});
	};

	/**
	 * Publish a client event.
	 * @param event: the name of the event
	 * @param data: the data (payload) of the event.
	 * @returns true if the trigger was successful
	 * 
	 * Compatibility:
	 * This does not enforce the Pusher restriction that client event
	 * names must start with 'client-'.
	 * No rate-limiting is enforced, other than the message limits as
	 * specified in the current Ably subscription.
	 * 
	 * This always returns true. There is no way to know synchronously
	 * whether or not the trigger was successful.
	 */
	PusherChannel.prototype.trigger = function(event, data) {
		this.channel.publish(event, data);
		return true;
	};

	/**
	 * A class encapsulating member info
	 */
	function Member(id, info) {
		this.id = id;
		this.info = info;
	}

	/**
	 * Internal: a class encapsulating the collection of members
	 * associated with a presence channel.
	 * @param channel: the PusherChannel these members are associated with
	 * @param myId (optional): my member id;
	 * @param myInfo (optional): my member info;
	 * 
	 * Compatibility:
	 * (FIXME) Need to look at the specific member info that Pusher provides
	 * and whether it is any different from Ably's opaque clientData.
	 */
	function Members(channel, myId, myInfo) {
		this.channel = channel;
		this.count = 0;
		if(myId) {
			this.me = new Member(myId, myInfo);
			this.addMember(this.me);
		}
		var presence = channel.channel.presence;
		var self = this;
		presence.on('enter', function(id, info) {
			var member = new Member(id, info);
			self.addMember(member);
			channel.emit('pusher:member_added', member);
		});
		presence.on('leave', function(id) {
			var member = self.members[id] || new Member(id);
			self.removeMember(member);
			channel.emit('pusher:member_removed', member);
		});
	}

	/**
	 * Internal: add a Member to this Members
	 * @param member: member to be added. If the member
	 * is already present, the info of the existing member
	 * is updated.
	 */
	Members.prototype.addMember = function(member) {
		if(member.id in this.members) {
			this.members[member.id].info = member.info;
		} else {
			this.members[member.id] = member;
			this.count++;
		}
	};

	/**
	 * Internal: remove a Member from this Members if present
	 * @param member: the Member to remove.
	 * Any member whose id matches the id of the given member
	 * will be removed.
	 */
	Members.prototype.removeMember = function(member) {
		if(member.id in this.members) {
			delete this.members[member.id];
			this.count--;
		}
	};

	/**
	 * Call a function for each Member.
	 * @param callback: the function to be called for
	 * each Member.
	 */
	Members.prototype.each = function(callback) {
		for(var id in this.members)
			callback(this.members[id]);
	};

	/**
	 * Retrieve a Member given an id
	 * @param userId: the id of the Member to retrieve.
	 * @returns a Member
	 */
	Members.prototype.get = function(userId) {
		return this.members[userId];
	};

	return Pusher;
})();
