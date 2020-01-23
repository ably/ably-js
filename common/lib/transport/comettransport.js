var CometTransport = (function() {

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	/* TODO: can remove once realtime sends protocol message responses for comet errors */
	function shouldBeErrorAction(err) {
		var UNRESOLVABLE_ERROR_CODES = [80015, 80017, 80030];
		if(err.code) {
			if(Auth.isTokenErr(err)) return false;
			if(Utils.arrIn(UNRESOLVABLE_ERROR_CODES, err.code)) return true;
			return (err.code >= 40000 && err.code < 50000);
		} else {
			/* Likely a network or transport error of some kind. Certainly not fatal to the connection */
			return false;
		}
	}

	function protocolMessageFromRawError(err) {
		/* err will be either a legacy (non-protocolmessage) comet error response
		 * (which will have an err.code), or a xhr/network error (which won't). */
		if(shouldBeErrorAction(err)) {
			return [ProtocolMessage.fromValues({action: ProtocolMessage.Action.ERROR, error: err})];
		} else {
			return [ProtocolMessage.fromValues({action: ProtocolMessage.Action.DISCONNECTED, error: err})];
		}
	}

	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, params) {
		/* binary not supported for comet, so just fall back to default */
		params.format = undefined;
		params.heartbeats = true;
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
				self.disconnect(err);
				return;
			}
			if(self.isDisposed) {
				return;
			}
			self.authParams = authParams;
			var connectParams = self.params.getConnectParams(authParams);
			if('stream' in connectParams) self.stream = connectParams.stream;
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + Utils.toQueryString(connectParams));

			/* this will be the 'recvRequest' so this connection can stream messages */
			var preconnected = false,
				connectRequest = self.recvRequest = self.createRequest(connectUri, null, connectParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV));

			connectRequest.on('data', function(data) {
				if(!self.recvRequest) {
					/* the transport was disposed before we connected */
					return;
				}
				if(!preconnected) {
					preconnected = true;
					self.emit('preconnect');
				}
				self.onData(data);
			});
			connectRequest.on('complete', function(err, _body, headers) {
				if(!self.recvRequest) {
					/* the transport was disposed before we connected */
					err = err || new ErrorInfo('Request cancelled', 80003, 400);
				}
				self.recvRequest = null;
				/* Connect request may complete without a emitting 'data' event since that is not
				 * emitted for e.g. a non-streamed error response. Still implies preconnect. */
				if(!preconnected) {
					preconnected = true;
					self.emit('preconnect');
				}
				self.onActivity();
				if(err) {
					if(err.code) {
						/* A protocol error received from realtime. TODO: once realtime
						 * consistendly sends errors wrapped in protocol messages, should be
						 * able to remove this */
						self.onData(protocolMessageFromRawError(err));
					} else {
						/* A network/xhr error. Don't bother wrapping in a protocol message,
						 * just disconnect the transport */
						self.disconnect(err);
					}
					return;
				}
				Utils.nextTick(function() {
					self.recv();
				});
			});
			connectRequest.exec();
		});
	};

	CometTransport.prototype.requestClose = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.requestClose()');
		this._requestCloseOrDisconnect(true);
	};

	CometTransport.prototype.requestDisconnect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.requestDisconnect()');
		this._requestCloseOrDisconnect(false);
	};

	CometTransport.prototype._requestCloseOrDisconnect = function(closing) {
		var closeOrDisconnectUri = closing ? this.closeUri : this.disconnectUri;
		if(closeOrDisconnectUri) {
			var self = this,
				request = this.createRequest(closeOrDisconnectUri, null, this.authParams, null, REQ_SEND);

			request.on('complete', function (err) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'CometTransport.request' + (closing ? 'Close()' : 'Disconnect()'), 'request returned err = ' + Utils.inspectError(err));
					self.finish('disconnected', err);
				}
			});
			request.exec();
		}
	};

	CometTransport.prototype.dispose = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.dispose()', '');
		if(!this.isDisposed) {
			this.isDisposed = true;
			if(this.recvRequest) {
				Logger.logAction(Logger.LOG_MINOR, 'CometTransport.dispose()', 'aborting recv request');
				this.recvRequest.abort();
				this.recvRequest = null;
			}
			/* In almost all cases the transport will be finished before it's
			 * disposed. Finish here just to make sure. */
			this.finish('disconnected', ConnectionError.disconnected);
			var self = this;
			Utils.nextTick(function() {
				self.emit('disposed');
			});
		}
	};

	CometTransport.prototype.onConnect = function(message) {
		/* if this transport has been disposed whilst awaiting connection, do nothing */
		if(this.isDisposed) {
			return;
		}

		/* the connectionKey in a comet connected response is really
		 * <instId>-<connectionKey> */
		var connectionStr = message.connectionKey;
		Transport.prototype.onConnect.call(this, message);

		var baseConnectionUri =  this.baseUri + connectionStr;
		Logger.logAction(Logger.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri + '; connectionKey = ' + message.connectionKey);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
		this.closeUri = baseConnectionUri + '/close';
		this.disconnectUri = baseConnectionUri + '/disconnect';
	};

	CometTransport.prototype.send = function(message) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(message);
			return;
		}
		/* send this, plus any pending, now */
		var pendingItems = this.pendingItems || [];
		pendingItems.push(message);
		this.pendingItems = null;

		this.sendItems(pendingItems);
	};

	CometTransport.prototype.sendAnyPending = function() {
		var pendingItems = this.pendingItems;

		if(!pendingItems) {
			return;
		}

		this.pendingItems = null;
		this.sendItems(pendingItems);
	}

	CometTransport.prototype.sendItems = function(items) {
		var self = this,
			sendRequest = this.sendRequest = self.createRequest(self.sendUri, null, self.authParams, this.encodeRequest(items), REQ_SEND);

		sendRequest.on('complete', function(err, data) {
			if(err) Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendItems()', 'on complete: err = ' + Utils.inspectError(err));
			self.sendRequest = null;

			/* the result of the request, even if a nack, is usually a protocol response
			 * contained in the data. An err is anomolous, and indicates some issue with the
			 * network,transport, or connection */
			if(err) {
				if(err.code) {
					/* A protocol error received from realtime. TODO: once realtime
					 * consistendly sends errors wrapped in protocol messages, should be
					 * able to remove this */
					self.onData(protocolMessageFromRawError(err));
				} else {
					/* A network/xhr error. Don't bother wrapping in a protocol message,
					 * just disconnect the transport */
					self.disconnect(err);
				}
				return;
			}

			if(data) {
				self.onData(data);
			}

			if(self.pendingItems) {
				Utils.nextTick(function() {
					/* If there's a new send request by now, any pending items will have
					 * been picked up by that; any new ones added since then will be
					 * picked up after that one completes */
					if(!self.sendRequest) {
						self.sendAnyPending();
					}
				});
			}
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
			/* A request completing must be considered activity, as realtime sends
			 * heartbeats every 15s since a request began, not every 15s absolutely */
			self.onActivity();
			if(err) {
				if(err.code) {
					/* A protocol error received from realtime. TODO: once realtime
					 * consistendly sends errors wrapped in protocol messages, should be
					 * able to remove this */
					self.onData(protocolMessageFromRawError(err));
				} else {
					/* A network/xhr error. Don't bother wrapping in a protocol message,
					 * just disconnect the transport */
					self.disconnect(err);
				}
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
					this.onProtocolMessage(ProtocolMessage.fromDeserialized(items[i]));
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

	/* For comet, we could do the auth update by aborting the current recv and
	 * starting a new one with the new token, that'd be sufficient for realtime.
	 * Problem is JSONP - you can't cancel truly abort a recv once started. So
	 * we need to send an AUTH for jsonp. In which case it's simpler to keep all
	 * comet transports the same and do it for all of them. So we send the AUTH
	 * instead, and don't need to abort the recv */
	CometTransport.prototype.onAuthUpdated = function(tokenDetails) {
		this.authParams = {access_token: tokenDetails.token};
	};

	return CometTransport;
})();
