var Realtime = (function() {

	function Realtime(options) {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
		Rest.call(this, options);
		this.connection = new Connection(this, this.options);
		this.channels = new Channels(this);
		this.connection.connect();
	}
	Utils.inherits(Realtime, Rest);

	Realtime.prototype.close = function() {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
		this.connection.close();
	};

	function Channels(realtime) {
		this.realtime = realtime;
		this.attached = {};
		var self = this;
		realtime.connection.connectionManager.on('transport.active', function(transport) { self.onTransportActive(transport); });
	}

	Channels.prototype.onChannelMessage = function(msg) {
		var channelName = msg.channel;
		if(!channelName) {
			Logger.logAction(Logger.LOG_ERROR, 'Channels.onChannelMessage()', 'received event unspecified channel, action = ' + msg.action);
			return;
		}
		var channel = this.attached[channelName];
		if(!channel) {
			Logger.logAction(Logger.LOG_ERROR, 'Channels.onChannelMessage()', 'received event for non-existent channel: ' + channelName);
			return;
		}
		channel.onMessage(msg);
	};

	/* called when a transport becomes connected; reattempt attach()
	 * for channels that were pending from a previous transport */
	Channels.prototype.onTransportActive = function() {
		for(var channelId in this.attached)
			this.attached[channelId].checkPendingState();
	};

	Channels.prototype.setSuspended = function(err) {
		for(var channelId in this.attached) {
			var channel = this.attached[channelId];
			channel.setSuspended(err);
		}
	};

	Channels.prototype.get = function(name) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new RealtimeChannel(this.realtime, name, this.realtime.options);
		}
		return channel;
	};

	return Realtime;
})();
