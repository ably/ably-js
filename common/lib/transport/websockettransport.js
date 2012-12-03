var WebSocketTransport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var WebSocket = isBrowser ? (window.WebSocket || window.MozWebSocket) : require('ws');
	var hasBuffer = isBrowser ? window.ArrayBuffer : Buffer;
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var thrift = isBrowser ? Thrift : require('thrift');

	/* public constructor */
	function WebSocketTransport(connectionManager, auth, options) {
		var binary = !(options.useTextProtocol |= !hasBuffer);
		if(!hasBuffer) options.useTextProtocol = true;
		this.sendOptions = {binary: binary};
		Transport.call(this, connectionManager, auth, options);
	}
	Utils.inherits(WebSocketTransport, Transport);

	WebSocketTransport.isAvailable = function() {
		return !!WebSocket;
	};

	if(WebSocketTransport.isAvailable())
		ConnectionManager.availableTransports.web_socket = WebSocketTransport;

	WebSocketTransport.tryConnect = function(connectionManager, auth, options, callback) {
		var transport = new WebSocketTransport(connectionManager, auth, options);
		var errorCb = function(err) { callback(err); };
		transport.on('wserror', errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('wserror', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	WebSocketTransport.prototype.createWebSocket = function(uri, params) {
		var paramCount = 0;
		if(params) {
			for(var key in params)
				uri += (paramCount++ ? '&' : '?') + key + '=' + params[key];
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
		var self = this;
		var host = this.options.host;
		var port = this.options.wsPort;
		var wsScheme = this.options.encrypted ? 'wss://' : 'ws://';
		var wsUri = wsScheme + host + ':' + port + '/applications/' + this.options.appId;
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
		this.auth.getAuthParams(function(err, params) {
			var paramStr = ''; for(var param in params) paramStr += ' ' + param + ': ' + params[param] + ';';
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr);
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			try {
				var wsConnection = self.wsConnection = self.createWebSocket(wsUri, params);
				wsConnection.binaryType = 'arraybuffer';
				wsConnection.onopen = function() { self.onWsOpen(); };
				wsConnection.onclose = function(ev, wsReason) { self.onWsClose(ev, wsReason); };
				wsConnection.onmessage = function(ev) { self.onWsData(ev.data, typeof(ev.data) != 'string'); };
				wsConnection.onerror = function(ev) { self.onWsError(ev); };
			} catch(e) { self.onWsError(e); }
		});
	};

	WebSocketTransport.prototype.close = function() {
		this.dispose();
		Transport.prototype.close.call(this);
	};

	WebSocketTransport.prototype.abort = function(reason) {
		this.dispose();
		Transport.prototype.abort.call(this);
	};

	WebSocketTransport.prototype.send = function(msg, callback) {
		var self = this;
		try {
			var protocol = new this.thriftProtocol(new this.thriftTransport(this.protocolBuffer, function(data) {
				self.wsConnection.send(data, self.sendOptions);
				callback(null);
			}));
			msg.write(protocol);
			protocol.flush();
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.send()', msg);
			callback(new Error(msg));
		}
	};

	WebSocketTransport.prototype.onWsData = function(data, binary) {
		var protocol = binary
			? new thrift.TBinaryProtocol(new thrift.TTransport(data))
			: new thrift.TJSONProtocol(new thrift.TStringTransport(data));
					
		var message = new messagetypes.TChannelMessage();
		try {
			message.read(protocol);
			this.onChannelMessage(message);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'Transport.onChannelEvent()', 'Unexpected exception handing channel event: ' + e.stack);
		}
	};

	WebSocketTransport.prototype.onWsOpen = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsOpen()', 'opened WebSocket');
		this.emit('wsopen');
	};

	WebSocketTransport.prototype.onWsClose = function(ev, wsReason) {
		var wasClean, code, reason;
		if(typeof(ev) == 'object') {
			/* W3C spec-compatible */
			wasClean = ev.wasClean;
			code = ev.code;
			reason = ev.reason;
		} else /*if(typeof(ev) == 'number')*/ {
			/* ws in node */
			code = ev;
			reason = wsReason || '';
			wasClean = (code == 1000);
		}
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsClose()', 'closed WebSocket; wasClean = ' + wasClean + '; code = ' + code);
		delete this.wsConnection;
		Transport.prototype.onClose.call(this, wasClean, reason);
	};

	WebSocketTransport.prototype.onWsError = function(err) {
		Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onError()', 'Unexpected error from WebSocket: ' + err);
		this.emit('wserror', err);
		/* FIXME: this should not be fatal */
		this.abort();
	};

	WebSocketTransport.prototype.dispose = function() {
		if(this.wsConnection) {
			this.wsConnection.close();
			delete this.wsConnection;
		}
	};

	return WebSocketTransport;
})();
