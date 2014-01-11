(function() {
	"use strict";

	// Get defaults from pdiv if it can be found
	var pdiv = (typeof(document) === 'undefined') ? null : document.getElementById('pubnub');
	var pDefaults = {};
	pDefaults.publish_key = (pdiv && pdiv.getAttribute('publish_key')) || '';
	pDefaults.subscribe_key = (pdiv && pdiv.getAttribute('subscribe_key')) || '';
	pDefaults.origin = (pdiv && pdiv.getAttribute('origin')) || '';
	pDefaults.uuid = (pdiv && pdiv.getAttribute('uuid')) || '';
	pDefaults.ssl = (pdiv && (pdiv.getAttribute('ssl') == 'on'));

	var channels = {};
	var subscriptions = {};
	var cipherParamsPendingMessages = [];
	var PUBNUB = {};
	var noop = function() {};
	var log = (console && console.log.bind(console)) || noop;

	// Ably library should have been included if running in a browser prior to including this
	// compatibility library:
	//
	//  <script src="http://cdn.ably.io/lib/ably.min.js"></script>
	//  <script src="compat/pubnub.js"></script>
	//
	// If this hasn't happened, assume we're running under node.js, and attempt to include it
	if (typeof(window) !== 'undefined')
		PUBNUB.Ably = window.Ably;
	else if (typeof(Ably) !== 'undefined')
		PUBNUB.Ably = Ably;
	else
		PUBNUB.Ably = require('../..');

	function getChannel(name) {
		var channel = channels[name];
		if (!channel) {
			channel = PUBNUB.ably.channels.get(name);
			if (PUBNUB.ablyCipherParams)
				channel.setOptions({encrypted:true, cipherParams: PUBNUB.ablyCipherParams});
			channels[name] = channel;
		}
		return channel;
	}

	function cipherParamsResponse(err, params) {
		delete PUBNUB.ablyCipherParamsPending;

		if (err) return log('Unable to set up encryption parameters for secure messaging');
		PUBNUB.ablyCipherParams = params;

		// Set up cipher params on any channels that have been created already
		for (var name in channels)
			channels[name].setOptions({encrypted:true, cipherParams: PUBNUB.ablyCipherParams});

		// Send any messages which were waiting for the cipherParams to be returned
		for (var i=0; i<cipherParamsPendingMessages.length; i++) {
			var msg = cipherParamsPendingMessages[i];
			PUBNUB.publish({ channel: msg.channel, callback: msg.callback, error: msg.error, message: msg.message });
		}
		cipherParamsPendingMessages = [];
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
	 * Initialize the pubnub instance (with option to use message encryption)
	 * @param args: As with init, but with addition of 'cipher_key' option
	 * @param args.cipher_key: 
	 */
	PUBNUB.secure = function(args, callback) {
		if (!args.cipher_key) return log('Missing cipher_key');
		return PUBNUB.init(args, callback);
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
			key:ably_key, tls: ssl //,log:{level:4}
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
			var p = tlsorigin.split(':');
			if (p.length > 1)
				opts.tlsPort = p[1];
		}

		// Start up Ably connection
		PUBNUB.ablyOptions = opts;
		PUBNUB.ably = new PUBNUB.Ably.Realtime(opts);
		if (args.cipher_key) {
			PUBNUB.ablyCipherParamsPending = true;
			PUBNUB.Ably.Realtime.Crypto.getDefaultParams(args.cipher_key, cipherParamsResponse);
		}

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
	 * Get the uuid that PUBNUB was initialised with. Implemented in standard PUBNUB library but not documented.
	 *
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.get_uuid = function() {
		if (PUBNUB.ablyOptions)
			return PUBNUB.ablyOptions.clientId;
		return null;
	};

	/**
	 * Close down the pubnub instance, dropping any connections to the server. Non-standard
	 */
	PUBNUB.shutdown = function(callback) {
		// Close connection
		var ablyConnection = PUBNUB.ably.connection;
		var closeListener = function(stateChange) {
			ablyConnection.off('closed', closeListener);
			callback(stateChange.current);
		};
		PUBNUB.ably.connection.on('closed', closeListener);
		PUBNUB.ably.close();

		// Reset state
		delete PUBNUB.ably;
		delete PUBNUB.ablyOptions;
		delete PUBNUB.ablyCipherParams;
		subscriptions = {};
		channels = {};
		cipherParamsPendingMessages = [];
	}

	/**
	 * Obtain the event history for a given channel
	 * @param args.callback: function to call with the result;
	 * @param args.channel: the name of the channel
	 * @param args.count (optional): max number of events to return;
	 * @param args.reverse (optional, boolean): forward or reverse
	 * @param args.error (optional): error callback
	 * @param args.start (optional): start timestamp
	 * @param args.end (optional): end timestamp
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.history = function(args, callback) {
		callback = args.callback || callback;
		var limit = args.count || 100;
		var channel = args.channel;
		var error = args.error || noop;
		var reverse = args.reverse || false;
		if (!channel) return log('Missing Channel');
		if (!callback) return log('Missing Callback');

		var ch = getChannel(channel);

		var hcb = function(err, result) {
			if (err != null) {
				if (Object.keys(err).length != 0) {
					error(err);
				}
			} else {
				var presults = [];
				var startTime = null, endTime = null;
				for (var i=0; i<result.length; i++) {
					var h = result[i];
					if (!startTime)
						startTime = endTime = h.timestamp;
					presults.push(h.data);
				}
				callback([presults, startTime, endTime]);
			}
		};

		var params = {
			direction : reverse ? 'backwards' : 'forwards',
			limit : limit
		};
		if (args.start)
			params.start = Number(args.start) / 10000;
		if (args.end)
			params.end = Number(args.end) / 10000;
		ch.history(params, hcb);
	};

	/**
	 * Obtain the current system time
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.time = function(callback) {
		PUBNUB.ably.time(function(err, time) {
			if (err) {
				log('PUBNUB.time: Error: '+err);
				callback(0);
			} else {
				// Convert to odd unit that pubnub uses
				callback(Number(time)*10000);
			}
		});
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

		// If waiting for cipherParams, queue the message
		if (PUBNUB.ablyCipherParamsPending) {
			cipherParamsPendingMessages.push({ channel: channel, message: message, error: error, callback: callback });
		} else {
			var ablyChannel = getChannel(channel);
			ablyChannel.publish("", message, function(err) {
				if (err != null) {
					error({error : err});
				} else {
					// Note: timestamp is not exactly the same as the Ably message timestamp
					// Note: The pubnub timestamp seems to be in an odd unit - 10ths of a microsecond?
					callback([1, "Sent", (timestamp*10000).toString()]);
				}
			});
		}
	};

	/**
	 * Get current presence list for a channel
	 * @param args.callback (optional): function to call when complete
	 * @param args.channel: the name of the channel
	 * @param args.error (optional): function to call on error
	 * 
	 * Compatibility: TBD
	 */
	PUBNUB.here_now = function(args, callback) {
		callback = callback || args.callback;
		var error = args.error || noop;
		var channel = args.channel;
		if (!channel) { error('Missing channel'); return; }
		if (!callback) { error('Missing callback'); return; }
		var s = subscriptions[channel];
		if (!s) { error('Not subscribed to channel'); return; }

		var presence = s.ablyChannel.presence.get();
		if (!presence) { error('Presence not available for channel'); return; }
		var uuids = new Array(presence.length);
		for (var i=0; i<presence.length; i++) uuids[i] = presence[i].clientId;
		callback({
			uuids : uuids,
			occupancy : uuids.length
		});
	};

	/**
	 * Generate a random uuid
	 * @param callback (optional): function to call with generated uuid
	 * @return randomly generated uuid. The same value is passed to the callback if specified
	 */
	PUBNUB.uuid = function(callback) {
		function randomid(length) {
		    var text = "";
		    var possible = "abcdef0123456789";
		    for(var i=0; i<length; i++)
				text += possible.charAt(Math.floor(Math.random() * possible.length));
		    return text;
		}
		var v = randomid(8)+"-"+randomid(4)+"-"+randomid(4)+"-"+randomid(4)+"-"+randomid(12);
		callback && callback(v);
		return v;
	};

	/**
	 * Subscribe for messages on a given channel
	 * @param args.callback (optional): function to call with each received message;
	 * @param args.channel: the name of the channel, or an array or comma-separated list of channels
	 * @param args.connect (optional): a function to call once the connection is established
	 * @param args.restore (optional): a boolean saying whether connection should be automatically
	 * restored if it is dropped
	 * @param args.reconnect (optional): a function to call once the connection is re-established
	 * @param args.disconnect (optional): a function to call once an established connection
	 * is dropped
	 * @param args.error (optional): a function to call if a permanent failure has occurred on
	 * the connection
	 * @param args.presence (optional): a function to call when presence events for the channel
	 * are received
	 * 
	 * Compatibility:
	 * TBD
	 */
	PUBNUB.subscribe = function(args, callback) {
		callback = callback || args.callback || args.message;
		var channel = args.channel;
		if (!channel) return log('Missing Channel');
		if (!callback) return log('Missing Callback');
		if (!isArray(channel))
			channel = channel.split(',');

		var subscr = function(channel, callback, args) {
			if(subscriptions[channel]) return log('Already Connected');
			var cb = function(message) { callback(message.data); };

			// Create channel and register for message callbacks and presence events if necessary
			var ablyChannel = getChannel(channel);
			var presenceCb = args.presence;
			if (presenceCb) {
				var presenceEventCb = function(data) {
					if (data.action == 'update')
						return;
					presenceCb({
						action : (data.action == 'enter') ? 'join' : 'leave',
						uuid : data.clientId,
						timestamp : Date.now() * 10000,
						occupancy : ablyChannel.presence.get().length
					});
				} 
				ablyChannel.presence.on('enter', function(data) { data.action = 'enter'; presenceEventCb(data); });
				ablyChannel.presence.on('leave', function(data) { data.action = 'leave'; presenceEventCb(data); });
			}
			ablyChannel.subscribe(cb);

			// Record channel in list of subscribed channels
			var subscription = {
				callback: cb,
				ablyChannel: ablyChannel,
				error: args.error || noop,
				connect: args.connect || noop,
				reconnect: args.reconnect || noop,
				disconnect: args.disconnect || noop,
				presence: args.presence || noop,
				hasConnectedOnce: false
			};
			subscriptions[channel] = subscription;

			// Initial state callback
			if (PUBNUB.ably.connection.state == 'connected') {
				subscription.hasConnectedOnce = true;
				subscription.connect && subscription.connect(channel);
			}

			// Publish a presence event if a UUID was specified on init
			if (PUBNUB.ablyOptions.clientId) {
				ablyChannel.presence.enter(function(err) {});
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

