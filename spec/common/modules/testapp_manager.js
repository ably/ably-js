"use strict";
/* global define, isNativescript, fetch */

/* testapp module is responsible for setting up and tearing down apps in the test environment */
define(['globals', 'browser-base64', 'ably'], function(ablyGlobals, base64, ably) {
	var restHost = ablyGlobals.restHost || prefixDomainWithEnvironment('rest.ably.io', ablyGlobals.environment),
			tlsPort  = ablyGlobals.tlsPort;


	var isBrowser = (typeof(window) === 'object'),
		isNativescript = (typeof global  === 'object' && global.isNativescript),
		httpReq   = httpReqFunction(),
		toBase64  =  base64Function(),
		loadJsonData = loadJsonDataNode,
		testResourcesPath = 'spec/common/ably-common/test-resources/';

	if (isNativescript) {
		loadJsonData = loadJsonNativescript;
		testResourcesPath = '~/tns_modules/ably/' + testResourcesPath;
	}
	else if (isBrowser) {
		loadJsonData = loadJsonDataBrowser;
		if (window.__karma__ && window.__karma__.start) {
			testResourcesPath = 'base/' + testResourcesPath;
		}
	}

	function prefixDomainWithEnvironment(domain, environment) {
		if (environment.toLowerCase() === 'production') {
			return domain;
		} else {
			return environment + '-' + domain;
		}
	}

	function createXHR() {
		var result = new XMLHttpRequest();
		if ('withCredentials' in result)
			return result;
		if(typeof XDomainRequest !== "undefined") {
			var xdr = new XDomainRequest();        /* Use IE-specific "CORS" code with XDR */
			xdr.isXDR = true;
			return xdr;
		}
		return null;
	}

	function NSbase64Function(d) {
		return base64.encode(d);
	}

	function base64Function() {
		if (isBrowser) {
			return base64.encode;
		} else {
			return function (str) { return (new Buffer(str, 'ascii')).toString('base64'); };
		}
	}

	function schemeMatchesCurrent(scheme) {
		return scheme === window.location.protocol.slice(0, -1);
	}

	function httpReqFunction() {
		if (isNativescript) {
			return function(options, callback) {
				var http = require('http');
				var uri = options.scheme + '://' + options.host + ':' + options.port + options.path;

				http.request({
					url: uri,
					method: options.method || 'GET',
					timeout: 10000,
					headers: options.headers,
					content: options.body
				}).then(function (results) {
					callback(null, results.content.toString());
				})['catch'](function(err) {
					callback(err);
				});
			};
		}
		else if (isBrowser) {
			return function(options, callback) {
				var xhr = createXHR();
				var uri;

				uri = options.scheme + '://' + options.host + ':' + options.port + options.path;

				if(xhr.isXDR && !schemeMatchesCurrent(options.scheme)) {
					/* Can't use XDR for cross-scheme. For some requests could just force
					* the same scheme and be done with it, but not for authenticated
					* requests to ably, can't use basic auth for non-tls endpoints.
					* Luckily ably can handle jsonp, so just use the ably Http method,
					* which will use the jsonp transport. Can't just do this all the time
					* as the local express webserver serves files statically, so can't do
					* jsonp. */
					if(options.method === 'DELETE') {
						/* Ignore DELETEs -- can't be done with jsonp at the moment, and
						 * simulation apps self-delete after a while */
						callback();
					} else {
						ably.Rest.Http.doUri(options.method, null, uri, options.headers, options.body, options.paramsIfNoHeaders || {}, callback);
					}
					return;
				}

				xhr.open(options.method, uri);
				if(options.headers && !xhr.isXDR) {
					for (var h in options.headers) if (h !== 'Content-Length') xhr.setRequestHeader(h, options.headers[h]);
				}
				xhr.onerror = function(err) { callback(err); };
				if('onreadystatechange' in xhr) {
					/* XHR */
					xhr.onreadystatechange = function() {
						if(xhr.readyState == 4) {
							if (xhr.status >= 300) {
								callback('HTTP request failed '+xhr.status);
								return;
							}
							callback(null, xhr.responseText);
						}
					};
				} else {
					/* XDR */
					xhr.onload = function () {
						if (xhr.status >= 300) {
							callback('HTTP request failed '+xhr.status);
							return;
						}
						callback(null, xhr.responseText);
					};
				}
				xhr.send(options.body);
			};
		} else {
			var http = require('http'),
					https = require('https');

			return function(options, callback) {
				var body = options.body;
				delete options.body;
				var response = '';
				var request = (options.scheme == 'http' ? http : https).request(options, function (res) {
					res.setEncoding('utf8');
					res.on('data', function (chunk) { response += chunk; });
					res.on('end', function () {
						if (res.statusCode >= 300) {
							callback('Invalid HTTP request: ' + response + '; statusCode = ' + res.statusCode);
						} else {
							callback(null, response);
						}
					});
				});
				request.on('error', function (err) { callback(err); });
				request.end(body);
			};
		}
	}

	function createNewApp(callback) {
		loadJsonData(testResourcesPath + 'test-app-setup.json', function(err, testData){
			if(err) {
				callback(err);
				return;
			}
			var postData = JSON.stringify(testData.post_apps);
			var postOptions = {
				host: restHost, port: tlsPort, path: '/apps', method: 'POST', scheme: 'https',
				headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Content-Length': postData.length },
				body: postData
			};

			httpReq(postOptions, function(err, res) {
				if (err) {
					callback(err);
				} else {
					if (typeof(res) === 'string') res = JSON.parse(res);
					if (res.keys.length != testData.post_apps.keys.length) {
						callback('Failed to create correct number of keys for app');
					} else if (res.namespaces.length != testData.post_apps.namespaces.length) {
						callback('Failed to create correct number of namespaces for app');
					} else {
						var testApp = {
							accountId: res.accountId,
							appId: res.appId,
							keys: res.keys,
							cipherConfig: testData.cipher
						};
						callback(null, testApp);
					}
				}
			});
		});
	}

	function createStatsFixtureData(app, statsData, callback) {
		var postData = JSON.stringify(statsData);

		var authKey = app.keys[0].keyStr,
				authHeader = toBase64(authKey);

		var postOptions = {
			host: restHost, port: tlsPort, path: '/stats', method: 'POST', scheme: 'https',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Content-Length': postData.length,
				'Authorization': 'Basic ' + authHeader
			},
			body: postData,
			paramsIfNoHeaders: {key: authKey}
		};

		httpReq(postOptions, function(err) {
			if (err) {
				callback(err);
			} else {
				callback(null);
			}
		});
	}

	function deleteApp(app, callback) {
		var authKey = app.keys[0].keyStr,
				authHeader = toBase64(authKey);

		var delOptions = {
			host: restHost, port: tlsPort, method: 'DELETE', path: '/apps/' + app.appId,
			scheme: 'https', headers: { 'Authorization': 'Basic ' + authHeader }
		};

		httpReq(delOptions, function(err) { callback(err); });
	}

	function loadJsonNativescript(datapath, callback) {
		var d = require(datapath);
		callback(null, d);
	}

	function loadJsonDataBrowser(dataPath, callback) {
		var getOptions = {
			host: window.location.hostname,
			port: window.location.port,
			path: '/' + dataPath,
			method: 'GET',
			scheme: window.location.protocol.slice(0, -1),
			headers: { 'Content-Type': 'application/json' }
		};

		httpReq(getOptions, function(err, data) {
			if(err) {
				callback(err);
				return;
			}
			try {
				data = JSON.parse(data);
			} catch(e) {
				callback(e);
				return;
			}
			callback(null, data);
		});
	}

	function loadJsonDataNode(dataPath, callback) {
		var fs = require('fs'),
				path = require('path'),
				resolvedPath = path.resolve(__dirname, '../../..', dataPath);

		fs.readFile(resolvedPath, function(err, data) {
			if(err) {
				callback(err);
				return;
			}
			try {
				data = JSON.parse(data);
			} catch(e) {
				callback(e);
				return;
			}
			callback(null, data);
		});
	}

	return module.exports = {
		setup: createNewApp,
		tearDown: deleteApp,
		createStatsFixtureData: createStatsFixtureData,
		httpReq: httpReq,
		loadJsonData: loadJsonData,
		testResourcesPath: testResourcesPath
	};
});
