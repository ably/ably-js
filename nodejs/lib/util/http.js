this.Http = (function() {
	var request = require('request');
	var noop = function() {};

	/***************************************************
	 *
	 * These Http ops are used for REST operations
	 * and assume that the system is stateless - ie
	 * there is no connection state that tells us
	 * anything about the state of the network or the
	 * viability of any of the hosts we know about.
	 * Therefore all requests will respond to specific
	 * errors by attempting the fallback hosts, and no
	 * assumptions about host or network is retained to
	 * influence the handling of any subsequent request.
	 *
	 ***************************************************/

	var handler = function(callback) {
		return function(err, response, body) {
			callback = callback || noop;
			if(err) {
				callback(err);
				return;
			}
			var statusCode = response.statusCode;
			if(statusCode >= 300) {
				callback(body.error || {statusCode: statusCode});
				return;
			}
			callback(null, body);
		};
	};

	function Http() {}

	/**
	 * Perform an HTTP GET request
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(rest, path, headers, params, callback) {
		var options = rest.options, fallbackHosts = options.fallbackHosts, restHost = options.restHost;
		var hosts = fallbackHosts ? fallbackHosts.slice().unshift(restHost) : restHost;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };

		var getOptions = {headers:headers}, wrappedCb = handler(callback);
		if(!headers || headers.accept == 'application/json') getOptions.json = true;
		if(params)
			getOptions.qs = params;

		function tryGet(resolvedUri, cb) {
			getOptions.uri = resolvedUri;
			request.get(getOptions, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryGet(uri, wrappedCb);
			return;
		}

		/* see if we have one or more than one host */
		if(!Array.isArray(hosts)) {
			tryGet(uri(hosts), wrappedCb);
			return;
		} else if(host.length == 1) {
			tryGet(uri(hosts[0]), wrappedCb);
			return;
		}

		/* so host is an array with preferred host plus at least one fallback */
		tryGet(hosts.shift(), function(err, response, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryGet(hosts, wrappedCb);
					return;
				}
			}
			wrappedCb.apply(null, arguments);
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
	Http.post = function(rest, path, headers, body, params, callback) {
		var options = rest.options, fallbackHosts = options.fallbackHosts, restHost = options.restHost;
		var hosts = fallbackHosts ? fallbackHosts.slice().unshift(restHost) : restHost;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };

		var postOptions = {headers:headers, body:body}, wrappedCb = handler(callback);
		if(!headers || headers.accept == 'application/json') postOptions.json = true;
		if(params)
			postOptions.qs = params;

		function tryPost(uri, cb) {
			postOptions.uri = uri;
			request.post(postOptions, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryPost(uri, wrappedCb);
			return;
		}

		/* see if we have one or more than one host */
		if(!Array.isArray(hosts)) {
			tryPost(uri(hosts), wrappedCb);
			return;
		} else if(host.length == 1) {
			tryPost(uri(hosts[0]), wrappedCb);
			return;
		}

		/* so host is an array with preferred host plus at least one fallback */
		tryPost(hosts.shift(), function(err, response, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryPost(hosts, wrappedCb);
					return;
				}
			}
			wrappedCb.apply(null, arguments);
		});
	};

	return Http;
})();
