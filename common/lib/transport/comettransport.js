var CometTransport = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function mixin(target, source) {
		target = target || {};
		if(source) {
			Object.keys(source).forEach(function(key) {
				target[key] = source[key];
			});
		}
		return target;
	}
	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, options) {
		Transport.call(this, connectionManager, auth, options);
		this.binary = !options.useTextProtocol;
	}
	(Utils || require('util')).inherits(CometTransport, Transport);

	CometTransport.paramStr = function(params, baseUri) {
		var paramCount = 0, result = baseUri || '';
		if(params) {
			for(var key in params)
				result += (paramCount++ ? '&' : '?') + key + '=' + params[key];
		}
		return result;
	};

	/* public instance methods */
	CometTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this;
		var host = this.options.wsHost;
		var port = this.options.wsPort;
		var cometScheme = this.options.encrypted ? 'https://' : 'http://';

		this.baseUri = cometScheme + host + ':' + port + '/comet/' + this.options.appId;
		var connectUri = this.baseUri + '/recv';
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
		this.auth.getAuthParams(function(err, authParams) {
			self.params = authParams;
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'authParams:' + CometTransport.paramStr(authParams));
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			try {
				self.request(connectUri, self.params, null, false, function(err, response) {
					if(err) {
						self.emit('error', err);
						return;
					}
					self.emit('preconnect');
					self.onRecvResponse(response);
				});
			} catch(e) { self.emit('error', e); }
		});
	};

	CometTransport.prototype.close = function() {
		Transport.prototype.close.call(this);
		this.isConnected = false;
		if(this.recvRequest) {
			this.recvRequest.abort();
			delete this.recvRequest;
		}
		var self = this;
		this.recvRequest = this.request(this.closeUri, this.params, null, false, function(err, response) {
			delete self.recvRequest;
			if(err) {
				self.emit('error', err);
				return;
			}
		});
	};

	CometTransport.prototype.abort = function(reason) {
		Transport.prototype.abort.call(this, reason);
	};

	CometTransport.prototype.onConnect = function() {
		this.sendUri = this.baseUri + '/send/' + this.connectionId;
		this.recvUri = this.baseUri + '/recv/' + this.connectionId;
		this.closeUri = this.baseUri + '/close/' + this.connectionId;
		this.recv();
	};

	CometTransport.prototype.send = function(msg, callback) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingMessage = this.pendingMessage || new messagetypes.TMessageSet({items: []});
			this.pendingMessage.items.push(msg);

			this.pendingCallback = this.pendingCallback || new Multicaster();
			this.pendingCallback.push(callback);
			return;
		}
		/* send this, plus any pending, now */
		var pendingMessage = this.pendingMessage || new messagetypes.TMessageSet({items: []});
		pendingMessage.items.push(msg);
		delete this.pendingMessage;

		var pendingCallback = this.pendingCallback;
		if(pendingCallback) {
			pendingCallback.push(callback);
			callback = pendingCallback;
			delete this.pendingCallback;
		}

		this.sendMessage(pendingMessage, callback);
	};

	CometTransport.prototype.sendMessage = function(message, callback) {
		var self = this;
		try {
			var protocol = new this.thriftProtocol(new this.thriftTransport(this.protocolBuffer, function(data) {
				self.sendRequest = self.request(self.sendUri, self.params, data, false, function(err, response) {
					delete self.sendRequest;
					if(self.pendingMessage) {
						self.sendMessage(self.pendingMessage, self.pendingCallback);
						delete self.pendingMessage;
						delete self.pendingCallback;
					}
					if(err) {
						callback(err);
						return;
					}
					self.onResponseData(response);
					callback(null);
				});
			}));
			message.write(protocol);
			protocol.flush();
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendMessage()', msg);
			callback(new Error(msg));
		}
	};

	CometTransport.prototype.recv = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			delete this.recvRequest;
		}

		if(!this.isConnected)
			return;

		var self = this;
		this.recvRequest = this.request(this.recvUri, this.params, null, true, function(err, response) {
			if(err) {
				self.emit('error', err);
				return;
			}
			self.onRecvResponse(response);
			delete self.recvRequest;
			self.recv();
		});
	};

	CometTransport.prototype.onResponseData = function(responseData) {
		var protocol = new this.thriftProtocol(new this.thriftTransport(responseData));
		var msg = new messagetypes.TMessageSet();
		try {
			msg.read(protocol);
			var items = msg.items;
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.onSendResponse()', 'Unexpected exception handing channel event: ' + e.stack);
		}

	};

	CometTransport.prototype.onRecvResponse = function(responseData) {
		this.onResponseData(responseData);
	};

	return CometTransport;
})();
