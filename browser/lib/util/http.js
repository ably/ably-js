var Http = (function() {
	var noop = function() {};

	function Http() {}

	function shouldFallback(err) {
		var statusCode = err.statusCode;
		/* 400 + no code = a generic xhr onerror. Browser doesn't give us enough
		 * detail to know whether it's fallback-fixable, but it may be (eg if a
		 * network issue), so try just in case */
		return (statusCode === 408 && !err.code) ||
			(statusCode === 400 && !err.code)      ||
			(statusCode >= 500 && statusCode <= 504);
	}

	/**
	 * Perform an HTTP GET request for a given path against prime and fallback Ably hosts
	 * @param rest
	 * @param path the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(rest, path, headers, params, callback) {
		Http['do']('get', rest, path, headers, null, params, callback);
	}

	/**
	 * Perform an HTTP GET request for a given resolved URI
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.getUri = function(rest, uri, headers, params, callback) {
		Http.Request('get', rest, uri, headers, params, null, callback);
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
		Http['do']('post', rest, path, headers, body, params, callback);
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
		Http.Request('post', rest, uri, headers, params, body, callback);
	};

	Http['delete'] = function(rest, path, headers, params, callback) {
		Http['do']('delete', rest, path, headers, null, params, callback);
	}

	Http.deleteUri = function(rest, uri, headers, params, callback) {
		Http.Request('delete', rest, uri, headers, params, null, callback);
	};

	Http.put = function(rest, path, headers, body, params, callback) {
		Http['do']('put', rest, path, headers, body, params, callback);
	};

	Http.putUri = function(rest, uri, headers, body, params, callback) {
		Http.Request('put', rest, uri, headers, params, body, callback);
	};

	Http['do'] = function(method, rest, path, headers, body, params, callback) {
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
			Http.Request(method, rest, uri(hosts[0]), headers, params, body, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		var tryAHost = function(candidateHosts) {
			Http.Request(method, rest, uri(candidateHosts.shift()), headers, params, body, function(err) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					tryAHost(candidateHosts);
					return;
				}
				callback.apply(null, arguments);
			});
		};
		tryAHost(hosts);
	};

	Http.supportsAuthHeaders = false;
	Http.supportsLinkHeaders = false;
	return Http;
})();
