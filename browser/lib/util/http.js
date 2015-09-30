var Http = (function() {
	var noop = function() {};

	function Http() {}

	/**
	 * Perform an HTTP GET request for a given path against prime and fallback Ably hosts
	 * @param rest
	 * @param path the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(rest, path, headers, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		var hosts, connection = rest.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(rest.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			Http.getUri(rest, uri(hosts[0]), headers, params, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		Http.getUri(rest, uri(hosts.shift()), headers, params, function(err) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					Http.getUri(rest, uri(hosts.shift()), headers, params, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	/**
	 * Perform an HTTP GET request for a given resolved URI
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.getUri = function(rest, uri, headers, params, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'Http.getUri()', 'Sending; ' + uri + '?' + (params ? JSON.stringify(params) : ''));
			callback = function(oldCallback) {
				return function(err) {
					Logger.logAction(Logger.LOG_MICRO, 'Http.getUri()', 'Received; ' + uri + '?' + (params ? JSON.stringify(params) : '') + '; args: ' + JSON.stringify(arguments));
					oldCallback.apply(err, arguments);
				};
			}(callback);
		}

		Http.Request(uri, headers, params, null, callback || noop);
	};

	/**
	 * Perform an HTTP POST request
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param body object or buffer containing request body
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.post = function(rest, path, headers, body, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		var hosts, connection = rest.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(rest.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			Http.postUri(rest, uri(hosts[0]), headers, body, params, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		Http.postUri(rest, uri(hosts.shift()), headers, body, params, function(err) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					Http.postUri(rest, uri(hosts.shift()), headers, body, params, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	/**
	 * Perform an HTTP POST request for a given resolved URI
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param body object or buffer containing request body
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.postUri = function(rest, uri, headers, body, params, callback) {
		if (Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'Http.postUri()', 'Sending; ' + uri + '?' + (params ? JSON.stringify(params) : '') + '; body: ' + body);
			callback = function(oldCallback) {
				return function(err) {
					Logger.logAction(Logger.LOG_MICRO, 'Http.postUri()', 'Received; ' + uri + '?' + (params ? JSON.stringify(params) : '') + '; args: ' + JSON.stringify(arguments));
					oldCallback.apply(err, arguments);
				};
			}(callback);
		}

		Http.Request(uri, headers, params, body, callback || noop);
	};

	Http.supportsAuthHeaders = false;
	Http.supportsLinkHeaders = false;
	return Http;
})();
