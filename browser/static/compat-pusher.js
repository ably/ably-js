/**
 * @license Copyright 2016, Ably
 *
 * Ably JavaScript Library v0.8.25
 * https://github.com/ably/ably-js
 *
 * Ably Realtime Messaging
 * https://www.ably.io
 *
 * Released under the Apache Licence v2.0
 */

(function() {

var EventEmitter = (function() {

	/* public constructor */
	function EventEmitter() {
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	}

	/* Call the listener, catch any exceptions and log, but continue operation*/
	function callListener(eventThis, listener, args) {
		try {
			listener.apply(eventThis, args);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + e.stack);
		}
	}

	/**
	 * Remove listeners that match listener
	 * @param targetListeners is an array of listener arrays or event objects with arrays of listeners
	 * @param listener the listener callback to remove
	 * @param eventFilter (optional) event name instructing the function to only remove listeners for the specified event
	 */
	function removeListener(targetListeners, listener, eventFilter) {
		var listeners, idx, eventName, targetListenersIndex;

		for (targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
			listeners = targetListeners[targetListenersIndex];
			if (eventFilter) { listeners = listeners[eventFilter]; }

			if (Utils.isArray(listeners)) {
				while ((idx = Utils.arrIndexOf(listeners, listener)) !== -1) {
					listeners.splice(idx, 1);
				}
				/* If events object has an event name key with no listeners then
				   remove the key to stop the list growing indefinitely */
				if (eventFilter && (listeners.length === 0)) {
					delete targetListeners[targetListenersIndex][eventFilter];
				}
			} else if (Utils.isObject(listeners)) {
				/* events */
				for (eventName in listeners) {
					if (listeners.hasOwnProperty(eventName) && Utils.isArray(listeners[eventName])) {
						removeListener([listeners], listener, eventName);
					}
				}
			}
		}
	}

	/**
	 * Add an event listener
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.on = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.any.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.any.push(listener);
		} else {
			var listeners = (this.events[event] || (this.events[event] = []));
			listeners.push(listener);
		}
	};

	/**
	 * Remove one or more event listeners
	 * @param event (optional) the name of the event whose listener
	 *        is to be removed. If not supplied, the listener is
	 *        treated as an 'any' listener
	 * @param listener (optional) the listener to remove. If not
	 *        supplied, all listeners are removed.
	 */
	EventEmitter.prototype.off = function(event, listener) {
		if(arguments.length == 0 || (Utils.isEmptyArg(event) && Utils.isEmptyArg(listener))) {
			this.any = [];
			this.events = {};
			this.anyOnce = [];
			this.eventsOnce = {};
			return;
		}
		if(arguments.length == 1) {
			if(typeof(event) == 'function') {
				/* we take this to be the listener and treat the event as "any" .. */
				listener = event;
				event = null;
			}
			/* ... or we take event to be the actual event name and listener to be all */
		}

		if(Utils.isEmptyArg(event)) {
			/* "any" case */
			if(listener) {
				removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
			} else {
				this.any = [];
				this.anyOnce = [];
			}
			return;
		}
		/* "normal" case where event is an actual event */
		if(listener) {
			removeListener([this.events, this.eventsOnce], listener, event);
		} else {
			delete this.events[event];
			delete this.eventsOnce[event];
		}
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	EventEmitter.prototype.listeners = function(event) {
		if(event) {
			var listeners = (this.events[event] || []);
			if(this.eventsOnce[event])
				Array.prototype.push.apply(listeners, this.eventsOnce[event]);
			return listeners.length ? listeners : null;
		}
		return this.any.length ? this.any : null;
	};

	/**
	 * Emit an event
	 * @param event the event name
	 * @param args the arguments to pass to the listener
	 */
	EventEmitter.prototype.emit = function(event  /* , args... */) {
		var args = Array.prototype.slice.call(arguments, 1);
		var eventThis = {event:event};

		if(this.anyOnce.length) {
			var listeners = this.anyOnce;
			this.anyOnce = [];
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.once = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.anyOnce.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.anyOnce.push(listener);
		} else {
			var listeners = (this.eventsOnce[event] || (this.eventsOnce[event] = []));
			listeners.push(listener);
		}
	};

	/**
	 * Private API
	 *
	 * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
	 * @param targetState the name of the state event to listen to
	 * @param currentState the name of the current state of this object
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.whenState = function(targetState, currentState, listener /* ...listenerArgs */) {
		var eventThis = {event:targetState},
				listenerArgs = Array.prototype.slice.call(arguments, 3);

		if((typeof(targetState) !== 'string') || (typeof(currentState) !== 'string'))
			throw("whenState requires a valid event String argument");
		if (typeof(listener) !== 'function')
			throw("whenState requires a valid listener argument");

		if(targetState === currentState) {
			callListener(eventThis, listener, listenerArgs);
		} else {
			this.once(targetState, listener);
		}
	}

	return EventEmitter;
})();

var Utils = (function() {
	var isBrowser = (typeof(window) == 'object');

	function Utils() {}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.mixin = function(target, src) {
		if(src) {
			var hasOwnProperty = src.hasOwnProperty;
			for(var key in src) {
				if(!hasOwnProperty || hasOwnProperty.call(src, key)) {
					target[key] = src[key];
				}
			}
		}
		return target;
	};

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.copy = function(src) {
		return Utils.mixin({}, src);
	};

	/*
	 * Determine whether or not a given object is
	 * an array.
	 */
	Utils.isArray = Array.isArray || function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/*
	 * Ensures that an Array object is always returned
	 * returning the original Array of obj is an Array
	 * else wrapping the obj in a single element Array
	 */
	Utils.ensureArray = function(obj) {
		if (Utils.isArray(obj)) {
			return ob;
		} else {
			return [obj];
		}
	}

	/* ...Or an Object (in the narrow sense) */
	Utils.isObject = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Object]';
	};

	/*
	 * Determine whether or not an object contains
	 * any enumerable properties.
	 * ob: the object
	 */
	Utils.isEmpty = function(ob) {
		for(var prop in ob)
			return false;
		return true;
	};

	/*
	 * Determine whether or not an argument to an overloaded function is
	 * undefined (missing) or null.
	 * This method is useful when constructing functions such as (WebIDL terminology):
	 *   off([TreatUndefinedAs=Null] DOMString? event)
	 * as you can then confirm the argument using:
	 *   Utils.isEmptyArg(event)
	 */

	Utils.isEmptyArg = function(arg) {
		return arg === null || arg === undefined;
	}

	/*
	 * Perform a simple shallow clone of an object.
	 * Result is an object irrespective of whether
	 * the input is an object or array. All
	 * enumerable properties are copied.
	 * ob: the object
	 */
	Utils.shallowClone = function(ob) {
		var result = new Object();
		for(var prop in ob)
			result[prop] = ob[prop];
		return result;
	};

	/*
	 * Clone an object by creating a new object with the
	 * given object as its prototype. Optionally
	 * a set of additional own properties can be
	 * supplied to be added to the newly created clone.
	 * ob:            the object to be cloned
	 * ownProperties: optional object with additional
	 *                properties to add
	 */
	Utils.prototypicalClone = function(ob, ownProperties) {
		function F() {}
		F.prototype = ob;
		var result = new F();
		if(ownProperties)
			Utils.mixin(result, ownProperties);
		return result;
	};

	/*
	 * Declare a constructor to represent a subclass
	 * of another constructor
	 * See node.js util.inherits
	 */
	Utils.inherits = (typeof(require) !== 'undefined' && require('util').inherits) || function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Utils.prototypicalClone(superCtor.prototype, { constructor: ctor });
	};

	/*
	 * Determine whether or not an object has an enumerable
	 * property whose value equals a given value.
	 * ob:  the object
	 * val: the value to find
	 */
	Utils.containsValue = function(ob, val) {
		for(var i in ob) {
			if(ob[i] == val)
				return true;
		}
		return false;
	};

	Utils.intersect = function(arr, ob) { return Utils.isArray(ob) ? Utils.arrIntersect(arr, ob) : Utils.arrIntersectOb(arr, ob); };

	Utils.arrIntersect = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var member = arr1[i];
			if(Utils.arrIndexOf(arr2, member) != -1)
				result.push(member);
		}
		return result;
	};

	Utils.arrIntersectOb = function(arr, ob) {
		var result = [];
		for(var i = 0; i < arr.length; i++) {
			var member = arr[i];
			if(member in ob)
				result.push(member);
		}
		return result;
	};

	Utils.arrSubtract = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var element = arr1[i];
			if(Utils.arrIndexOf(arr2, element) == -1)
				result.push(element);
		}
		return result;
	};

	Utils.arrIndexOf = Array.prototype.indexOf
		? function(arr, elem, fromIndex) {
			return arr.indexOf(elem,  fromIndex);
		}
		: function(arr, elem, fromIndex) {
			fromIndex = fromIndex || 0;
			var len = arr.length;
			for(;fromIndex < len; fromIndex++) {
				if(arr[fromIndex] === elem) {
					return fromIndex;
				}
			}
			return -1;
		};

	Utils.arrIn = function(arr, val) {
		return Utils.arrIndexOf(arr, val) !== -1;
	};

	Utils.arrDeleteValue = function(arr, val) {
		var idx = Utils.arrIndexOf(arr, val);
		var res = (idx != -1);
		if(res)
			arr.splice(idx, 1);
		return res;
	};

	Utils.arrWithoutValue = function(arr, val) {
		var newArr = arr.slice();
		Utils.arrDeleteValue(newArr, val);
		return newArr;
	};

	/*
	 * Construct an array of the keys of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.keysArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(prop);
		}
		return result;
	};

	/*
	 * Construct an array of the values of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.valuesArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(ob[prop]);
		}
		return result;
	};

	Utils.arrForEach = Array.prototype.forEach ?
		function(arr, fn) {
			arr.forEach(fn);
		} :
		function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				fn(arr[i], i, arr);
			}
		};

	/* Useful when the function may mutate the array */
	Utils.safeArrForEach = function(arr, fn) {
		return Utils.arrForEach(arr.slice(), fn);
	};

	Utils.arrMap = Array.prototype.map ?
		function(arr, fn) {
			return arr.map(fn);
		} :
		function(arr, fn)	{
			var result = [],
				len = arr.length;
			for(var i = 0; i < len; i++) {
				result.push(fn(arr[i], i, arr));
			}
			return result;
		};

	Utils.arrEvery = Array.prototype.every ?
		function(arr, fn) {
			return arr.every(fn);
		} : function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				if(!fn(arr[i], i, arr)) {
					return false;
				};
			}
			return true;
		};

	Utils.nextTick = isBrowser ? function(f) { setTimeout(f, 0); } : process.nextTick;

	var contentTypes = {
		json:   'application/json',
		jsonp:  'application/javascript',
		xml:    'application/xml',
		html:   'text/html',
		msgpack: 'application/x-msgpack'
	};

	Utils.defaultGetHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json;
		return {
			accept: accept,
			'X-Ably-Version': Defaults.apiVersion
		};
	};

	Utils.defaultPostHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json,
			contentType = (format === 'json') ? contentTypes.json : contentTypes[format];

		return {
			accept: accept,
			'content-type': contentType,
			'X-Ably-Version': Defaults.apiVersion
		};
	};

	Utils.arrPopRandomElement = function(arr) {
		return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
	};

	Utils.toQueryString = function(params) {
		var parts = [];
		if(params) {
			for(var key in params)
				parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
		}
		return parts.length ? '?' + parts.join('&') : '';
	};

	Utils.parseQueryString = function(query) {
		var match,
			search = /([^?&=]+)=?([^&]*)/g,
			result = {};

		while (match = search.exec(query))
			result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);

 		return result;
	};

	Utils.now = Date.now || function() {
		/* IE 8 */
		return new Date().getTime();
	};

	Utils.inspect = function(x) {
		return JSON.stringify(x);
	};

	Utils.inspectError = function(x) {
		return (x && x.constructor.name == 'ErrorInfo') ? x.toString() : Utils.inspect(x);
	};

	Utils.randStr = function() {
		return String(Math.random()).substr(2);
	};

	return Utils;
})();

