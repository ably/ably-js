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
				var error = body.error || {
					statusCode: statusCode,
					code: headers['x-ably-errorcode'],
					message: headers['x-ably-errormessage']
				};
				callback(error, body, headers, true, statusCode);
				return;
			}
			callback(null, body, headers, false, statusCode);
		};
	};

	function Http() {}

	function shouldFallback(err) {
		var code = err.code,
			statusCode = err.statusCode;
		return code === 'ENETUNREACH' ||
			code === 'EHOSTUNREACH'     ||
			code === 'EHOSTDOWN'        ||
			code === 'ETIMEDOUT'        ||
			code === 'ESOCKETTIMEDOUT'  ||
			code === 'ENOTFOUND'        ||
			code === 'ECONNRESET'       ||
			code === 'ECONNREFUSED'     ||
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
		Http.do('get', rest, path, headers, null, params, callback);
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
		Http.doUri('get', rest, uri, headers, null, params, callback);
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
		Http.do('post', rest, path, headers, body, params, callback);
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
		Http.doUri('post', rest, uri, headers, body, params, callback);
	};

	Http.delete = function(rest, path, headers, params, callback) {
		Http.do('delete', rest, path, headers, null, params, callback);
	};

	Http.deleteUri = function(rest, uri, headers, params, callback) {
		Http.doUri('delete', rest, uri, headers, null, params, callback);
	};

	Http.put = function(rest, path, headers, body, params, callback) {
		Http.do('put', rest, path, headers, body, params, callback);
	};

	Http.putUri = function(rest, uri, headers, body, params, callback) {
		Http.doUri('put', rest, uri, headers, body, params, callback);
	};

	Http.do = function(method, rest, path, headers, body, params, callback) {
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var hosts = Defaults.getHosts(rest.options);

		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.doUri(method, rest, uri(hosts[0]), headers, body, params, callback);
			return;
		}

		var tryAHost = function(candidateHosts) {
			Http.doUri(method, rest, uri(candidateHosts.shift()), headers, body, params, function(err) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					tryAHost(candidateHosts);
					return;
				}
				callback.apply(null, arguments);
			});
		};
		tryAHost(hosts);
	};

	Http.doUri = function(method, rest, uri, headers, body, params, callback) {
		/* Will generally be making requests to one or two servers exclusively
		* (Ably and perhaps an auth server), so for efficiency, use the
		* foreverAgent to keep the TCP stream alive between requests where possible */
		var agentOptions = (rest && rest.options.restAgentOptions) || Defaults.restAgentOptions;
		var doOptions = {headers: headers, encoding: null, forever: true, agentOptions: agentOptions};
		if (body) {
			doOptions.body = body;
		}
		if(params)
			doOptions.qs = params;

		doOptions.uri = uri;
		doOptions.timeout = (rest && rest.options.timeouts || Defaults.TIMEOUTS).httpRequestTimeout;
		request[method](doOptions, handler(uri, params, callback));
	};

	Http.supportsAuthHeaders = true;
	Http.supportsLinkHeaders = true;

	Http.checkConnectivity = function(callback) {
		var upUrl = Defaults.internetUpUrl;
		Http.getUri(null, upUrl, null, null, function(err, responseText) {
			callback(null, (!err && responseText.toString().trim() === 'yes'));
		});
	};

	return Http;
})();
