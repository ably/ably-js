var Transport = (function() {
	var actions = ProtocolMessage.Action;
	var closeMessage = ProtocolMessage.fromValues({action: actions.CLOSE});
	var disconnectMessage = ProtocolMessage.fromValues({action: actions.DISCONNECT});
	var noop = function() {};

	/*
	 * EventEmitter, generates the following events:
	 *
	 * event name       data
	 * closed           error
	 * failed           error
	 * disposed
	 * connected        null error, connectionKey
	 * event            channel message object
	 */

	/* public constructor */
	function Transport(connectionManager, auth, params) {
		EventEmitter.call(this);
		this.connectionManager = connectionManager;
		this.auth = auth;
		this.params = params;
		this.timeouts = params.options.timeouts;
		this.format = params.format;
		this.isConnected = false;
		this.isFinished = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function() {
		if(this.isConnected)
			this.requestClose(true);
		this.finish('closed', ConnectionError.closed);
	};

	Transport.prototype.abort = function(error) {
		if(this.isConnected) {
			this.requestClose(false);
		}
		this.finish('failed', error);
	};

	Transport.prototype.disconnect = function(err) {
		this.finish('disconnected', err || ConnectionError.disconnected);
	};

	Transport.prototype.finish = function(event, err) {
		if(this.isFinished) {
			return;
		}

		this.isFinished = true;
		this.isConnected = false;
		this.emit(event, err);
		this.dispose();
	};

	Transport.prototype.onProtocolMessage = function(message) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'Transport.onProtocolMessage()', 'received; ' + ProtocolMessage.stringify(message));
		}

		switch(message.action) {
		case actions.HEARTBEAT:
			Logger.logAction(Logger.LOG_MICRO, 'Transport.onProtocolMessage()', 'heartbeat; connectionKey = ' + this.connectionManager.connectionKey);
			this.emit('heartbeat');
			break;
		case actions.CONNECTED:
			this.onConnect(message);
			this.emit('connected', null, (message.connectionDetails ? message.connectionDetails.connectionKey : message.connectionKey), message.connectionSerial, message.connectionId, (message.connectionDetails ? message.connectionDetails.clientId : null));
			break;
		case actions.CLOSED:
			this.onClose(message);
			break;
		case actions.DISCONNECTED:
			this.onDisconnect(message);
			break;
		case actions.ACK:
			this.emit('ack', message.msgSerial, message.count);
			break;
		case actions.NACK:
			this.emit('nack', message.msgSerial, message.count, message.error);
			break;
		case actions.SYNC:
			if(message.connectionId !== undefined) {
				/* a transport SYNC */
				this.emit('sync', message.connectionSerial, message.connectionId);
				break;
			}
			/* otherwise it's a channel SYNC, so handle it in the channel */
			this.connectionManager.onChannelMessage(message, this);
			break;
		case actions.ERROR:
			var msgErr = message.error;
			Logger.logAction(Logger.LOG_ERROR, 'Transport.onProtocolMessage()', 'error; connectionKey = ' + this.connectionManager.connectionKey + '; err = ' + JSON.stringify(msgErr));
			if(message.channel === undefined) {
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
			this.connectionManager.onChannelMessage(message, this);
			break;
		default:
			/* all other actions are channel-specific */
			this.connectionManager.onChannelMessage(message, this);
		}
	};

	Transport.prototype.onConnect = function(message) {
		/* if there was a (non-fatal) connection error
		 * that invalidates an existing connection id, then
		 * remove all channels attached to the previous id */
		var connectionKey = message.connectionKey,
			error = message.error,
			connectionManager = this.connectionManager;

		if(error && connectionKey !== connectionManager.connectionKey) {
			connectionManager.realtime.channels.setSuspended(error);
		}

		this.connectionKey = connectionKey;
		this.isConnected = true;
	};

	Transport.prototype.onDisconnect = function(message) {
		var err = message && message.error;
		Logger.logAction(Logger.LOG_MINOR, 'Transport.onDisconnect()', 'err = ' + Utils.inspectError(err));
		this.finish('disconnected', err);
	};

	Transport.prototype.onClose = function(message) {
		var err = message && message.error;
		Logger.logAction(Logger.LOG_MINOR, 'Transport.onClose()', 'err = ' + Utils.inspectError(err));
		this.finish('closed', err);
	};

	Transport.prototype.requestClose = function(closing) {
		Logger.logAction(Logger.LOG_MINOR, 'Transport.requestClose()', '');
		this.send((closing ? closeMessage :disconnectMessage), noop);
	};

	Transport.prototype.ping = function(callback) {
		this.send(ProtocolMessage.fromValues({action: ProtocolMessage.Action.HEARTBEAT}), callback || noop);
	};

	Transport.prototype.dispose = function() {
		Logger.logAction(Logger.LOG_MINOR, 'Transport.dispose()', '');
		this.off();
	};

	return Transport;
})();
