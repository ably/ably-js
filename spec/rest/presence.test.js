"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var currentTime, rest, cipherConfig, exports = {},
		Crypto = Ably.Realtime.Crypto,
		BufferUtils = Ably.Realtime.BufferUtils,
		displayError = helper.displayError,
		arrFind = Array.prototype.find
			? function(arr, predicate) {
				return arr.find(predicate);
			} : function(arr, predicate) {
				var value;
				for (var i = 0; i < arr.length; i++) {
					value = arr[i];
					if (predicate(value)) {
						return value;
					}
				}
				return undefined;
			},
		cipherParamsFromConfig = function(cipherConfig) {
			var cipherParams = new Crypto.CipherParams;
			for(var prop in cipherConfig) {
				cipherParams[prop] = cipherConfig[prop];
			};
			cipherParams.keyLength = cipherConfig.keylength;
			delete cipherParams.keylength; // grr case differences
			cipherParams.key = BufferUtils.base64Decode(cipherParams.key);
			cipherParams.iv = BufferUtils.base64Decode(cipherParams.iv);
			return cipherParams;
		}

	exports.setup_presence = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			rest = helper.AblyRest();
			cipherConfig = helper.getTestApp().cipherConfig;
			test.ok(true, 'Setup REST library');
			test.done();
		});
	};

	exports.presence_get_simple = function(test) {
		test.expect(6);
		try {
			var cipherParams = cipherParamsFromConfig(cipherConfig);
			var channel = rest.channels.get('persisted:presence_fixtures',
																			{encrypted: true, cipherParams: cipherParams});
			channel.presence.get(function(err, resultPage) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				var presenceMessages = resultPage.items;
				test.equal(presenceMessages.length, 6, 'Verify correct number of messages found');
				var encodedMessage = arrFind(presenceMessages, function(msg) {return msg.clientId == 'client_encoded'});
				var decodedMessage = arrFind(presenceMessages, function(msg) {return msg.clientId == 'client_decoded'});
				var boolMessage = arrFind(presenceMessages, function(msg) {return msg.clientId == 'client_bool'});
				var intMessage = arrFind(presenceMessages, function(msg) {return msg.clientId == 'client_int'});
				test.deepEqual(encodedMessage.data, decodedMessage.data, 'Verify message decoding works correctly')
				test.equal(encodedMessage.encoding, null, 'Decoding should remove encoding field')
				test.equal(decodedMessage.encoding, null, 'Decoding should remove encoding field')
				test.equal(boolMessage.data, 'true', 'should not attempt to parse string data when no encoding field')
				test.equal(intMessage.data, '24', 'should not attempt to parse string data when no encoding field')
				test.done();
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	exports.presence_get_limits_and_filtering = function(test) {
		try {
			var channel = rest.channels.get('persisted:presence_fixtures');

			var tests = [
				// Result limit
				function(cb) {
					channel.presence.get({limit: 3}, function(err, resultPage) {
						if(err) cb(err);
						var presenceMessages = resultPage.items;
						test.equal(presenceMessages.length, 3, 'Verify correct number of messages found');
						cb();
					});
				},
				// Filter by clientId
				function(cb) {
					channel.presence.get({clientId: 'client_json'}, function(err, resultPage) {
						if(err) cb(err);
						var presenceMessages = resultPage.items;
						test.equal(presenceMessages.length, 1, 'Verify correct number of messages found');
						cb();
					});
				},
				// Filter by connectionId
				function(cb) {
					channel.presence.get(function(err, resultPage) {
						if(err) cb(err);
						channel.presence.get({connectionId: resultPage.items[0].connectionId}, function(err, resultPage) {
							if(err) cb(err);
							var presenceMessages = resultPage.items;
							test.equal(presenceMessages.length, 6, 'Verify correct number of messages found');
							cb();
						});
					});
				},
			]

			test.expect(tests.length);

			async.parallel(tests, function(err){
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.done();
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	return module.exports = helper.withTimeout(exports);
});
