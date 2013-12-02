"use strict";
var async = require('async');
var Pusher = require('../../../browser/compat/pusher.js');
var Ably = require('../../..');

function mixin(target, source) {
	source = source || {};
	Object.keys(source).forEach(function(key) {
		target[key] = source[key];
	});

	return target;
}

/* Admin */
var Admin = require('../../../../../admin/nodejs/admin').Admin;

var adminOpts = {};
var username = process.env.ADMIN_USERNAME || 'admin';
var password = process.env.ADMIN_PASSWORD || 'admin';
var hostname = process.env.ADMIN_ADDRESS || 'localhost';
var port = process.env.ADMIN_PORT || 8090;
var scheme = process.env.ADMIN_SCHEME || 'http';
var uri = scheme + '://' + username + ':' + password + '@' + hostname + ':' + port;
var pusherOpts = {
	origin       : process.env.PUSHER_ORIGIN || 'localhost:8080',
	tlsorigin       : process.env.PUSHER_ORIGIN || 'localhost:8081'
};
var setupRefcount = 0;
var testVars = exports.testVars = {};
var admin = null;
var pusher;

exports.cipherKey = "0000000000000000"
exports.getPusher = function() { return pusher; }
exports.admin = function(opts) {return new Admin(uri, mixin(adminOpts, opts));};

exports.getAblyRest = function() {
	var origin = pusherOpts.origin;
	var tlsorigin = pusherOpts.tlsorigin;
	var opts = {
		key: testVars.testAppId + '.' + testVars.testKey0Id + ':' + testVars.testKey0.value,
		encrypted: false
	};
	if (origin && (origin.length != 0)) {
		var p = origin.split(':');
		opts.host = opts.wsHost = p[0];
		if (p.length > 1)
			opts.port = p[1];
	}
	if (tlsorigin && (tlsorigin.length != 0)) {
		// Note: Only the port number is used here, the hostnames are the same as for non-TLS
		var p = tlsorigin.split(':');
		opts.tlsPort = (p.length > 1) ? p[1] : 8081;
	} else {
		opts.tlsPort = 8081;
	}
	return new Ably.Rest(opts);
};

exports.getAblyRealtime = function(clientId) {
	var origin = pusherOpts.origin;
	var tlsorigin = pusherOpts.tlsorigin;
	var opts = {
		key: testVars.testAppId + '.' + testVars.testKey0Id + ':' + testVars.testKey0.value,
		encrypted: false
		//,log:{level:4}
	};
	if (origin && (origin.length != 0)) {
		var p = origin.split(':');
		opts.host = opts.wsHost = p[0];
		if (p.length > 1)
			opts.port = p[1];
	}
	if (tlsorigin && (tlsorigin.length != 0)) {
		// Note: Only the port number is used here, the hostnames are the same as for non-TLS
		var p = tlsorigin.split(':');
		opts.tlsPort = (p.length > 1) ? p[1] : 8081;
	} else {
		opts.tlsPort = 8081;
	}
	if (clientId)
		opts.clientId = clientId;
	return new Ably.Realtime(opts);
};

exports.randomid = function randomid(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i=0; i<length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};

exports.containsValue = function(ob, value) {
	for(var key in ob) {
		if(ob[key] == value)
			return true;
	}
	return false;
};

