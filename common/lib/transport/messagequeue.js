var MessageQueue = (function() {
	function MessageQueue() {
		EventEmitter.call(this);
		this.messages = [];
	}
	Utils.inherits(MessageQueue, EventEmitter);

	MessageQueue.prototype.count = function() {
		return this.messages.length;
	};

	MessageQueue.prototype.push = function(message) {
		this.messages.push(message);
	};

	MessageQueue.prototype.shift = function() {
		return this.messages.shift();
	};

	MessageQueue.prototype.last = function() {
		return this.messages[this.messages.length - 1];
	};

	MessageQueue.prototype.copyAll = function() {
		return this.messages.slice();
	};

	MessageQueue.prototype.append = function(messageQueue) {
		this.messages.push.apply(this.messages, messageQueue.messages);
	};

	MessageQueue.prototype.prepend = function(messageQueue) {
		this.messages.unshift.apply(this.messages, messageQueue.messages);
	};

	MessageQueue.prototype.completeMessages = function(serial, count, err) {
		Logger.logAction(Logger.LOG_MICRO, 'MessageQueue.completeMessages()', 'serial = ' + serial + '; count = ' + count);
		err = err || null;
		var messages = this.messages;
		var first = messages[0];
		if(first) {
			var startSerial = first.message.msgSerial;
			var endSerial = serial + count; /* the serial of the first message that is *not* the subject of this call */
			if(endSerial > startSerial) {
				var completeMessages = messages.splice(0, (endSerial - startSerial));
				for(var i = 0; i < completeMessages.length; i++) {
					completeMessages[i].callback(err);
				}
			}
			if(messages.length == 0)
				this.emit('idle');
		}
	};

	return MessageQueue;
})();
