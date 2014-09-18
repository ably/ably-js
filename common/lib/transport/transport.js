var Transport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var messagetypes = isBrowser ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;
	var closeMessage = new messagetypes.TProtocolMessage({action: actions.CLOSE});

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
		this.isConnected = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function(closing) {
		if(this.isConnected) {
			this.isConnected = false;
			this.sendClose(closing);
		}
		this.emit('closed', ConnectionError.closed);
		this.dispose();
	};

	Transport.prototype.abort = function(error) {
		if(this.isConnected) {
			this.isConnected = false;
			this.sendClose(true);
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
			this.emit('connected', null, message.connectionId, message.connectionSerial);
			break;
		case actions.CLOSED:
		case actions.DISCONNECTED:
			this.isConnected = false;
			this.onDisconnect();
			/* FIXME: do we need to emit an event here? */
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
		this.connectionId = message.connectionId = message.connectionId.split('-').pop();
		this.isConnected = true;
	};

	Transport.prototype.onDisconnect = function() {};

	Transport.prototype.onClose = function(wasClean, message) {
		/* if the connectionmanager already thinks we're closed
		 * then we probably initiated it */
		if(this.connectionManager.state.state == 'closed')
			return;
		var newState = wasClean ?  'disconnected' : 'failed';
		this.isConnected = false;
		var error = Utils.copy(ConnectionError[newState]);
		if(message) error.message = message;
		this.emit(newState, error);
	};

	Transport.prototype.sendClose = function(closing) {
		if(closing)
			this.send(closeMessage);
	};

	Transport.prototype.dispose = function() {
		this.off();
	};

	return Transport;
})();
