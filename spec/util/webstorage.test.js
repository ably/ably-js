"use strict";

function randomString() { return String(Math.random()).slice(2); }

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var rest, exports = {},
		utils = helper.Utils;

	exports.setup_storage = function(test) {
		helper.setupApp(function() {
			rest = helper.AblyRest();
			test.done();
		});
	};

	/*
	 * Session storage
	 */
	exports.session_storage = function(test) {
		var webStorage = rest.storage,
			testKey = randomString(),
			testValue = {a: randomString()};

		test.equal(webStorage.getSession(testKey), null, 'Verify value initially not present');
		webStorage.setSession(testKey, testValue);
		test.deepEqual(webStorage.getSession(testKey), testValue, 'Verify value present');
		webStorage.removeSession(testKey);
		test.equal(webStorage.getSession(testKey), null, 'Verify value removed');
		test.done();
	};

	/*
	 * Local storage
	 */
	exports.local_storage = function(test) {
		var webStorage = rest.storage,
			testKey = randomString(),
			testValue = {a: randomString()};

		test.equal(webStorage.get(testKey), null, 'Verify value initially not present');
		webStorage.set(testKey, testValue);
		console.log('*** testValue: ' + require('util').inspect(testValue));
		console.log('*** got: ' + require('util').inspect(webStorage.get(testKey)));
		test.deepEqual(webStorage.get(testKey), testValue, 'Verify value present');
		webStorage.remove(testKey);
		test.equal(webStorage.get(testKey), null, 'Verify value removed');
		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});
