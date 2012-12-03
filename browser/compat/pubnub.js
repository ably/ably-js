window.PUBNUB = window.PUBNUB || (function() {
	var pdiv = document.getElementById('pubnub');
	var app_id = (pdiv && pdiv.getAttribute('app-id')) || '';
	var key = (pdiv && pdiv.getAttribute('key')) || '';
	var token = (pdiv && pdiv.getAttribute('token')) || '';
	var ssl = (pdiv && (pdiv.getAttribute('ssl') == 'on'));
	var origin = (pdiv && pdiv.getAttribute('origin')) || '';
	var subscriptions = {};
	var hasConnectedOnce = false;

	var noop = function() {};
	var log = (console && console.log) || noop;

	var notifyConnectionEvent = function(event, response) {
		for(var channel in subscriptions)
			subscriptions[channel][event] && subscriptions[channel][event](response);
	};

	var ably = new Ably({
		applicationId: app_id,
		key: key,
		authToken: token,
		encrypted: ssl,
		host: origin,
		log:{handler:log, level:1}
	});

	ably.connection.on(function(stateChange) {
		switch(stateChange.current) {
		case 'connected':
			notifyConnectionEvent(hasConnectedOnce ? 'restore' : 'connect');
			hasConnectedOnce = true;
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
		if (!message) return log('Missing Message');
		if (!channel) return log('Missing Channel');

		(ably.channel(channel) || ably.attach(channel)).publish('message', message, function(err) {
			/* FIXME: understand pubnub callback conventions */
			callback(err);
		});
	};

	/**
	 * Subscribe for messages on a given channel
	 * @param args.callback (optional): function to call with each received message;
	 * @param args.channel: the name of the channel
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

		if(subscriptions[channel]) return log('Already Connected');

		var cb = function(err) {
			/* FIXME: understand pubnub callback conventions */
			callback(err);
		};

		var ablyChannel = (ably.channel(channel) || ably.attach(channel));
		ablyChannel.on('message', cb);
		var subscription = {
			callback: cb,
			ablyChannel: ablyChannel,
			restore: args.restore || noop,
			error: args.error || noop,
			connect: args.connect || noop,
			reconnect: args.reconnect || noop,
			disconnect: args.disconnect || noop
		};
		subscriptions[channel] = subscription;
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
		var subscription = channel && subscriptions[channel];
		if(!subscription) return;
		
		subscription.ablyChannel.off(subscription.callback);
		delete subscriptions[channel];
		/* FIXME: understand pubnub callback conventions */
		callback();
	};

	return PUBNUB;
})();
