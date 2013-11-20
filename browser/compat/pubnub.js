"use strict";
(function() {
	// Get defaults from pdiv if it can be found

	var pdiv = (typeof(document) === 'undefined') ? null : document.getElementById('pubnub');
	var pDefaults = {};
	pDefaults.publish_key = (pdiv && pdiv.getAttribute('publish_key')) || '';
	pDefaults.subscribe_key = (pdiv && pdiv.getAttribute('subscribe_key')) || '';
	pDefaults.origin = (pdiv && pdiv.getAttribute('origin')) || '';
	pDefaults.uuid = (pdiv && pdiv.getAttribute('uuid')) || '';
	pDefaults.ssl = (pdiv && (pdiv.getAttribute('ssl') == 'on'));

	var subscriptions = {};
	var PUBNUB = {};
	var noop = function() {};
	var log = (console && console.log) || noop;

	// Ably library should have been included if running in a browser prior to including this
	// compatibility library:
	//
	//  <script src="http://cdn.ably.io/lib/ably.min.js"></script>
	//  <script src="compat/pubnub.js"></script>
	//
	// If this hasn't happened, assume we're running under node.js, and attempt to include it
	if (typeof(Ably) === 'undefined') {
		var Ably = require('../..');
	}

	var notifyConnectionEvent = function(event, response) {
		for(var channel in subscriptions) {
			var s = subscriptions[channel];
			if (event == 'connect') {
				if (s.hasConnectedOnce) {
					s.reconnect && s.reconnect(channel);
				} else { 
					s.connect && s.connect(channel);
					s.hasConnectedOnce = true;
				}
			} else {
				s[event] && s[event](channel);
			}
		}
	};

	var isArray = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/**
	 * Initialize the pubnub instance
	 * @param args.noleave (boolean, optional, unsupported): Disable presence leave events
	 * @param args.keepalive (number, optional, unsupported): Interval between keepalive pings
	 * @param args.origin (string, optional): Hostname and port running Ably Realtime service to connect to
	 * @param args.tlsorigin (string, optional, nonstandard): Hostname and port running Ably Realtime service to connect to over TLS
	 * @param args.publish_key (string, unsupported): Key to use for publishing messages. See ably_key and ably_app instead
	 * @param args.subscribe_key (string, unsupported): Key to use for subscribing to channels. See ably_key and ably_app instead
	 * @param args.uuid (string, optional): Unique user ID to identify client in presence system
	 * @param args.windowing (number, optional, unsupported): Message delivery optimization parameter
	 * @param args.jsonp (boolean, optional, unsupported): Force use of JSONP transport
	 * @param args.ably_key (string, nonstandard): Ably key to authenticate with
	 */
	PUBNUB.init = function(args, callback) {
		callback = args.callback || callback;
		var ably_key = args.ably_key;
		var ssl = args.ssl || pDefaults.ssl;
		var origin = args.origin || pDefaults.origin;
		var tlsorigin = args.tlsorigin || '';
		var uuid = args.uuid || pDefaults.uuid;
		if (!ably_key) return log('Missing ably_key');

		// Set up options for Ably.Realtime()
		var opts = {
			key:ably_key, encrypted: ssl //, log:{level:4}
		};
		if (uuid && (uuid.length != 0))
			opts.clientId = uuid;
		if (origin && (origin.length != 0)) {
			var p = origin.split(':');
			opts.host = opts.wsHost = p[0];
			if (p.length > 1)
				opts.port = p[1];
		}
		if (tlsorigin && (tlsorigin.length != 0)) {
			// Note: Only the port number is used here, the hostnames are the same as for non-TLS
			var p = origin.split(':');
			if (p.length > 1)
				opts.tlsPort = p[1];
		}

		// Start up Ably connection
		PUBNUB.ably = new Ably.Realtime(opts);
		PUBNUB.ably.connection.on(function(stateChange) {
			switch(stateChange.current) {
			case 'connected':
				notifyConnectionEvent('connect');
				break;
			case 'disconnected':
			case 'suspended':
			case 'closed':
				notifyConnectionEvent('disconnect', stateChange.reason);
				break;
			case 'failed':
				notifyConnectionEvent('error', stateChange.reason);
				break;
			}
		});

		return PUBNUB;
	}

	/**
	 * Close down the pubnub instance, dropping any connections to the server. Non-standard
	 */
	PUBNUB.shutdown = function(callback) {
		var closeListener = function(stateChange) {
			PUBNUB.ably.connection.off('closed', closeListener);
			callback(stateChange.current);
		};
		PUBNUB.ably.connection.on('closed', closeListener);
		PUBNUB.ably.close();
	}

	/**
	 * Obtain the event history for a given channel
	 * @param args.callback (optional): function to call with the result;
	 * @param args.limit (optional): max number of events to return;
	 * @param args.channel: the name of the channel
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.history = function(args, callback) {
		callback = args.callback || callback;
		var limit = args.limit || 100;
		var channel = args.channel;
		if (!channel) return log('Missing Channel');
		if (!callback) return log('Missing Callback');
		/* FIXME: implement this */
	};

	/**
	 * Obtain the current system time
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.time = function(callback) {
		/* FIXME: implement this */
	};

	/**
	 * Publish a message on a given channel
	 * @param args.callback (optional): function to call with the result;
	 * @param args.channel: the name of the channel
	 * @param args.message: the data to send; either String, or Object
	 * which will be sent as its JSON text.
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.publish = function(args, callback) {
		callback = callback || args.callback || noop;
		var message = args.message;
		var channel = args.channel;
		var error = args.error || noop;
		var timestamp = Date.now();
		if (!message) return log('Missing Message');
		if (!channel) return log('Missing Channel');

		var ablyChannel = PUBNUB.ably.channels.get(channel);
		ablyChannel.publish("", message, function(err) {
			if (err != null) {
				error({error : err});
			} else {
				// Note: timestamp is not exactly the same as the Ably message timestamp
				// Note: The pubnub timestamp seems to be in an odd unit - 10ths of a microsecond?
				callback([1, "Sent", (timestamp*10000).toString()]);
			}
		});
	};

	/**
	 * Subscribe for messages on a given channel
	 * @param args.callback (optional): function to call with each received message;
	 * @param args.channel: the name of the channel, or an array or comma-separated list of channels
	 * @param args.connect (optional): a function to call once the connection is established
	 * @param args.restore (optional): a function to call once the connection is re-established
	 * @param args.reconnect (optional): a function to call once the connection is re-established
	 * (FIXME: check difference vs restore)
	 * following a disconnection
	 * @param args.disconnect (optional): a function to call once an established connection
	 * is dropped
	 * @param args.error (optional): a function to call if a permanent failure has occurred on
	 * the connection
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.subscribe = function(args, callback) {
		callback = callback || args.callback;
		var channel = args.channel;
		if (!channel) return log('Missing Channel');
		if (!callback) return log('Missing Callback');
		if (!isArray(channel))
			channel = channel.split(',');

		var subscr = function(channel, callback, args) {
			if(subscriptions[channel]) return log('Already Connected');
			var cb = function(message) { callback(message.data); };

			// Create channel and register for message callbacks
			var ablyChannel = PUBNUB.ably.channels.get(channel);
			ablyChannel.subscribe(cb);

			// Record channel in list of subscribed channels
			var subscription = {
				callback: cb,
				ablyChannel: ablyChannel,
				restore: args.restore || noop,
				error: args.error || noop,
				connect: args.connect || noop,
				reconnect: args.reconnect || noop,
				disconnect: args.disconnect || noop,
				hasConnectedOnce: false
			};
			subscriptions[channel] = subscription;

			// Initial state callback
			if (PUBNUB.ably.connection.state == 'connected') {
				subscription.hasConnectedOnce = true;
				subscription.connect && subscription.connect(channel);
			}
		};

		// Subscribe to all channels			
		for (var i=0; i<channel.length; i++)
			subscr(channel[i], callback, args);
	};

	/**
	 * Unsubscribe for messages on a given channel
	 * @param args.callback (optional): function to call once complete;
	 * @param args.channel: the name of the channel
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.unsubscribe = function(args, callback) {
		callback = callback || args.callback || noop;
		var channel = args.channel;
		if (!channel) return;
		if (!isArray(channel))
			channel = channel.split(',');

		var unsubscr = function(channel, callback) {
			var subscription = channel && subscriptions[channel];
			if(!subscription) return;

			subscription.ablyChannel.unsubscribe(subscription.callback);
			delete subscriptions[channel];

			callback({action: "leave"});
		};

		// Unsubscribe from all channels
		for (var i=0; i<channel.length; i++)
			unsubscr(channel[i], callback);
	};

	if(typeof(window) === 'undefined')
		module.exports = PUBNUB;
	else
		window.PUBNUB = PUBNUB;
})();
