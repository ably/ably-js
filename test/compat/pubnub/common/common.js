"use strict";

exports.TestBaseClass = function() {
	if (exports.TestBaseClass.prototype._singletonInstance)
		return exports.TestBaseClass.prototype._singletonInstance;
	exports.TestBaseClass.prototype._singletonInstance = this;
	return this;
};

exports.setup = function() {
	var rExports = exports.TestBaseClass();
	var isBrowser = rExports.isBrowser = (typeof(window) === 'object');

	if (isBrowser) {
		var http = null;
		var PUBNUB = window.PUBNUB;

		var adminHost = testVars.realtimeHost || 'localhost';
		var adminPort = testVars.useTls ? (testVars.realtimeTlsPort || '8081') : (testVars.realtimePort || '8080');
		var adminScheme = testVars.useTls ? 'https' : 'http';
		var wsHost = testVars.realtimeHost || 'localhost.ably.io';
		var restHost = testVars.restHost || 'localhost.ably.io';
		var port = testVars.realtimePort || '8080';
		var tlsPort = testVars.realtimeTlsPort || '8081';
		var useTls = testVars.useTls;

		var httpReq = function(options, callback) {
			var uri = options.scheme + '://' + options.host + ':' + options.port + options.path;
			var xhr = createXHR();
			xhr.open(options.method, uri);
			if (options.headers) {
				for (var h in options.headers) if (h !== 'Content-Length') xhr.setRequestHeader(h, options.headers[h]);
			}
			xhr.onerror = function(err) { callback(err); };
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4) {
					if (xhr.status >= 300) {
						callback('HTTP request failed '+xhr.status);
						return;
					}
					callback(null, xhr.responseText);
				}
			};
			xhr.send(options.body);
		};
		var toBase64 = Base64.encode;
	} else {
		var http = require('http');
		var https = require('https');
		var PUBNUB = require('../../../../browser/compat/pubnub.js');

		var adminHost = process.env.ADMIN_ADDRESS || 'localhost';
		var adminPort = process.env.ADMIN_PORT || '8081';
		var adminScheme = process.env.ADMIN_SCHEME || 'https';
		var wsHost = process.env.WEBSOCKET_ADDRESS || 'localhost.ably.io';
		var restHost = process.env.REST_ADDRESS || 'localhost.ably.io';
		var port = process.env.WEBSOCKET_PORT || '8080';
		var tlsPort = process.env.WEBSOCKET_TLS_PORT || '8081';
		var useTls = true;

		var httpReq = function(options, callback) {
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
						//console.log('Teardown response: '+response);
						callback(null, response);
					}
				});
			});
			request.on('error', function (err) { callback(err); });
			request.end(body);
		}
		var toBase64 = function(str) { return (new Buffer(str, 'ascii')).toString('base64'); };
	}

	var pubnubOpts = {
		ssl          : useTls,
		origin       : wsHost + ':' + port,
		tlsorigin    : wsHost + ':' + tlsPort
	};

	rExports.setupRefcount = 0;
	rExports.cipherKey = [0,0,0,0];
	rExports.getPubnub = function() { return rExports.pubnub; }

	rExports.randomid = function randomid(length) {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(var i=0; i<length; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	};

	function mixin(target, source) {
		source = source || {};
		Object.keys(source).forEach(function(key) {
			target[key] = source[key];
		});
		return target;
	}

	rExports.containsValue = function(ob, value) {
		for(var key in ob) {
			if(ob[key] == value)
				return true;
		}
		return false;
	};

	rExports.displayError = function(err) {
		if(typeof(err) == 'string')
			return err;

		var result = '';
		if(err.statusCode)
			result += err.statusCode + '; ';
		if(typeof(err.message) == 'string')
			result += err.message;
		if(typeof(err.message) == 'object')
			result += JSON.stringify(err.message);

		return result;
	};

	rExports.testVars = {};

	var createXHR = function() {
		var result = new XMLHttpRequest();
		if ('withCredentials' in result)
			return result;
		if(typeof XDomainRequest !== "undefined")
			return new XDomainRequest();        /* Use IE-specific "CORS" code with XDR */
		return null;
	};

	var _setupTestPubnub = function(use_secure, callback) {
		var key = rExports.testVars.testAppId + '.' + rExports.testVars.testKey0Id + ':' + rExports.testVars.testKey0.value;
		if (use_secure) {
			rExports.pubnub = PUBNUB.secure({
				ably_key      : key,
				origin        : pubnubOpts.origin,
				tlsorigin     : pubnubOpts.tlsorigin,
				uuid          : 'client-'+rExports.randomid(6),
				cipher_key    : rExports.cipherKey
			});
		} else {
			rExports.pubnub = PUBNUB.init({
				ably_key      : key,
				origin        : pubnubOpts.origin,
				tlsorigin     : pubnubOpts.tlsorigin,
				uuid          : 'client-'+rExports.randomid(6)
			});
		}
		if (rExports.pubnub == null)
			callback('Failed to create pubnub instance', null);
		else if (rExports.pubnub !== PUBNUB)
			callback('Pubnub instance error', null);
		else
			callback(null, rExports.pubnub);
	};

	var _setupTestAccount = function(callback) {
		var appSpec = {
			namespaces: [
				{id: "persisted", persisted: true }
			],
			keys : [
				{}, /* key0 is blanket capability */
				{   /* key1 is specific channel and ops */
					capability: JSON.stringify({ testchannel:['publish'] })
				},
				{   /* key2 is wildcard channel spec */
					capability: JSON.stringify({
						'*':['subscribe'],
						'canpublish:*':['publish'],
						'canpublish:andpresence':['presence', 'publish']
					})
				},
				{   /* key3 is wildcard ops spec */
					capability: JSON.stringify({ 'candoall':['*'] })
				},
				{   /* key4 is multiple resources */
					capability: JSON.stringify({
						channel0:['publish'],
						channel1:['publish'],
						channel2:['publish', 'subscribe'],
						channel3:['subscribe'],
						channel4:['presence', 'publish', 'subscribe'],
						channel5:['presence'],
						channel6:['*']
					})
				},
				{   /* key5 has wildcard clientId */
					privileged: true,
					capability: JSON.stringify({
						channel0:['publish'],
						channel1:['publish'],
						channel2:['publish', 'subscribe'],
						channel3:['subscribe'],
						channel4:['presence', 'publish', 'subscribe'],
						channel5:['presence'],
						channel6:['*']
					})
				}
			]
		};

		var postData = JSON.stringify(appSpec);
		var postOptions = {
			host: adminHost, port: adminPort, path: '/apps', method: 'POST', scheme: adminScheme,
			headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length },
			body: postData
		};
		httpReq(postOptions, function(err, res) {
			if (err) {
				callback(err);
			} else {
				//console.log('Setup response: '+res);
				if (typeof(res) === 'string') res = JSON.parse(res);
				if (res.keys.length != appSpec.keys.length) {
					callback('Failed to create correct number of keys for app');
				} else if (res.namespaces.length != appSpec.namespaces.length) {
					callback('Failed to create correct number of namespaces for app');
				} else {
					rExports.testVars.testAcct = res.accountId;
					rExports.testVars.testAppId = res.id;
					for (var i=0; i<res.keys.length; i++) {
						rExports.testVars['testKey'+i] = res.keys[i];
						rExports.testVars['testKey'+i+'Id'] = res.keys[i].id;
						rExports.testVars['testKey'+i+'Value'] = res.keys[i].value;
						rExports.testVars['testKey'+i+'Str'] = res.id + '.' + res.keys[i].id + ':' + res.keys[i].value;
					}
					//console.log('After setup, testVars: '+JSON.stringify(rExports.testVars));
					callback(null);
				}
			}
		});
	};

	var _clearTestPubnub = function(callback) {
		rExports.pubnub.shutdown(function(state) {
			if (state == 'closed')
				callback(null);
			else
				callback('Error: Final pubnub state is not closed');
			rExports.pubnub = undefined;
		});
	};

	var _clearTestAccount = function(callback) {
		var authKey = rExports.testVars.testAppId + '.' + rExports.testVars.testKey0Id + ':' + rExports.testVars.testKey0Value;
		var authHeader = toBase64(authKey);
		var delOptions = {
			host: adminHost, port: adminPort, method: 'DELETE', path: '/apps/' + rExports.testVars.testAppId,
			scheme: adminScheme, headers: { 'Authorization': 'Basic ' + authHeader }
		};
		httpReq(delOptions, function(err, resp) { callback(err); });
	};

	var _setupTest = function(test, use_secure) {
		if (rExports.setupRefcount++ != 0) {
			test.done();
			return;
		}
		/* create a test account, application, and key */
		test.expect(1);
		_setupTestAccount(function(err) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			_setupTestPubnub(use_secure, function(err, pn) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				rExports.pubnub = pn;
				test.ok(true, 'Created test vars');
				test.done();
			});
		});
	};

	rExports.setupTest = function(test) { _setupTest(test, false); }
	rExports.setupTestSecure = function(test) { _setupTest(test, true); }

	rExports.clearTest = function(test) {
		if (--rExports.setupRefcount != 0) {
			test.done();
			return;
		}

		/* remove test account, application, and key */
		test.expect(1);
		_clearTestAccount(function(err) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			_clearTestPubnub(function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}

				test.ok(true, 'Cleared test vars');
				test.done();
			});
		});
	};

	rExports.addCommonModule = function(addToExports, mod) {
		var rExports = mod.setup(exports);
		for (var ex in rExports)
			addToExports[ex] = rExports[ex];
	};

	/* Debug: Avoid using JSON.stringify for debug, because it gets overridden */
	rExports.printObject = function printObject(o, objects) {
		if (typeof(o) === 'undefined') return '<undefined>';
		if (o === null) return "null";
		if (typeof(o) === 'string') return '"' + o + '"';
		if (typeof(o) === 'number') return o.toString();
		if (typeof(o) === 'function') return o.toString();
		if (o.toString().indexOf('[native code]') > -1) return o.toString();
		if (typeof(o) !== 'object') return '<unknown:'+typeof(o)+'>';

		try {
			// Check for circular references
			if (!objects) objects = [];
			for (var i=0; i<objects.length; i++) { if (objects[i] === o) { return '<circular>'; } }
			objects.push(o);

			var keys = Object.keys(o);
			var result = '{ ';
			if (keys.length > 100)  {
				result += ' ... '+keys.length+' items ...';
			} else {
				for (var i=0; i<keys.length; i++) {
					if (i>0)
						result += ', ';
					var p = o[keys[i]];
					result += keys[i]+':'+printObject(p, objects);
				}
			}
			result += '}';
		} catch (err) {
			console.log("Caught exception: "+err);
			console.log(err.stack);
		}
		return result;
	}

	return rExports;
};
