var CometTransport = (function() {

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, params) {
		/* binary not supported for comet, so just fall back to default */
		params.format = undefined;
		Transport.call(this, connectionManager, auth, params);
		/* streaming defaults to true */
		this.stream = ('stream' in params) ? params.stream : true;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
	}
	Utils.inherits(CometTransport, Transport);

	CometTransport.REQ_SEND = REQ_SEND;
	CometTransport.REQ_RECV = REQ_RECV;
	CometTransport.REQ_RECV_POLL = REQ_RECV_POLL;
	CometTransport.REQ_RECV_STREAM = REQ_RECV_STREAM;

	/* public instance methods */
	CometTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var host = Defaults.getHost(options, params.host);
		var port = Defaults.getPort(options);
		var cometScheme = options.tls ? 'https://' : 'http://';

		this.baseUri = cometScheme + host + ':' + port + '/comet/';
		var connectUri = this.baseUri + 'connect';
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(err);
				return;
			}
			self.authParams = authParams;
			var connectParams = self.params.getConnectParams(authParams);
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + Utils.toQueryString(connectParams));

			/* this will be the 'recvRequest' so this connection can stream messages */
			var preconnected = false,
				connectRequest = self.recvRequest = self.createRequest(connectUri, null, connectParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV));

			connectRequest.on('data', function(data) {
				if(!preconnected) {
					preconnected = true;
					self.emit('preconnect');
				}
				self.onData(data);
			});
			connectRequest.on('complete', function(err) {
				self.recvRequest = null;
				if(err) {
					self.emit('error', err);
					return;
				}
			});
			connectRequest.exec();
		});
	};

	CometTransport.prototype.sendClose = function(closing) {
		var closeUri = this.closeUri,
			self = this;

		if(!closeUri) {
			callback({message:'Unable to close; not connected', code:80000, statusCode:400});
			return;
		}

		var closeRequest = this.createRequest(closeUri(closing), null, this.authParams, null, REQ_SEND);
		closeRequest.on('complete', function(err) {
			if(err) {
				self.emit('error', err);
				return;
			}
		});
		closeRequest.exec();
	};

	CometTransport.prototype.dispose = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}
	};

	CometTransport.prototype.onConnect = function(message) {
		/* the connectionId in a comet connected response is really
		 * <instId>-<connectionId> */
		var connectionStr = message.connectionId;
		Transport.prototype.onConnect.call(this, message);

		var baseConnectionUri =  this.baseUri + connectionStr;
		Logger.logAction(Logger.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri + '; connectionId = ' + message.connectionId);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
		this.closeUri = function(closing) { return baseConnectionUri + (closing ? '/close' : '/disconnect'); };

		var self = this;
		Utils.nextTick(function() {
			self.recv();
		})
	};

	CometTransport.prototype.send = function(msg, callback) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(msg);

			this.pendingCallback = this.pendingCallback || Multicaster();
			this.pendingCallback.push(callback);
			return;
		}
		/* send this, plus any pending, now */
		var pendingItems = this.pendingItems || [];
		pendingItems.push(msg);
		this.pendingItems = null;

		var pendingCallback = this.pendingCallback;
		if(pendingCallback) {
			pendingCallback.push(callback);
			callback = pendingCallback;
			this.pendingCallback = null;
		}

		this.sendItems(pendingItems, callback);
	};

	CometTransport.prototype.sendItems = function(items, callback) {
		var self = this,
			sendRequest = this.sendRequest = self.createRequest(self.sendUri, null, self.authParams, this.encodeRequest(items), REQ_SEND);

		sendRequest.on('complete', function(err, data) {
			if(err) Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendItems()', 'on complete: err = ' + err);
			self.sendRequest = null;
			if(data) self.onData(data);

			var pendingItems = self.pendingItems;
			if(pendingItems) {
				self.pendingItems = null;
				var pendingCallback = self.pendingCallback;
				self.pendingCallback = null;
				Utils.nextTick(function() {
					self.sendItems(pendingItems, pendingCallback);
				});
			}
			callback(err);
		});
		sendRequest.exec();
	};

	CometTransport.prototype.recv = function() {
		/* do nothing if there is an active request, which might be streaming */
		if(this.recvRequest)
			return;

		/* If we're no longer connected, do nothing */
		if(!this.isConnected)
			return;

		var self = this,
			recvRequest = this.recvRequest = this.createRequest(this.recvUri, null, this.authParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV_POLL));

		recvRequest.on('data', function(data) {
			self.onData(data);
		});
		recvRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.emit('error', err);
				return;
			}
			Utils.nextTick(function() {
				self.recv();
			});
		});
		recvRequest.exec();
	};

	CometTransport.prototype.onData = function(responseData) {
		try {
			var items = this.decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.onData()', 'Unexpected exception handing channel event: ' + e.stack);
		}
	};

	CometTransport.prototype.encodeRequest = function(requestItems) {
		return JSON.stringify(requestItems);
	};

	CometTransport.prototype.decodeResponse = function(responseData) {
		if(typeof(responseData) == 'string')
			responseData = JSON.parse(responseData);
		return responseData;
	};

	return CometTransport;
})();
