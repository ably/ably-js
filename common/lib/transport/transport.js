var Transport = (function() {
	var isBrowser = (typeof(window) == 'object');

	/*
	 * EventEmitter, generates the following events:
	 * 
	 * event name       data
	 * closed           error
	 * failed           error
	 * connected        null error, connectionId
	 * event            channel message object
	 */
	var thrift = isBrowser ? Thrift : require('thrift');
	var defaultBufferSize = 1024;

	/* public constructor */
	function Transport(connectionManager, auth, options) {
		EventEmitter.call(this);
		this.connectionManager = connectionManager;
		this.auth = auth;
		this.options = options;
		if(options.useTextProtocol) {
			this.thriftTransport = thrift.TStringTransport;
			this.thriftProtocol = thrift.TJSONProtocol;
		} else {
			this.thriftTransport = thrift.TTransport;
			this.thriftProtocol = thrift.TBinaryProtocol;
			this.protocolBuffer = new thrift.CheckedBuffer(defaultBufferSize);
		}
		this.isConnected = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function() {
		this.isConnected = false;
		this.emit('closed', ConnectionError.closed);
	};

	Transport.prototype.abort = function(error) {
		this.isConnected = false;
		this.emit('failed', error);
	};

	Transport.prototype.onChannelMessage = function(message) {
		switch(message.action) {
		case 0: /* HEARTBEAT */
			this.emit('heartbeat');
			break;
		case 2: /* CONNECTED */
			this.connectionId = message.connectionId;
			this.isConnected = true;
			this.onConnect();
			this.emit('connected', null, this.connectionId);
			break;
		case 3: /* ERROR */
			var err = {
				statusCode: message.statusCode,
				code: message.code,
				reason: message.reason
			};
			this.abort(error).
			break;
		default:
			this.emit('channelmessage', message);
		}
	};

	Transport.prototype.sendMessage = function(message, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Transport.sendMessage()', '');
		var self = this;
		try {
			var protocol = new (this.thriftProtocol)(new (this.thriftTransport)(undefined, function(data) {
				self.sendData(data, callback);
			}));
			message.write(protocol);
			protocol.flush();
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'Transport.sendMessage()', msg);
			callback({statusCode: 500, code: 50000, reason: msg});
		}
	};

	Transport.prototype.onConnect = function() {};

	Transport.prototype.onClose = function(wasClean, reason) {
		/* if the connectionmanager already thinks we're closed
		 * then we probably initiated it */
		if(this.connectionManager.state.state == 'closed')
			return;
		var newState = wasClean ?  'disconnected' : 'failed';
		this.isConnected = false;
		var error = Utils.copy(ConnectionError[newState]);
		if(reason) error.reason = reason;
		this.emit(newState, error);
	};

	Transport.prototype.dispose = function() {
		this.off();
	};

	return Transport;
})();
