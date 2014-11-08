(function() {
	"use strict";

	// Ably library should have been included if running in a browser prior to including this
	// compatibility library:
	//
	//  <script src="http://cdn.ably.io/lib/ably.min.js"></script>
	//  <script src="compat/pubnub.js"></script>
	//
	// If this hasn't happened, assume we're running under node.js, and attempt to include it
	// and various other dependencies.
	if (typeof(window) !== 'undefined') {
		var Ably = window.Ably;
	} else if (typeof(Ably) !== 'undefined') {
		var Ably = Ably;
	} else {
		var Ably = require('../..');
		var fs   = require('fs');
		var path = require('path');
		var vm   = require('vm');
		var includeScript = function(name) {
			var filename = path.resolve(__dirname, name);
			return vm.runInThisContext(fs.readFileSync(filename, 'utf8'), filename);
		}
		if (typeof(Utils) === 'undefined') includeScript('../../common/lib/util/utils.js');
		if (typeof(EventEmitter) === 'undefined') includeScript('../../common/lib/util/eventemitter.js');
	}

	var enable_logging = false;
	function log(str) { enable_logging && console.log(str); }

	/**
	 * Mapping from Ably to Pusher connection and channel state names
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
	var channelStates = {
		attached:     'pusher:subscription_succeeded',
		failed:       'pusher:subscription_error'
	};

	function startsWith(string, substr) { return (string.indexOf(substr) == 0); }

	/**
	 * Create a Pusher instance
	 * @param applicationKey: the Ably key;
	 * @param options: connection options.
	 * 
	 * The following Pusher-defined options are supported:
	 * - encrypted
	 * - authEndpoint: Maps to Ably authUrl option
	 * - auth.params: Maps to Ably authParams option
	 * - auth.headers: Maps to Ably authHeaders option
	 * - host: Maps to Ably host and wsHost options
	 *
	 * The following Ably-defined options are additionally supported:
	 * - ablyClientId: Maps to Ably clientId option
	 * - tlshost: Host/port to use for encrypted connection
	 * 
	 * Compatibility:
	 * There are differences between Pusher and Ably authentication regimes
	 * so not all Pusher auth param options are supported.
	 */
	function Pusher(applicationKey, options) {
		var origin = options.host || '';
		var tlsorigin = options.tlshost || '';
		var encrypted = options.encrypted || false;
		var opts = {
			key: applicationKey, tls: encrypted//, log: {level:4}
		};
		if (options.ablyClientId) opts.clientId = options.ablyClientId;
		if (options.authEndpoint) opts.authUrl = options.authEndpoint;
		if (options.auth && options.auth.params) opts.authParams = options.auth.params;
		if (options.auth && options.auth.headers) opts.authHeaders = options.auth.headers;
		if (origin && (origin.length != 0)) {
			var p = origin.split(':');
			opts.host = opts.wsHost = p[0];
			if (p.length > 1)
				opts.port = p[1];
		}
		if (tlsorigin && (tlsorigin.length != 0)) {
			// Note: Only the port number is used here, the hostnames are the same as for non-TLS
			var p = tlsorigin.split(':');
			if (p.length > 1)
				opts.tlsPort = p[1];
		}

		var ably = this.ably = new Ably.Realtime(opts);
		this.clientId = opts.clientId;
		this.connection = new PusherConnection(ably.connection);
		this.channels = {};
	}

	/**
	 * Disconnect the current connection
	 */
	Pusher.prototype.disconnect = function() {
		// Close connection
		this.ably.close();

		// Reset state
		delete this.ably;
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
		return (this.channels[channelName] = new PusherChannel(this, channelName));
	};

	/**
	 * End subscription to a channel.
	 * @param channelName: the channel name
	 */
	Pusher.prototype.unsubscribe = function(channelName) {
		var subscribed = this.channels[channelName];
		if (subscribed) {
			subscribed.channel.detach();
			subscribed.active = false;
			delete this.channels[channelName];
		}
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
	 * Unbind from a connection state change event.
	 * @param state: the name of the connection state
	 * to be associated with this event handler.
	 * @param callback: the function to call on the occurrence
	 * of a state transition ending in the given state.
	 * 
	 * Compatibility:
	 * All Pusher connection state events are emitted.
	 */
	PusherConnection.prototype.unbind = function() {
		this.off.apply(this, arguments);
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
		var self = this;
		this.active = true;
		this.channel = pusher.ably.channels.get(channelName);
		this.name = channelName;
		this.isPresence = startsWith(channelName, 'presence-');

		/* FIXME: where to get  myInfo? */
		/* FIXME: enforce authentication */
		if (this.isPresence) this.members = new Members(this, pusher.clientId);

		this.channel.subscribe(function(message) {
			log('PusherChannel::message callback: Event object '+JSON.stringify(this)+', message '+JSON.stringify(message));
			self.channel.emit(message.name, JSON.parse(message.data));
		});
		this.bindings = {};
		this.bind_alls = [];

		if (this.isPresence) {
			var presence = this.channel.presence;
			this.entered = false;
			presence.on('enter', function(id) {
				if (!self.entered) return;
				if (id.clientId === self.members.myID) return;
				var member = self.members.addMember(id.clientId, id.clientInfo);
				if (member) self.channel.emit('pusher:member_added', member);
			});
			presence.on('leave', function(id) {
				if (!self.entered) return;
				var member = self.members.removeMember(id.clientId);
				if (member) self.channel.emit('pusher:member_removed', member);
			});
			presence.enter(function(err) {
				// Record initial presence state
				var m = presence.get();
				if (m) {
					for (var i=0; i<m.length; i++)
						self.members.addMember(m[i].clientId, m[i].clientData);
				}
				self.entered = true;
				self._sendEvent('pusher:subscription_succeeded', self.members);
			});
		}

		// Event handling
		this.channel.on(function(message) {
			if ((this.event === 'attached') && self.isPresence)
				return;	// Don't generate the pusher:subscription_succeeded event here, do it when we get the 'entered' event for the presence channel
			if (typeof(message) === 'undefined') message = {};		// Pusher callback semantics
			var event = channelStates[this.event] || this.event;	// Note: 'this' is an event object, not the channel object
			self._sendEvent(event, message);
		});
	}

	/**
	 * Internal: Send an event to bound listeners
	 * @param event: the name of the event
	 * @param message: parameter to pass to the handler
	 */
	PusherChannel.prototype._sendEvent = function(event, message) {
		for (var i=0; i<this.bind_alls.length; i++) {
			this.bind_alls[i](event, message);
		}
		var eventBindings = this.bindings[event];
		if (eventBindings) {
			for (var i=0; i<eventBindings.length; i++)
				eventBindings[i](message);
		}
	};

	/**
	 * Bind to all channel events.
	 * @param callback: the function to call when any event occurs
	 */
	PusherChannel.prototype.bind_all = function(callback) {
		this.bind_alls.push(callback);
	};

	/**
	 * Unbind from a channel event.
	 * @param event: the name of the event to be unbound
	 * @param callback: the function to be removed from the
	 * list of callbacks for this event
	 */
	PusherChannel.prototype.unbind = function(event, callback) {
		var eventBindings = this.bindings[event];
		log('PusherChannel::unbind: Unbinding callback from event '+event);
		if (eventBindings) {
			for (var i=0; i<eventBindings.length; i++) {
				if (eventBindings[i] === callback) {
					// Remove this callback
					log('PusherChannel::unbind: Found callback record to remove');
					eventBindings.splice(i, 1);
					if (eventBindings.length == 0) {
						// There are no registered bindings left, remove the
						// underlying callback for this event
						log('PusherChannel::unbind: All bindings for this event have been removed');
						this.channel.off(event, this.channelBindCallback);
						delete this.bindings[event];
					}
					break;
				}
			}
		}
	}

	/**
	 * Bind to a channel event.
	 * @param event: the name of the event
	 * to be associated with this event handler.
	 * @param callback: the function to call on the occurrence
	 * of the event.
	 */
	PusherChannel.prototype.bind = function(event, callback) {
		if (!this.bindings[event]) {
			this.bindings[event] = [callback];
		} else {
			this.bindings[event].push(callback);
		}
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
		data = JSON.stringify(data);
		log('PusherChannel::trigger: Event '+event+', data '+ data);
		if (!this.active) { log('PusherChannel::trigger: Inactive'); return true; }
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
		this.count = 0;
		this.members = {};
		if(myId) {
			this.myID = myId;
			this.me = this.addMember(myId, myInfo);
		}
	}

	/**
	 * Internal: add a Member to this Members
	 * @param member: member to be added. If the member
	 * is already present, the info of the existing member
	 * is updated.
	 */
	Members.prototype.addMember = function(id, info) {
		if (typeof(info) === 'undefined') info = {};
		if (id in this.members) {
			this.members[id] = info;
		} else {
			this.members[id] = info;
			this.count++;
		}
		return new Member(id, info);
	};

	/**
	 * Internal: remove a Member from this Members if present
	 * @param member: the Member to remove.
	 * Any member whose id matches the id of the given member
	 * will be removed.
	 */
	Members.prototype.removeMember = function(id) {
		if (id in this.members) {
			var info = this.members[id];
			delete this.members[id];
			this.count--;
			return new Member(id, info);
		}
		return undefined;
	};

	/**
	 * Call a function for each Member.
	 * @param callback: the function to be called for
	 * each Member.
	 */
	Members.prototype.each = function(callback) {
		for(var id in this.members) {
			callback(new Member(id, this.members[id]));
		}
	};

	/**
	 * Retrieve a Member given an id
	 * @param userId: the id of the Member to retrieve.
	 * @returns a Member
	 */
	Members.prototype.get = function(userId) {
		return this.members[userId];
	};

	if(typeof(window) === 'undefined')
		module.exports = Pusher;
	else
		window.Pusher = Pusher;
})();
