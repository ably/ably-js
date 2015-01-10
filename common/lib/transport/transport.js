var Transport = (function() {
	var actions = ProtocolMessage.Action;
	var closeMessage = ProtocolMessage.fromValues({action: actions.CLOSE});

	/*
	 * EventEmitter, generates the following events:
	 * 
	 * event name       data
	 * closed           error
	 * failed           error
	 * connected        null error, connectionId
	 * event            channel message object
	 */

	/* public constructor */
	function Transport(connectionManager, auth, params) {
		EventEmitter.call(this);
		this.connectionManager = connectionManager;
		this.auth = auth;
		this.params = params;
		this.format = params.format;
		this.isConnected = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function() {
		if(this.isConnected) {
			this.sendClose();
		}
		this.emit('closed');
		this.dispose();
	};

	Transport.prototype.disconnect = function() {
		if(this.isConnected) {
			this.isConnected = false;
		}
		this.emit('disconnected', ConnectionError.disconnected);
		this.dispose();
	};

	Transport.prototype.abort = function(error) {
		if(this.isConnected) {
			this.isConnected = false;
			this.sendClose();
		}
		this.emit('failed', error);
		this.dispose();
	};

	Transport.prototype.onChannelMessage = function(message) {
		switch(message.action) {
		case actions.HEARTBEAT:
			Logger.logAction(Logger.LOG_MICRO, 'Transport.onChannelMessage()', 'heartbeat; connectionId = ' + this.connectionManager.connectionId);
			this.emit('heartbeat');
			break;
		case actions.CONNECTED:
			this.onConnect(message);
			this.emit('connected', null, message.connectionId, message.connectionSerial, message.memberId);
			break;
		case actions.CLOSED:
			this.isConnected = false;
			this.onClose(message);
			break;
		case actions.DISCONNECTED:
			this.isConnected = false;
			this.onDisconnect();
			break;
		case actions.ACK:
			this.emit('ack', message.msgSerial, message.count);
			break;
		case actions.NACK:
			this.emit('nack', message.msgSerial, message.count, message.error);
			break;
		case actions.ERROR:
			var msgErr = message.error;
			Logger.logAction(Logger.LOG_ERROR, 'Transport.onChannelMessage()', 'error; connectionId = ' + this.connectionManager.connectionId + '; err = ' + JSON.stringify(msgErr));
			if(!message.channel) {
				/* a transport error */
				var err = {
					statusCode: msgErr.statusCode,
					code: msgErr.code,
					message: msgErr.message
				};
				this.abort(err);
				break;
			}
			/* otherwise it's a channel-specific error, so handle it in the channel */
		default:
			this.connectionManager.onChannelMessage(message, this);
		}
	};

	Transport.prototype.onConnect = function(message) {
		/* the connectionId in a comet connected response is really
		 * <instId>-<connectionId>; handle generically here */
		var connectionId = message.connectionId = message.connectionId.split('-').pop();

		/* if there was a (non-fatal) connection error
		 * that invalidates an existing connection id, then
		 * remove all channels attached to the previous id */
		var error = message.error, connectionManager = this.connectionManager;
		if(error && message.connectionId !== connectionManager.connectionId)
			connectionManager.realtime.channels.setSuspended(error);

		this.connectionId = message.connectionId = message.connectionId.split('-').pop();
		this.isConnected = true;
	};

	Transport.prototype.onDisconnect = function(message) {
		this.isConnected = false;
		var err = message && message.error;
		this.emit('disconnected', err);
	};

	Transport.prototype.onClose = function(message) {
		this.isConnected = false;
		var err = message && message.error;
		this.emit('closed', err);
	};

	Transport.prototype.sendClose = function() {
		this.send(closeMessage);
	};

	Transport.prototype.dispose = function() {
		this.off();
	};

	return Transport;
})();
