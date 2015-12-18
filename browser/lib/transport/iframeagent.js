(function() {
	var origin = location.origin || location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: '');
	var connectParams = Utils.parseQueryString(window.location.search);
	var parentOrigin = connectParams.origin;
	delete connectParams.origin;
	var authParams = ('access_token' in connectParams) ? {access_token: connectParams.access_token} : {key: connectParams.key};
	var parentWindow = window.parent;
	var actions = ProtocolMessage.Action;

	//Logger.setLog(4);

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function encodeRequest(requestItems) {
		if(typeof(requestItems) != 'string')
			requestItems = JSON.stringify(requestItems);
		return requestItems;
	}

	function decodeResponse(responseData) {
		if(typeof(responseData) == 'string')
			responseData = JSON.parse(responseData);
		return responseData;
	}

	function errorMessage(err) {
		return new ProtocolMessage.fromValues({
			action: actions.ERROR,
			error: err
		});
	}

	function responseMessage(err, message) {
		if(err) {
			var errMessage = errorMessage(err);
			if(message)
				Utils.mixin(errMessage, message);
			message = errMessage;
		}
		return message;
	}

	function IframeAgent() {
		/* streaming defaults to true */
		this.stream = ('stream' in connectParams) ? connectParams.stream : true;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
		this.baseUri = this.sendUri = this.recvUri = null;

		var self = this;
		DomEvent.addMessageListener(window, function(ev) {self.onMessageEvent(ev.data); })
	}

	IframeAgent.prototype.connect = function() {
		var baseUri = this.baseUri = origin + '/comet/',
			connectUri = baseUri + 'connect',
			self = this;

		Logger.logAction(Logger.LOG_MINOR, 'IframeAgent.connect()', 'uri: ' + connectUri);

		/* this will be the 'recvRequest' so this connection can stream messages */
		var connectRequest = this.recvRequest = XHRRequest.createRequest(connectUri, null, connectParams, null, (this.stream ? REQ_RECV_STREAM : REQ_RECV));

		connectRequest.on('data', function(data) {
			/* intercept initial responses until connectionKey obtained */
			if(self.sendUri == null)
				self.checkConnectResponse(data);
			self.onData(data);
		});
		connectRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.postErrorEvent(err);
				return;
			}
			Utils.nextTick(function() {
				self.recv();
			});
		});
		connectRequest.exec();
	};

	IframeAgent.prototype.dispose = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}
	};

	IframeAgent.prototype.checkConnectResponse = function(responseData) {
		try {
			var items = decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++) {
					var message = items[i];
					if(message.action == actions.CONNECTED) {
						this.onConnect(message);
						break;
					}
				}
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'IframeAgent.checkConnectResponse()', 'Unexpected exception handing channel event: ' + e);
		}
	};

	IframeAgent.prototype.onConnect = function(message) {
		var baseConnectionUri =  this.baseUri + message.connectionKey;
		Logger.logAction(Logger.LOG_MICRO, 'IframeAgent.onConnect()', 'baseUri = ' + baseConnectionUri);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
	};

	IframeAgent.prototype.onMessageEvent = function(data) {
		var self = this;
		this.send(decodeResponse(data), function(err, response) {
			if(err) {
				self.postErrorEvent(err);
				return;
			}
			if(response)
				self.postMessageEvent(response);
		});
	};

	IframeAgent.prototype.send = function(msg, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'IframeAgent.send()', 'msg = ' + JSON.stringify(msg));
		}

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

	IframeAgent.prototype.sendItems = function(items, callback) {
		var sendUri = this.sendUri,
			self = this;

		if(!sendUri) {
			callback({message:'Unable to send; not connected', code:80000, statusCode:400});
			return;
		}

		var sendRequest = this.sendRequest = XHRRequest.createRequest(sendUri, null, authParams, encodeRequest(items), REQ_SEND);
		sendRequest.on('complete', function(err, data) {
			if(err) Logger.logAction(Logger.LOG_ERROR, 'IframeAgent.sendItems()', 'on complete: err = ' + Utils.inspectError(err));
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

	IframeAgent.prototype.recv = function() {
		/* do nothing if there is an active request, which might be streaming */
		if(this.recvRequest)
			return;

		/* If we're no longer connected, do nothing */
		if(!this.isConnected)
			return;

		var self = this,
			recvRequest = this.recvRequest = XHRRequest.createRequest(this.recvUri, null, authParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV_POLL));

		recvRequest.on('data', function(data) {
			self.onData(data);
		});
		recvRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.postErrorEvent(err);
				return;
			}
			Utils.nextTick(function() {
				self.recv();
			});
		});
		recvRequest.exec();
	};

	IframeAgent.prototype.onData = function(responseData) {
		this.postMessageEvent(responseData);
	};

	IframeAgent.prototype.postMessageEvent = function(items) {
		parentWindow.postMessage(encodeRequest(items), parentOrigin);
	};

	IframeAgent.prototype.postErrorEvent = function(err, message) {
		var item = responseMessage(err, message);
		this.postMessageEvent([item]);
	};

	(new IframeAgent()).connect();
})();


