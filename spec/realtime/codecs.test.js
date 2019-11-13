"use strict";

define(['shared_helper', 'ably-delta-codec', 'ably'], function(helper, AblyDeltaCodec, Ably) {
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

	function getTestDeltaCodec() {
		return {
			deltaCodec: new AblyDeltaCodec.AblyVcdiffCodec(),
			numberOfCalls: 0,
			decode: function(payload, decodingContext) {
				this.numberOfCalls++;
				return this.deltaCodec.decode(payload, decodingContext);
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

	exports.deltaCodec = function(test) {
		test.expect(testData.length + 1);
		var testName = 'deltaCodec';
		try {
			var testDeltaCodec = getTestDeltaCodec();
			var realtime = helper.AblyRealtime({
				codecs: {
					'vcdiff': testDeltaCodec
				}
			});
			var channel = realtime.channels.get('[?delta=vcdiff]' + testName);

			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === testData.length - 1) {
					test.equal(testDeltaCodec.numberOfCalls, testData.length - 1, 'Check number of delta messages');
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

	exports.unusedCodec = function(test) {
		test.expect(testData.length + 1);
		var testName = 'unusedCodec';
		try {
			var testDeltaCodec = getTestDeltaCodec();
			var realtime = helper.AblyRealtime({
				codecs: {
					'vcdiff': testDeltaCodec
				}
			});
			var channel = realtime.channels.get(testName);

			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === testData.length - 1) {
					test.equal(testDeltaCodec.numberOfCalls, 0, 'Check number of delta messages');
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
			var testDeltaCodec = getTestDeltaCodec();
			var realtime = helper.AblyRealtime({
				codecs: {
					'vcdiff': testDeltaCodec
				}
			});
			var channel = realtime.channels.get('[?delta=vcdiff]' + testName);
			channel.subscribe(function(message) {
				var index = Number(message.name);
				test.ok(equals(testData[index], message.data), 'Check message.data');

				if (index === 1) {
					/* Simulate issue */
					channel._lastPayload.messageId = null;
				} else if (index === testData.length - 1) {
					test.equal(testDeltaCodec.numberOfCalls, testData.length - 2, 'Check number of delta messages');
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
			var failingTestDeltaCodec = {
				decode: function(payload, decodingContext) {
					throw new Ably.Realtime.ErrorInfo('Delta decode failed.', 40018, 400);
				}
			};

			var realtime = helper.AblyRealtime({
				codecs: {
					'vcdiff': failingTestDeltaCodec
				}
			});
			var channel = realtime.channels.get('[?delta=vcdiff]' + testName);
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
