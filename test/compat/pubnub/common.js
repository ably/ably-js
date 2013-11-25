"use strict";
var async = require('async');
var PUBNUB = require('../../../browser/compat/pubnub.js');

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
var pubnubOpts = {
	origin       : process.env.PUBNUB_ORIGIN || 'localhost:8080',
	tlsorigin       : process.env.PUBNUB_ORIGIN || 'localhost:8081'
};
var setupRefcount = 0;
var testVars = exports.testVars = {};
var admin = null;
var pubnub;

exports.cipherKey = "0000000000000000"
exports.getPubnub = function() { return pubnub; }
exports.admin = function(opts) {return new Admin(uri, mixin(adminOpts, opts));};

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
	_setupTest(false, function(err, pn) {
		pubnub = pn;
		if(err)
			test.ok(false, displayError(err));
		else
			test.ok(true, 'Created test vars');
		test.done();
	});
};

/*
 * Call _setupTest in context of a nodeunit test (use secure init for pubnub)
 */
exports.setupTestSecure = function(test) {
	test.expect(1);
	_setupTest(true, function(err, pn) {
		pubnub = pn;
		if(err)
			test.ok(false, displayError(err));
		else
			test.ok(true, 'Created test vars');
		test.done();
	});
};

/*
 * Set up test accounts, create PUBNUB instance
 */
function _setupTest(use_secure, callback) {
	if (setupRefcount++ != 0) {
		callback(null, pubnub);
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
				if (use_secure) {
					pubnub = PUBNUB.secure({
						ably_key      : testVars.testAppId + '.' + testVars.testKey0Id + ':' + testVars.testKey0.value,
						origin        : pubnubOpts.origin,
						tlsorigin     : pubnubOpts.tlsorigin,
						uuid          : 'client-'+exports.randomid(6),
						cipher_key    : exports.cipherKey
					});
				} else {
					pubnub = PUBNUB.init({
						ably_key      : testVars.testAppId + '.' + testVars.testKey0Id + ':' + testVars.testKey0.value,
						origin        : pubnubOpts.origin,
						tlsorigin     : pubnubOpts.tlsorigin,
						uuid          : 'client-'+exports.randomid(6)
					});
				}
				if (pubnub == null)
					callback('Failed to create pubnub instance', null);
				else if (pubnub !== PUBNUB)
					callback('Pubnub instance error', null);
				else
					callback(null, pubnub);
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
			test.ok(false, displayError(err));
		else
			test.ok(true, 'Cleared test vars');
		test.done();
	});
};

/*
 * Clear down test accounts, shutdown PUBNUB instance
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
			pubnub.shutdown(function(state) {
				if (state == 'closed')
					callback(null);
				else
					callback('Error: Final pubnub state is not closed');
				pubnub = undefined;
			});
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
		for (var i=0; i<keys.length; i++) {
			if (i>0)
				result += ', ';
			var p = o[keys[i]];
			result += keys[i]+':'+printObject(p, objects);
		}
		result += '}';
	} catch (err) {
		console.log("Caught exception: "+err);
		console.log(err.stack);
	}
	return result;
}
