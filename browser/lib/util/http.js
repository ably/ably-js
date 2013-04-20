this.Http = (function() {
	var noop = function() {};

	function Http() {}

	/**
	 * Perform an HTTP GET request
	 * @param realtime
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(realtime, path, headers, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return realtime.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		function tryGet(uri, cb) {
			Http.Request(uri, params, null, binary, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryGet(uri, callback);
			return;
		}

		var host, connection = realtime.connection, options = realtime.options, restHost = options.restHost;
		if(connection.state == 'connected')
			host = connection.connectionManager.host;
		else if(!options.fallbackHosts)
			host = restHost;

		/* if there is only one host do it */
		if(host) {
			tryGet(uri(host), callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		var hosts = fallbackHosts.slice().unshift(restHost);
		tryGet(hosts.shift(), function(err, statusCode, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryGet(hosts, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
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
	Http.post = function(realtime, path, headers, body, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return realtime.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		function tryPost(uri, cb) {
			Http.Request(uri, params, body, binary, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryGet(uri, callback);
			return;
		}

		var host, connection = realtime.connection, options = realtime.options, restHost = options.restHost;
		if(connection.state == 'connected')
			host = connection.connectionManager.host;
		else if(!options.fallbackHosts)
			host = restHost;

		/* if there is only one host do it */
		if(host) {
			tryPost(uri(host), callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		var hosts = fallbackHosts.slice().unshift(restHost);
		tryPost(hosts.shift(), function(err, statusCode, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryPost(hosts, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	return Http;
})();