(function() {
	"use strict";

	// Ably library should have been included if running in a browser prior to including this
	// compatibility library:
	//
	//  <script src="http://cdn.ably.io/lib/ably.min.js"></script>
	//  <script src="compat/pusher.js"></script>
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
			key: applicationKey, tls: encrypted, log: {level:4}
		};
		if (options.ablyClientId) opts.clientId = options.ablyClientId;
		if (options.authEndpoint) opts.authUrl = options.authEndpoint;
		if (options.auth && options.auth.params) opts.authParams = options.auth.params;
		if (options.auth && options.auth.headers) opts.authHeaders = options.auth.headers;
		if (origin && (origin.length != 0)) {
			var p = origin.split(':');
			opts.realtimeHost = opts.restHost = p[0];
			if (p.length > 1)
				opts.port = p[1];
		}
		if (tlsorigin && (tlsorigin.length != 0)) {
			// Note: Only the port number is used here, the hostnames are the same as for non-TLS
			var p = tlsorigin.split(':');
			if (p.length > 1)
				opts.tlsPort = p[1];
		}

		var realtime = (Ably || window.Ably).Realtime;
		var ably = this.ably = new realtime(opts);
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
			self.channel.emit(message.name, message.data);
		});
		this.bindings = {};
		this.bind_alls = [];

		if (this.isPresence) {
			var presence = this.channel.presence;
			this.entered = false;
			presence.subscribe('enter', function(id) {
				if (!self.entered) return;
				if (id.clientId === self.members.myID) return;
				var member = self.members.addMember(id.clientId, id.clientInfo);
				if (member) self.channel.emit('pusher:member_added', member);
			});
			presence.subscribe('leave', function(id) {
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
		log('PusherChannel::trigger: Event '+event+', data '+JSON.stringify(data));
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

})();
