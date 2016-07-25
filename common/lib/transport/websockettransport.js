var WebSocketTransport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var WebSocket = isBrowser ? (window.WebSocket || window.MozWebSocket) : require('ws');
	var binaryType = isBrowser ? 'arraybuffer' : 'nodebuffer';
	var shortName = 'web_socket';

	/* public constructor */
	function WebSocketTransport(connectionManager, auth, params) {
		this.shortName = shortName;
		Transport.call(this, connectionManager, auth, params);
		this.wsHost = Defaults.getHost(params.options, params.host, true);
	}
	Utils.inherits(WebSocketTransport, Transport);

	WebSocketTransport.isAvailable = function() {
		return !!WebSocket;
	};

	if(WebSocketTransport.isAvailable())
		ConnectionManager.supportedTransports[shortName] = WebSocketTransport;

	WebSocketTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new WebSocketTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback({event: this.event, error: err}); };
		transport.on(['failed', 'disconnected'], errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.tryConnect()', 'viable transport ' + transport);
			transport.off(['failed', 'disconnected'], errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	WebSocketTransport.prototype.createWebSocket = function(uri, connectParams) {
		var paramCount = 0;
		if(connectParams) {
			for(var key in connectParams)
				uri += (paramCount++ ? '&' : '?') + key + '=' + connectParams[key];
		}
		this.uri = uri;
		return new WebSocket(uri);
	};

	WebSocketTransport.prototype.toString = function() {
		return 'WebSocketTransport; uri=' + this.uri;
	};

	WebSocketTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var wsScheme = options.tls ? 'wss://' : 'ws://';
		var wsUri = wsScheme + this.wsHost + ':' + Defaults.getPort(options) + '/';
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
		this.auth.getAuthParams(function(err, authParams) {
			var paramStr = ''; for(var param in authParams) paramStr += ' ' + param + ': ' + authParams[param] + ';';
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr + ' err: ' + err);
			if(err) {
				self.disconnect(err);
				return;
			}
			var connectParams = params.getConnectParams(authParams);
			try {
				var wsConnection = self.wsConnection = self.createWebSocket(wsUri, connectParams);
				wsConnection.binaryType = binaryType;
				wsConnection.onopen = function() { self.onWsOpen(); };
				wsConnection.onclose = function(ev) { self.onWsClose(ev); };
				wsConnection.onmessage = function(ev) { self.onWsData(ev.data); };
				wsConnection.onerror = function(ev) { self.onWsError(ev); };
			} catch(e) {
				Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.connect()', 'Unexpected exception creating websocket: err = ' + (e.stack || e.message));
				self.disconnect(e);
			}
		});
	};

	WebSocketTransport.prototype.send = function(message, callback) {
		var wsConnection = this.wsConnection;
		if(!wsConnection) {
			callback && callback(new ErrorInfo('No socket connection'));
			return;
		}
		wsConnection.send(ProtocolMessage.encode(message, this.params.format));
		callback && callback(null);
	};

	WebSocketTransport.prototype.onWsData = function(data) {
		Logger.logAction(Logger.LOG_MICRO, 'WebSocketTransport.onWsData()', 'data received; length = ' + data.length + '; type = ' + typeof(data));
		try {
			this.onProtocolMessage(ProtocolMessage.decode(data, this.format));
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onWsData()', 'Unexpected exception handing channel message: ' + e.stack);
		}
	};

	WebSocketTransport.prototype.onWsOpen = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsOpen()', 'opened WebSocket');
		this.emit('wsopen');
	};

	WebSocketTransport.prototype.onWsClose = function(ev) {
		var wasClean, code, reason;
		if(typeof(ev) == 'object') {
			/* W3C spec-compatible */
			wasClean = ev.wasClean;
			code = ev.code;
		} else /*if(typeof(ev) == 'number')*/ {
			/* ws in node */
			code = ev;
			wasClean = (code == 1000);
		}
		delete this.wsConnection;
		if(wasClean) {
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsClose()', 'Cleanly closed WebSocket');
			Transport.prototype.onDisconnect.call(this);
		} else {
			var msg = 'Unclean disconnection of WebSocket ; code = ' + code,
				err = new ErrorInfo(msg, 80003, 400);
			Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onWsClose()', msg);
			this.finish('disconnected', err);
		}
		this.emit('disposed');
	};

	WebSocketTransport.prototype.onWsError = function(err) {
		Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onError()', 'Unexpected error from WebSocket: ' + err.message);
		/* Wait a tick before aborting: if the websocket was connected, this event
		 * will be immediately followed by an onclose event with a close code. Allow
		 * that to close it (so we see the close code) rather than anticipating it */
		var self = this;
		Utils.nextTick(function() {
			self.disconnect(err);
		});
	};

	WebSocketTransport.prototype.dispose = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.dispose()', '');
		var wsConnection = this.wsConnection;
		if(wsConnection) {
			delete this.wsConnection;
			/* defer until the next event loop cycle before closing the socket,
			 * giving some implementations the opportunity to send any outstanding close message */
			Utils.nextTick(function() {
				Logger.logAction(Logger.LOG_MICRO, 'WebSocketTransport.dispose()', 'closing websocket');
				wsConnection.close();
			});
		}
	};

	return WebSocketTransport;
})();
