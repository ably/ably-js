var XHRTransport = (function() {

	var createXHR = function() {
		var result = new XMLHttpRequest();
		if ('withCredentials' in result)
			return result;

		if(typeof XDomainRequest !== "undefined")
			/* Use IE-specific "CORS" code with XDR */
			return new XDomainRequest();

		return null;
	};

	/* public constructor */
	function XHRTransport(connectionManager, auth, options) {
		options.useTextProtocol = options.useTextProtocol || !XHRTransport.binary;
		CometTransport.call(this, connectionManager, auth, options);
	}
	Utils.inherits(XHRTransport, CometTransport);

	XHRTransport.isAvailable = function() {
		var xhr = createXHR();
		if(!xhr) return false;
//		XHRTransport.binary = (window.ArrayBuffer && xhr.responseType);
		XHRTransport.binary = false;
		return true;
	};

	if(XHRTransport.isAvailable())
		ConnectionManager.availableTransports.xhr = XHRTransport;

	XHRTransport.tryConnect = function(connectionManager, auth, options, callback) {
		var transport = new XHRTransport(connectionManager, auth, options);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'XHRTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	XHRTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		return new XHRTransport.Request(uri, params, body, expectToBlock, this.binary, callback);
	};

	XHRTransport.prototype.toString = function() {
		return 'XHRTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRTransport.Request = function(uri, params, body, expectToBlock, binary, callback) {
		uri = CometTransport.paramStr(params, uri);
		var successCode, method; 
		if(body) method = 'POST', successCode = 201;
		else method = 'GET', successCode = 200;

		var xhr = this.xhr = createXHR();
		if(binary)
			xhr.responseType = 'arraybuffer';

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = setTimeout(timeout, function() { xhr.abort(); });
		xhr.open(method, uri, true);
		xhr.setRequestHeader('Accept', binary ? 'application/x-thrift' : 'application/json');
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4) {
				clearTimeout(timer);
				var err = null;
				if(xhr.status != successCode) {
					err = new Error('Unexpected response: statusCode = ' + xhr.status);
					err.statusCode = xhr.status;
					err.statusText = xhr.statusText;
					callback(err);
					return;
				}
				var response = null;
				if(binary) {
					if(xhr.response) {
						response = new Buffer();
						response.buf = xhr.response;
						response.view = new DataView(response.buf);
					}
				} else {
					response = xhr.responseText;
				}
				callback(null, response);
			}
		};
		xhr.send(body);
	};

	XHRTransport.Request.prototype.abort = function() {
		if(this.xhr)
			this.xhr.abort();
	};

	return XHRTransport;
})();