exports.displayError = function(err) {
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

/*
 * Call _setupTest in context of a nodeunit test
 */
exports.setupTest = function(test) {
	test.expect(1);
	_setupTest(function(err, psh) {
		pusher = psh;
		if(err)
			test.ok(false, exports.displayError(err));
		else
			test.ok(true, 'Created test vars');
		test.done();
	});
};

/*
 * Set up test accounts, create Pusher instance
 */
function _setupTest(callback) {
	if (setupRefcount++ != 0) {
		callback(null, pusher);
		return;
	}
	admin = exports.admin();
	admin.accounts.create({}, function(err, acct) {
		if(err) {
			callback(err, null);
			return;
		}
		testVars.testAcct = acct;
		testVars.testAcctId = acct.id;
		acct.apps.create({}, function(err, app) {
			if(err) {
				callback(err, null);
				return;
			}
			testVars.testApp = app;
			testVars.testAppId = app.id;
			async.parallel([
				function(key0Cb){
					/*
					 * key0 is blanket capability
					 */
					app.keys.create({}, function(err, key) {
						if(err) {
							key0Cb(err);
							return;
						}
						testVars.testKey0 = key;
						testVars.testKey0Id = key.id;
						key0Cb(null, testVars);
					});
				},
				function(key1Cb){
					/*
					 * key1 is specific channel and ops
					 */
					app.keys.create({
						capability:{
							testchannel:['publish']
						}
					}, function(err, key) {
						if(err) {
							key1Cb(err);
							return;
						}
						testVars.testKey1 = key;
						testVars.testKey1Id = key.id;
						key1Cb(null, testVars);
					});
				},
				function(key2Cb){
					/*
					 * key2 is wildcard channel spec
					 */
					app.keys.create({
						capability: {
							'*':['subscribe'],
							'canpublish:*':['publish'],
							'canpublish:andpresence':['presence', 'publish']
						}
					}, function(err, key) {
						if(err) {
							key2Cb(err);
							return;
						}
						testVars.testKey2 = key;
						testVars.testKey2Id = key.id;
						key2Cb(null, testVars);
					});
				},
				/*
				 * key3 is wildcard ops spec
				 */
				function(key3Cb){
					app.keys.create({
						capability: {
							'candoall':['*']
						}
					}, function(err, key) {
						if(err) {
							key3Cb(err);
							return;
						}
						testVars.testKey3 = key;
						testVars.testKey3Id = key.id;
						key3Cb(null, testVars);
					});
				},
				/*
				 * key4 is multiple resources
				 */
				function(key4Cb){
					app.keys.create({
						capability: {
							channel0:['publish'],
							channel1:['publish'],
							channel2:['publish', 'subscribe'],
							channel3:['subscribe'],
							channel4:['presence', 'publish', 'subscribe'],
							channel5:['presence'],
							channel6:['*']
						}
					}, function(err, key) {
						if(err) {
							key4Cb(err);
							return;
						}
						testVars.testKey4 = key;
						testVars.testKey4Id = key.id;
						key4Cb(null, testVars);
					});
				},
				/*
				 * key5 has wildcard clientId
				 */
				function(key5Cb){
					app.keys.create({
						privileged: true,
						capability: {
							channel0:['publish'],
							channel1:['publish'],
							channel2:['publish', 'subscribe'],
							channel3:['subscribe'],
							channel4:['presence', 'publish', 'subscribe'],
							channel5:['presence'],
							channel6:['*']
						}
					}, function(err, key) {
						if(err) {
							key5Cb(err);
							return;
						}
						testVars.testKey5 = key;
						testVars.testKey5Id = key.id;
						key5Cb(null, testVars);
					});
				},
				/*
				 * set up persistent channel namespace
				 */
				function(pchanCb){
					app.namespaces.create({id:'persisted'}, function(err, ns) {
						if(err) {
							pchanCb(err);
							return;
						}
						ns.setPersisted(true, function(err, result) {
							if (err) {
								pchanCb(err);
							} else {
								pchanCb(null, testVars);
							}
						});
					});
				}
			], function(err, result) {
				if (err != null) {
					callback(err, null);
					return;
				}
				pusher = new Pusher(testVars.testAppId + '.' + testVars.testKey0Id + ':' + testVars.testKey0.value, {
					encrypted : false,
					//authEndpoint : 'http://angrybadger.net:7462/pusher/auth',
					authTransport : 'ajax',
					auth : {
						params : { CSRFToken: '1234567890' },
						headers : { 'X-CSRF-Token' : '' }
					},
					host : pusherOpts.origin,
					ablyClientId : 'test-user-'+exports.randomid(6)
				});

				if (pusher == null)
					callback('Failed to create pusher instance', null);
				else
					callback(null, pusher);
			});
		});
	});
};

/*
 * Call _clearTest in the context of a nodeunit test
 */
exports.clearTest = function(test) {
	test.expect(1);
	_clearTest(function(err) {
		if(err)
			test.ok(false, exports.displayError(err));
		else
			test.ok(true, 'Cleared test vars');
		test.done();
	});
};

/*
 * Clear down test accounts, shutdown Pusher instance
 */
function _clearTest(callback) {
	if (--setupRefcount != 0) {
		callback(null);
		return;
	}
	testVars.testApp.del(function(err) {
		if(err) {
			callback(err);
			return;
		}
		testVars.testAcct.del(function(err) {
			if(err) {
				callback(err);
				return;
			}
			pusher.disconnect();
			pusher = undefined;
			callback();
		});
	});
};

/* Debug: Avoid using JSON.stringify for debug, because it gets overridden */
exports.printObject = function printObject(o, objects) {
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
