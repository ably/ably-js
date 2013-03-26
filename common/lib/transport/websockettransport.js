var WebSocketTransport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var WebSocket = isBrowser ? (window.WebSocket || window.MozWebSocket) : require('ws');
//	var hasBuffer = isBrowser ? window.ArrayBuffer : Buffer;
	var hasBuffer = isBrowser ? false : Buffer;
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var thrift = isBrowser ? Thrift : require('thrift');

	/* public constructor */
	function WebSocketTransport(connectionManager, auth, params) {
		var binary = params.binary = params.binary && hasBuffer;
		this.sendOptions = {binary: binary};
		Transport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(WebSocketTransport, Transport);

	WebSocketTransport.isAvailable = function() {
		return !!WebSocket;
	};

	if(WebSocketTransport.isAvailable())
		ConnectionManager.transports.web_socket = WebSocketTransport;

	WebSocketTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new WebSocketTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('wserror', errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('wserror', errorCb);
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
		var host = params.host;
		var port = options.wsPort;
		var wsScheme = options.encrypted ? 'wss://' : 'ws://';
		var wsUri = wsScheme + host + ':' + port + '/applications/' + options.appId;
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
		this.auth.getAuthParams(function(err, authParams) {
			var paramStr = ''; for(var param in authParams) paramStr += ' ' + param + ': ' + authParams[param] + ';';
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr);
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			var connectParams = params.getConnectParams(authParams);
			try {
				var wsConnection = self.wsConnection = self.createWebSocket(wsUri, connectParams);
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
				/* here data is either a native Buffer (in the node case) or a Thrift Buffer or CheckedBuffer
				 * (in the browser case) */
				self.wsConnection.send((data.buf || data), self.sendOptions);
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
