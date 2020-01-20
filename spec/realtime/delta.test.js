"use strict";

define(['shared_helper', 'vcdiff-decoder'], function(helper, vcdiffDecoder) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		testData = [
			{ foo: 'bar', count: 1, status: 'active' },
			{ foo: 'bar', count: 2, status: 'active' },
			{ foo: 'bar', count: 2, status: 'inactive' },
			{ foo: 'bar', count: 3, status: 'inactive' },
			{ foo: 'bar', count: 3, status: 'active' }
		];

	function equals(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	function getTestVcdiffDecoder() {
		return {
			numberOfCalls: 0,
			decodeSync: function(delta, base) {
				this.numberOfCalls++;
				return vcdiffDecoder.decodeSync(delta, base);
			}
		};
	}

	exports.setupMessage = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, displayError(err));
			} else {
				test.ok(true, 'setup app');
			}
			test.done();
		});
	};

	exports.deltaPlugin = function(test) {
		test.expect(testData.length + 1);
		var testName = 'deltaPlugin';
		try {
			var testVcdiffDecoder = getTestVcdiffDecoder();
			var realtime = helper.AblyRealtime({
				plugins: {
					'vcdiffDecoder': testVcdiffDecoder
				}
			});
			var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === testData.length - 1) {
					test.equal(testVcdiffDecoder.numberOfCalls, testData.length - 1, 'Check number of delta messages');
					closeAndFinish(test, realtime);
				}
			});

			realtime.connection.on('connected', function() {
				for (var i = 0; i < testData.length; i++) {
					channel.publish(i.toString(), testData[i]);
				}
			});

			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, testName + ' test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.unusedPlugin = function(test) {
		test.expect(testData.length + 1);
		var testName = 'unusedPlugin';
		try {
			var testVcdiffDecoder = getTestVcdiffDecoder();
			var realtime = helper.AblyRealtime({
				plugins: {
					'vcdiffDecoder': testVcdiffDecoder
				}
			});
			var channel = realtime.channels.get(testName);

			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === testData.length - 1) {
					test.equal(testVcdiffDecoder.numberOfCalls, 0, 'Check number of delta messages');
					closeAndFinish(test, realtime);
				}
			});

			realtime.connection.on('connected', function() {
				for (var i = 0; i < testData.length; i++) {
					channel.publish(i.toString(), testData[i]);
				}
			});

			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, testName + ' test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.lastMessageNotFoundRecovery = function(test) {
		test.expect(testData.length + 1);
		var testName = 'lastMessageNotFoundRecovery';
		try {
			var testVcdiffDecoder = getTestVcdiffDecoder();
			var realtime = helper.AblyRealtime({
				plugins: {
					'vcdiffDecoder': testVcdiffDecoder
				}
			});
			var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });
			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === 1) {
					/* Simulate issue */
					channel._lastPayload.messageId = null;
				} else if (index === testData.length - 1) {
					test.equal(testVcdiffDecoder.numberOfCalls, testData.length - 2, 'Check number of delta messages');
					closeAndFinish(test, realtime);
				}
			});

			realtime.connection.on('connected', function() {
				for (var i = 0; i < testData.length; i++) {
					channel.publish(i.toString(), testData[i]);
				}
			});

			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, testName + ' test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.deltaDecodeFailureRecovery = function(test) {
		test.expect(testData.length);
		var testName = 'deltaDecodeFailureRecovery';
		try {
			var failingTestVcdiffDecoder = {
				decodeSync: function(delta, base) {
					throw new Error('Failed to decode delta.');
				}
			};

			var realtime = helper.AblyRealtime({
				plugins: {
					'vcdiffDecoder': failingTestVcdiffDecoder
				}
			});
			var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });
			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === testData.length - 1) {
					closeAndFinish(test, realtime);
				}
			});

			realtime.connection.on('connected', function() {
				for (var i = 0; i < testData.length; i++) {
					channel.publish(i.toString(), testData[i]);
				}
			});

			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, testName + ' test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	return module.exports = helper.withTimeout(exports);
});
