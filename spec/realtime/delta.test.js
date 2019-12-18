"use strict";

define(['shared_helper', 'vcdiff-decoder'], function(helper, vcdiffDecoder) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	var equals = function(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	};

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
		test.expect(3);
		var testName = 'delta-codec';
		try {
			var testData = [
				{ foo: 'bar', count: 1, status: 'active' },
				{ foo: 'bar', count: 2, status: 'active' },
				{ foo: 'bar', count: 2, status: 'inactive' }
			];

			var realtime = helper.AblyRealtime({
				plugins: {
					'vcdiffDecoder': vcdiffDecoder
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