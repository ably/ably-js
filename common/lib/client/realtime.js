var Realtime = (function() {

	function Realtime(options) {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
		Rest.call(this, options);
		this.connection = new Connection(this, this.options);
		this.channels = new Channels(this);
		if(options.autoConnect !== false)
			this.connection.connect();
	}
	Utils.inherits(Realtime, Rest);

	Realtime.prototype.close = function() {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
		this.connection.close();
	};

	function Channels(realtime) {
		EventEmitter.call(this);
		this.realtime = realtime;
		this.all = {};
		this.pending = {};
		var self = this;
		realtime.connection.connectionManager.on('transport.active', function(transport) { self.onTransportActive(transport); });
	}
	Utils.inherits(Channels, EventEmitter);

	Channels.prototype.onChannelMessage = function(msg) {
		var channelName = msg.channel;
		if(channelName === undefined) {
			Logger.logAction(Logger.LOG_ERROR, 'Channels.onChannelMessage()', 'received event unspecified channel, action = ' + msg.action);
			return;
		}
		var channel = this.all[channelName];
		if(!channel) {
			Logger.logAction(Logger.LOG_ERROR, 'Channels.onChannelMessage()', 'received event for non-existent channel: ' + channelName);
			return;
		}
		channel.onMessage(msg);
	};

	/* called when a transport becomes connected; reattempt attach()
	 * for channels that may have been pending from a previous transport */
	Channels.prototype.onTransportActive = function() {
		for(var channelId in this.pending)
			this.pending[channelId].checkPendingState();
	};

	Channels.prototype.setSuspended = function(err) {
		for(var channelId in this.all) {
			var channel = this.all[channelId];
			channel.setSuspended(err);
		}
	};

	Channels.prototype.get = function(name) {
		name = String(name);
		var channel = this.all[name];
		if(!channel) {
			channel = this.all[name] = new RealtimeChannel(this.realtime, name, this.realtime.options);
		}
		return channel;
	};

	Channels.prototype.release = function(name) {
		var channel = this.all[name];
		if(channel) {
			delete this.all[name];
		}
	};

	Channels.prototype.setChannelState = function(channel) {
		var name = channel.name;
		switch(channel.state) {
			case 'attaching':
			case 'detaching':
				this.pending[name] = channel;
				break;
			default:
				delete this.pending[name];
				if(Utils.isEmpty(this.pending)) {
					this.emit('nopending');
				}
		}
	};

	Channels.prototype.onceNopending = function(listener) {
		if(Utils.isEmpty(this.pending)) {
			listener();
			return;
		}
		this.once('nopending', listener);
	};

	return Realtime;
})();
