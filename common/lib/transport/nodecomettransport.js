var NodeCometTransport = (function() {
	var request = require('request');
	var util = require('util');

	/*
	 * A transport to use with nodejs
	 * to simulate an XHR transport for test purposes
	 */
	function NodeCometTransport(connectionManager, auth, options) {
		CometTransport.call(this, connectionManager, auth, options);
	}
	util.inherits(NodeCometTransport, CometTransport);

	NodeCometTransport.isAvailable = function() { return true; };
	ConnectionManager.availableTransports.comet = NodeCometTransport;

	NodeCometTransport.tryConnect = function(connectionManager, auth, options, callback) {
		var transport = new NodeCometTransport(connectionManager, auth, options);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'NodeCometTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	NodeCometTransport.prototype.toString = function() {
		return 'NodeCometTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	NodeCometTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		return new NodeCometTransport.Request(uri, params, body, expectToBlock, this.binary, callback);
	};

	NodeCometTransport.Request = function(uri, params, body, expectToBlock, binary, callback) {
		uri = CometTransport.paramStr(params, uri);
		var successCode, method; 
		if(body) method = 'POST', successCode = 201;
		else method = 'GET', successCode = 200;

		var headers, encoding;
		if(binary) {
			headers = {accept: 'application/x-thrift'};
			encoding = null;
		} else {
			headers = {accept: 'application/json'};
			encoding = 'utf8';
		}

		var self = this;
		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = setTimeout(function() { self.req.abort(); }, timeout);
		this.req = request({
			uri: uri,
			method: method,
			headers: headers,
			body: body,
			encoding: encoding
		}, function(err, response, body) {
			clearTimeout(timer);
			if(err) {
				callback(err);
				return;
			}
			if(response.statusCode != successCode) {
				err = new Error('Unexpected error in request');
				err.statusCode = response.statusCode;
				err.statusText = response.statusText;
			}
			callback(err, body);
		});
	};

	NodeCometTransport.Request.prototype.abort = function() {
		if(this.req)
			this.req.abort();
	};

	return NodeCometTransport;
})();
