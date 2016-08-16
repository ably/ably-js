"use strict";
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

	var handler = function(uri, params, callback) {
		callback = callback || noop;
		return function(err, response, body) {
			if(err) {
				callback(err);
				return;
			}
			var statusCode = response.statusCode, headers = response.headers;
			if(statusCode >= 300) {
				if(headers['content-type'] == 'application/json') body = JSON.parse(body);
				callback(body.error || {statusCode: statusCode}, body, headers, true);
				return;
			}
			callback(null, body, headers, false);
		};
	};

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
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var hosts = Defaults.getHosts(rest.options);

		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.getUri(rest, uri(hosts[0]), headers, params, callback);
			return;
		}

		/* so host is an array with preferred host plus at least one fallback */
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
		var getOptions = {headers:headers, encoding:null};
		if(params)
			getOptions.qs = params;

		getOptions.uri = uri;
		getOptions.timeout = (rest && rest.options.timeouts || Defaults.TIMEOUTS).httpRequestTimeout;
		request.get(getOptions, handler(uri, params, callback));
	};

	/**
	 * Perform an HTTP POST request for a given path against prime and fallback Ably hosts
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param body object or buffer containing request body
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.post = function(rest, path, headers, body, params, callback) {
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var hosts = Defaults.getHosts(rest.options);

		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.postUri(rest, uri(hosts[0]), headers, body, params, callback);
			return;
		}

		/* so host is an array with preferred host plus at least one fallback */
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
		var postOptions = {headers:headers, body:body, encoding:null};
		if(params)
			postOptions.qs = params;

		postOptions.uri = uri;
		postOptions.timeout = (rest && rest.options.timeouts || Defaults.TIMEOUTS).httpRequestTimeout;
		request.post(postOptions, handler(uri, params, callback));
	};

	Http.supportsAuthHeaders = true;
	Http.supportsLinkHeaders = true;

	return Http;
})();
