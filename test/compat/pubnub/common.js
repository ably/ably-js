"use strict";
var async = require('async');

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

exports.admin = function(opts) {return new Admin(uri, mixin(adminOpts, opts));};

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

var testVars = exports.testVars = {};
var admin;

exports.setupTest = function(callback) {
	admin = exports.admin();
	admin.accounts.create({}, function(err, acct) {
		if(err) {
			callback(err);
			return;
		}
		testVars.testAcct = acct;
		testVars.testAcctId = acct.id;
		acct.apps.create({}, function(err, app) {
			if(err) {
				callback(err);
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
				}
			], callback);
		});
	});
};

exports.clearTest = function(callback) {
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
			callback(null);
		});
	});
};
