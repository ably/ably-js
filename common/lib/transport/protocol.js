var Protocol = (function() {
	var actions = ProtocolMessage.Action;

	function Protocol(transport) {
		EventEmitter.call(this);
		this.transport = transport;
		this.messageQueue = new MessageQueue();
		var self = this;
		transport.on('ack', function(serial, count) { self.onAck(serial, count); });
		transport.on('nack', function(serial, count, err) { self.onNack(serial, count, err); });
	}
	Utils.inherits(Protocol, EventEmitter);

	Protocol.prototype.onAck = function(serial, count) {
		Logger.logAction(Logger.LOG_MICRO, 'Protocol.onAck()', 'serial = ' + serial + '; count = ' + count);
		this.messageQueue.completeMessages(serial, count);
	};

	Protocol.prototype.onNack = function(serial, count, err) {
		Logger.logAction(Logger.LOG_ERROR, 'Protocol.onNack()', 'serial = ' + serial + '; count = ' + count + '; err = ' + Utils.inspectError(err));
		if(!err) {
			err = new ErrorInfo('Unable to send message; channel not responding', 50001, 500);
		}
		this.messageQueue.completeMessages(serial, count, err);
	};

	Protocol.prototype.onceIdle = function(listener) {
		var messageQueue = this.messageQueue;
		if(messageQueue.count() === 0) {
			listener();
			return;
		}
		messageQueue.once('idle', listener);
	};

	Protocol.prototype.send = function(pendingMessage) {
		if(pendingMessage.ackRequired) {
			this.messageQueue.push(pendingMessage);
		}
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'Protocol.send()', 'sending msg; ' + ProtocolMessage.stringify(pendingMessage.message));
		}
		pendingMessage.sendAttempted = true;
		this.transport.send(pendingMessage.message);
	};

	Protocol.prototype.getTransport = function() {
		return this.transport;
	};

	Protocol.prototype.getPendingMessages = function() {
		return this.messageQueue.copyAll();
	};

	Protocol.prototype.clearPendingMessages = function() {
		return this.messageQueue.clear();
	};

	Protocol.prototype.finish = function() {
		var transport = this.transport;
		this.onceIdle(function() {
			transport.disconnect();
		});
	};

	function PendingMessage(message, callback) {
		this.message = message;
		this.callback = callback;
		this.merged = false;
		var action = message.action;
		this.sendAttempted = false;
		this.ackRequired = (action == actions.MESSAGE || action == actions.PRESENCE);
	}
	Protocol.PendingMessage = PendingMessage;

	return Protocol;
})();
