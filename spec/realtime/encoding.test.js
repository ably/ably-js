"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		loadTestData = helper.loadTestData,
		BufferUtils = Ably.Realtime.BufferUtils,
		displayError = helper.displayError,
		encodingFixturesPath = helper.testResourcesPath + 'messages-encoding.json',
		utils = helper.Utils,
		closeAndFinish = helper.closeAndFinish;

	exports.setupEncoding = function(test) {
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

	/* Publish each fixture manually; subscribe with both a json and msgpack
	 * realtime, and check everything decodes correctly
	 */
	exports.message_decoding = function(test) {
		loadTestData(encodingFixturesPath, function(err, testData) {
			if(err) {
				test.ok(false, 'Unable to get test assets; err = ' + displayError(err));
				return;
			}
			test.expect(testData.messages.length * 2);
			var realtime = helper.AblyRealtime({useBinaryProtocol: false}),
				binaryrealtime = helper.AblyRealtime({useBinaryProtocol: true}),
				channelName = 'message_decoding',
				channelPath = '/channels/' + channelName + '/messages',
				channel = realtime.channels.get(channelName),
				binarychannel = binaryrealtime.channels.get(channelName);

				async.parallel([
					function(attachCb) { channel.attach(attachCb); },
					function(attachCb) { binarychannel.attach(attachCb); }
				], function(err) {
					if(err) {
						test.ok(false, 'Error attaching to channel: ' + displayError(err));
						closeAndFinish(test, [realtime, binaryrealtime]);
						return;
					}
					async.eachOf(testData.messages, function(encodingSpec, index, eachOfCb) {
						/* Restricting to event name allows us to run in parallel */
						var name = index.toString();
						async.parallel([
							function(parallelCb) {
								channel.subscribe(name, function(msg) {
									if(encodingSpec.expectedHexValue) {
										test.equal(BufferUtils.hexEncode(msg.data), encodingSpec.expectedHexValue, 'Check data matches');
									} else {
										test.deepEqual(msg.data, encodingSpec.expectedValue, 'Check data matches');
									}
									channel.unsubscribe(name);
									parallelCb();
								});
							},
							function(parallelCb) {
								binarychannel.subscribe(name, function(msg) {
									if(encodingSpec.expectedHexValue) {
										test.equal(BufferUtils.hexEncode(msg.data), encodingSpec.expectedHexValue, 'Check data matches');
									} else {
										test.deepEqual(msg.data, encodingSpec.expectedValue, 'Check data matches');
									}
									binarychannel.unsubscribe(name);
									parallelCb();
								});
							},
							function(parallelCb) {
								realtime.request('post', channelPath, null, {name: name, data: encodingSpec.data, encoding: encodingSpec.encoding}, null, function(err) {
									parallelCb(err);
								});
							}
						], eachOfCb);
					}, function(err) {
						if(err) test.ok(false, displayError(err));
						closeAndFinish(test, [realtime, binaryrealtime]);
					});
				});
		});
	};

	/* Publish each fixture with both a json and msgpack realtime, get history
	 * manually, and check everything was encoded correctly
	 */
	exports.message_encoding = function(test) {
		loadTestData(encodingFixturesPath, function(err, testData) {
			if(err) {
				test.ok(false, 'Unable to get test assets; err = ' + displayError(err));
				return;
			}
			test.expect(testData.messages.length * 5);
			var realtime = helper.AblyRealtime({useBinaryProtocol: false}),
				binaryrealtime = helper.AblyRealtime({useBinaryProtocol: true}),
				channelName = 'message_encoding',
				channelPath = '/channels/' + channelName + '/messages',
				channel = realtime.channels.get(channelName),
				binarychannel = binaryrealtime.channels.get(channelName);

				async.parallel([
					function(attachCb) { channel.attach(attachCb); },
					function(attachCb) { binarychannel.attach(attachCb); }
				], function(err) {
					if(err) {
						test.ok(false, 'Error attaching to channel: ' + displayError(err));
						closeAndFinish(test, [realtime, binaryrealtime]);
						return;
					}
					async.eachOf(testData.messages, function(encodingSpec, index, eachOfCb) {
						/* Restricting to event name allows us to run in parallel */
						var data, name = index.toString();
						if(encodingSpec.expectedHexValue) {
							data = BufferUtils.base64Decode(encodingSpec.data);
						} else {
							data = encodingSpec.expectedValue;
						}
						async.parallel([
							function(parallelCb) {
								channel.publish(name, data, parallelCb);
							},
							function(parallelCb) {
								binarychannel.publish(name, data, parallelCb);
							}
						], function(err) {
							if(err) {
								eachOfCb(err);
								return;
							}
							realtime.request('get', channelPath, null, null, null, function(err, resultPage) {
								if(err) {
									eachOfCb(err);
									return;
								}
								var msgs = helper.arrFilter(resultPage.items, function(m) {return m.name === name;});
								test.equal(msgs.length, 2, 'Check expected number of results (one from json rt, one from binary rt)');
								test.equal(msgs[0].encoding, encodingSpec.encoding, 'Check encodings match');
								test.equal(msgs[1].encoding, encodingSpec.encoding, 'Check encodings match');
								if(msgs[0].encoding === 'json') {
									test.deepEqual(JSON.parse(encodingSpec.data), JSON.parse(msgs[0].data), 'Check data matches');
									test.deepEqual(JSON.parse(encodingSpec.data), JSON.parse(msgs[1].data), 'Check data matches');
								} else {
									test.equal(encodingSpec.data, msgs[0].data, 'Check data matches');
									test.equal(encodingSpec.data, msgs[1].data, 'Check data matches');
								}
								eachOfCb();
							});
						});
					}, function(err) {
						if(err) test.ok(false, displayError(err));
						closeAndFinish(test, [realtime, binaryrealtime]);
					});
				});
		});
	};

	return module.exports = helper.withTimeout(exports);
});
