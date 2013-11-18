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
	function XHRTransport(connectionManager, auth, params) {
		params.binary = params.binary && XHRTransport.binary;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(XHRTransport, CometTransport);

	var isAvailable;
	XHRTransport.isAvailable = function() {
		var xhr = createXHR();
		if(!xhr)return false;
//		XHRTransport.binary = (window.ArrayBuffer && xhr.responseType);
		XHRTransport.binary = false;
		return true;
	};

	XHRTransport.checkConnectivity = function(callback) {
		(new XHRTransport.Request()).send('http://live.cdn.ably-realtime.com/is-the-internet-up.txt', null, null, false, function(err, responseText) {
			callback(null, (!err && responseText == 'yes'));
		});
	};

	XHRTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new XHRTransport(connectionManager, auth, params);
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
		(new XHRTransport.Request()).send(uri, params, body, expectToBlock, this.binary, callback);
	};

	XHRTransport.prototype.toString = function() {
		return 'XHRTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRTransport.Request = function() {};

	XHRTransport.Request.prototype.send = function(uri, params, body, expectToBlock, binary, callback) {
		uri = CometTransport.paramStr(params, uri);
		var successCode, method, err, timedout;
		if(body) method = 'POST', successCode = 201;
		else method = 'GET', successCode = 200;

		var xhr = this.xhr = createXHR();
		if(binary)
			xhr.responseType = 'arraybuffer';

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = setTimeout(function() { timedout = true; xhr.abort(); }, timeout);
		xhr.open(method, uri, true);
		xhr.setRequestHeader('Accept', binary ? 'application/x-thrift' : 'application/json');
		xhr.onerror = function(err) {
			err = err;
			err.code = 80000;
			callback(err);
		};
		xhr.onabort = function() {
			err = new Error(timedout ? 'Request timed out' : 'Request cancelled');
			err.statusCode = 404;
			err.code = 80000;
			callback(err);
		};
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4) {
				clearTimeout(timer);
				if(err) {
					callback(err);
					return;
				}
				if(xhr.status == successCode) {
					var responseBody = null;
					if(binary) {
						if(xhr.response) {
							responseBody = new Buffer();
							responseBody.buf = xhr.response;
							responseBody.view = new DataView(responseBody.buf);
						}
					} else {
						responseBody = xhr.responseText;
					}
					callback(null, responseBody);
					return;
				}
				if(xhr.status != 0) {
					err = new Error('Unexpected response: statusCode = ' + xhr.status);
					err.statusCode = xhr.status;
					err.code = 80000;
					err.statusText = xhr.statusText;
					callback(err);
					return;
				}
				/* statusCode is 0, so expect either an onerror or onabort callback */
			}
		};
		xhr.send(body);
	};

	XHRTransport.Request.prototype.abort = function() {
		if(this.xhr)
			this.xhr.abort();
	};

	if(XHRTransport.isAvailable()) {
		ConnectionManager.httpTransports.xhr = ConnectionManager.transports.xhr = XHRTransport;
		Http.Request = function(uri, params, body, binary, callback) {
			(new XHRTransport.Request()).send(uri, params, body, false, binary, callback);
		};
	}

	return XHRTransport;
})();
