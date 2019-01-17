"use strict";
this.Http = (function() {
	var request = require('request');
	var msgpack = Platform.msgpack;
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
				switch(headers['content-type']) {
					case 'application/json':
						body = JSON.parse(body);
						break;
					case 'application/x-msgpack':
						body = msgpack.decode(body);
				}
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

	function getHosts(client) {
		/* If we're a connected realtime client, try the endpoint we're connected
		 * to first -- but still have fallbacks, being connected is not an absolute
		 * guarantee that a datacenter has free capacity to service REST requests. */
		var connection = client.connection,
			connectionHost = connection && connection.connectionManager.host;

		if(connectionHost) {
			return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
		}

		return Defaults.getHosts(client.options);
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
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var hosts = getHosts(rest);

		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.getUri(rest, uri(hosts[0]), headers, params, callback);
			return;
		}

		/* so host is an array with preferred host plus at least one fallback */
		var tryAHost = function(candidateHosts) {
			Http.getUri(rest, uri(candidateHosts.shift()), headers, params, function(err) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					/* use a fallback host if available */
					tryAHost(candidateHosts);
					return;
				}
				callback.apply(null, arguments);
			});
		}
		tryAHost(hosts);
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
		/* Will generally be making requests to one or two servers exclusively
		* (Ably and perhaps an auth server), so for efficiency, use the
		* foreverAgent to keep the TCP stream alive between requests where possible */
		var agentOptions = (rest && rest.options.restAgentOptions) || Defaults.restAgentOptions;
		var getOptions = {headers: headers, encoding: null, agentOptions: agentOptions};
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
		var hosts = getHosts(rest);

		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.postUri(rest, uri(hosts[0]), headers, body, params, callback);
			return;
		}

		var tryAHost = function(candidateHosts) {
			Http.postUri(rest, uri(candidateHosts.shift()), headers, body, params, function(err) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					tryAHost(candidateHosts);
					return;
				}
				callback.apply(null, arguments);
			});
		};
		tryAHost(hosts);
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
		var agentOptions = (rest && rest.options.restAgentOptions) || Defaults.restAgentOptions;
		var postOptions = {headers: headers, body: body, encoding: null, agentOptions: agentOptions};
		if(params)
			postOptions.qs = params;

		postOptions.uri = uri;
		postOptions.timeout = (rest && rest.options.timeouts || Defaults.TIMEOUTS).httpRequestTimeout;
		request.post(postOptions, handler(uri, params, callback));
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
