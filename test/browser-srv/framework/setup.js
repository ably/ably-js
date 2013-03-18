/* Admin */
var Admin = require('../../../../../admin/nodejs/admin').Admin;

var adminOpts = {};
var username = process.env.ADMIN_USERNAME || 'admin';
var password = process.env.ADMIN_PASSWORD || 'admin';
var hostname = process.env.GOSSIP_ADDRESS || 'localhost';
var uri = 'http://' + username + ':' + password + '@' + hostname + ':8090';
var admin = new Admin(uri, adminOpts);

var testAcct, testApp;

exports.createAccount = function(testVars, callback) {
	admin.accounts.create({}, function(err, acct) {
		if(err) {
			callback(err);
			return;
		}
		testAcct = acct;
		testVars.testAcctId = acct.id;
		callback();
	});
};

exports.createApp = function(testVars, callback) {
	testAcct.apps.create({}, function(err, app) {
		if(err) {
			callback(err);
			return;
		}
		testApp = app;
		testVars.testAppId = app.id;
		callback();
	});
};

exports.createKeys = function(testVars, callback) {
	require('async').parallel(
		[
		 	function(key0Cb) {
				/*
				 * key0 is blanket capability
				 */
		 		testApp.keys.create({}, function(err, key) {
					if(err) {
						key0Cb(err);
						return;
					}
					testVars.testKey0Id = key.id;
					testVars.testKey0Value = key.value;
					key0Cb(null, testVars);
				});
			},
			function(key1Cb){
				/*
				 * key1 is specific channel and ops
				 */
				testApp.keys.create({
					capability:{
						testchannel:['publish']
					}
				}, function(err, key) {
					if(err) {
						key1Cb(err);
						return;
					}
					testVars.testKey1Id = key.id;
					testVars.testKey1Value = key.value;
					key1Cb(null, testVars);
				});
			},
			function(key2Cb){
				/*
				 * key2 is wildcard channel spec
				 */
				testApp.keys.create({
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
					testVars.testKey2Id = key.id;
					testVars.testKey2Value = key.value;
					key2Cb(null, testVars);
				});
			},
			/*
			 * key3 is wildcard ops spec
			 */
			function(key3Cb){
				testApp.keys.create({
					capability: {
						'candoall':['*']
					}
				}, function(err, key) {
					if(err) {
						key3Cb(err);
						return;
					}
					testVars.testKey3Id = key.id;
					testVars.testKey3Value = key.value;
					key3Cb(null, testVars);
				});
			},
			/*
			 * key4 is multiple resources
			 */
			function(key4Cb){
				testApp.keys.create({
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
					testVars.testKey4Id = key.id;
					testVars.testKey4Value = key.value;
					key4Cb(null, testVars);
				});
			},
			/*
			 * key5 has wildcard clientId
			 */
			function(key5Cb){
				testApp.keys.create({
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
					testVars.testKey5Id = key.id;
					testVars.testKey5Value = key.value;
					key5Cb(null, testVars);
				});
			}
		], callback);
};
