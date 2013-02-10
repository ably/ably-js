var Transport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;

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
console.log('************* onChannelMessage: ' + message.action);
		switch(message.action) {
		case actions.HEARTBEAT:
			this.emit('heartbeat');
			break;
		case actions.CONNECTED:
			this.connectionId = message.connectionId;
			this.isConnected = true;
			this.onConnect();
			this.emit('connected', null, this.connectionId);
			break;
		case actions.ACK:
console.log('************* onChannelMessage: emitting ack');
			this.emit('ack', message.msgSerial, message.count);
			break;
		case actions.NACK:
			this.emit('nack', message.msgSerial, message.count, message.error);
			break;
		case actions.ERROR:
			var err = {
				statusCode: message.statusCode,
				code: message.code,
				reason: message.reason
			};
			this.abort(err);
			break;
		default:
			this.emit('channelmessage', message);
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
