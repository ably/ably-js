"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var Crypto = base.Ably.Realtime.Crypto;

	if (base.isBrowser)
		var async = window.async;
	else
		var async = require('async');

	function attachChannels(channels, callback) {
		async.map(channels, function(channel, cb) { channel.attach(cb); }, callback);
	}

	/**
	 * Publish and subscribe, binary transport
	 */
	rExports.single_send_binary = function(test) {
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(2);
		var channel = realtime.channels.get('single_send_binary'),
			messageText = 'Test message (single_send_binary)';

		Crypto.getDefaultParams(function(err, params) {
			if(err) {
				test.fail('Unable to get cipher params; err = ' + e);
				return;
			}

			test.equal(params.algorithm, 'AES');
			channel.setOptions({encrypted:true, cipherParams: params});
			channel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				test.done();
				realtime.close();
			});
			channel.publish('event0', messageText);
		});
	};

	/**
	 * Publish and subscribe, text transport
	 */
	rExports.single_send_text = function(test) {
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(2);
		var channel = realtime.channels.get('single_send_text'),
			messageText = 'Test message (single_send_text)';

		Crypto.getDefaultParams(function(err, params) {
			test.equal(params.algorithm, 'AES');
			if(err) {
				test.fail('Unable to get cipher params; err = ' + e);
				return;
			}
			channel.setOptions({encrypted:true, cipherParams: params});
			channel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				test.done();
				realtime.close();
			});
			channel.publish('event0', messageText);
		});
	};

	/**
	 * Publish and subscribe, binary transport, 256-bit key
	 */
	rExports.single_send_binary_256 = function(test) {
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(2);
		var channel = realtime.channels.get('single_send_binary_256'),
			messageText = 'Test message (single_send_binary_256)';

		Crypto.generateRandom(256 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'AES');
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				channel.setOptions({encrypted:true, cipherParams: params});
				channel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					test.done();
					realtime.close();
				});
				channel.publish('event0', messageText);
			});
		});
	};

	/**
	 * Publish and subscribe, text transport, 256-bit key
	 */
	rExports.single_send_text_256 = function(test) {
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(2);
		var channel = realtime.channels.get('single_send_text_256'),
			messageText = 'Test message (single_send_text_256)';

		Crypto.generateRandom(256 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'AES');
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				channel.setOptions({encrypted:true, cipherParams: params});
				channel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					test.done();
					realtime.close();
				});
				channel.publish('event0', messageText);
			});
		});
	};

	function _multiple_send(test, text, iterations, delay) {
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: text
		});
		test.expect(iterations + 2);
		var channelName = 'multiple_send_' + iterations + '_' + delay,
			channel = realtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')';

		Crypto.generateRandom(128 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'AES');
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				channel.setOptions({encrypted:true, cipherParams: params});
				function sendAll(sendCb) {
					var sent = 0;
					var sendOnce = function() {
						channel.publish('event0', messageText);
						if(++sent == iterations) {
							sendCb(null);
							return;
						}
						setTimeout(sendOnce, delay);
					};
					sendOnce();
				}
				function recvAll(recvCb) {
					var received = 0;
					channel.subscribe('event0', function(msg) {
						test.ok(msg.data == messageText);
						if(++received == iterations)
							recvCb(null);
					});
				}
				async.parallel([sendAll, recvAll], function(err) {
					if(err) {
						test.fail('Error sending messages; err = ' + e);
						return;
					}
					test.ok('Verify all messages received');
					test.done();
					realtime.close();
				});
			});
		});
	};

	rExports.multiple_send_binary_2_200 = function(test) { _multiple_send(test, false, 2, 200); };
	rExports.multiple_send_text_2_200 = function(test) { _multiple_send(test, true, 2, 200); };
	rExports.multiple_send_binary_20_100 = function(test) { _multiple_send(test, false, 20, 100); };
	rExports.multiple_send_text_20_100 = function(test) { _multiple_send(test, true, 20, 100); };

	/**
	 * Connect twice to the service, using the default (binary) protocol
	 * and the text protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	rExports.single_send_binary_text = function(test) {
		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(2);
		var channelName = 'single_send_binary_text',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		Crypto.getDefaultParams(function(err, params) {
			if(err) {
				test.fail('Unable to get cipher params; err = ' + e);
				return;
			}
			test.equal(params.algorithm, 'AES');
			txChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				test.done();
				rxRealtime.close();
				txRealtime.close();
			});
			txChannel.publish('event0', messageText);
		});
	};

	/**
	 * Connect twice to the service, using the text protocol and the
	 * default (binary) protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	rExports.single_send_text_binary = function(test) {
		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(2);
		var channelName = 'single_send_text_binary',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		Crypto.getDefaultParams(function(err, params) {
			if(err) {
				test.fail('Unable to get cipher params; err = ' + e);
				return;
			}
			test.equal(params.algorithm, 'AES');
			txChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				test.done();
				rxRealtime.close();
				txRealtime.close();
			});
			txChannel.publish('event0', messageText);
		});
	};

	/**
	 * Connect twice to the service, using different cipher keys.
	 * Publish an encrypted message on that channel using
	 * the default cipher params and verify that the decrypt failure
	 * is noticed as bad recovered plaintext.
	 */
	rExports.single_send_key_mismatch = function(test) {
		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(1);
		var channelName = 'single_send_key_mismatch',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		async.parallel([
			Crypto.getDefaultParams,
			Crypto.getDefaultParams,
			function(cb) { attachChannels([txChannel, rxChannel], cb); }
		], function(err, res) {
			if(err) {
				test.fail('Unable to get cipher params; err = ' + e);
				return;
			}
			var txParams = res[0],
				rxParams = res[1];

			txChannel.setOptions({encrypted:true, cipherParams: txParams});
			rxChannel.setOptions({encrypted:true, cipherParams: rxParams});
			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data != messageText);
				test.done();
				rxRealtime.close();
				txRealtime.close();
			});
			txChannel.publish('event0', messageText);
		});
	};

	/**
	 * Connect twice to the service, one with and one without encryption.
	 * Publish an unencrypted message and verify that the receiving connection
	 * does not attempt to decrypt it.
	 */
	rExports.single_send_unencrypted = function(test) {
		var txRealtime = base.realtime({
			log: {level: 1},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(1);
		var channelName = 'single_send_unencrypted',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		attachChannels([txChannel, rxChannel], function(err) {
			if(err) {
				test.fail('Unable to get attach channels; err = ' + err);
				return;
			}
			Crypto.getDefaultParams(function(err, rxParams) {
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				rxChannel.setOptions({encrypted:true, cipherParams: rxParams});
				rxChannel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					test.done();
					rxRealtime.close();
					txRealtime.close();
				});
				txChannel.publish('event0', messageText);
			});
		});
	};

	/**
	 * Connect twice to the service, one with and one without encryption.
	 * Publish an unencrypted message and verify that the receiving connection
	 * does not attempt to decrypt it.
	 */
	rExports.single_send_encrypted_unhandled = function(test) {
		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(1);
		var channelName = 'single_send_encrypted_unhandled',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		attachChannels([txChannel, rxChannel], function(err) {
			if(err) {
				test.fail('Unable to get attach channels; err = ' + err);
				return;
			}
			Crypto.getDefaultParams(function(err, txParams) {
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				txChannel.setOptions({encrypted:true, cipherParams: txParams});
				rxChannel.subscribe('event0', function(msg) {
					test.ok(msg.data.cipherData);
					test.done();
					rxRealtime.close();
					txRealtime.close();
				});
				txChannel.publish('event0', messageText);
			});
		});
	};

	/**
	 * Check Channel.setOptions updates CipherParams correctly:
	 * - publish a message using a key, verifying correct receipt;
	 * - publish with an updated key on the tx connection and verify that it is not decrypted by the rx connection;
	 * - publish with an updated key on the rx connection and verify connect receipt
	 */
	rExports.set_cipher_params = function(test) {
		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(3);
		var channelName = 'set_cipher_params',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName),
			firstParams, secondParams;

		var waitAttach = function(cb) { attachChannels([txChannel, rxChannel], cb); };
		var setInitialOptions = function(cb) {
			Crypto.getDefaultParams(function(err, params) {
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				firstParams = params;
				txChannel.setOptions({encrypted:true, cipherParams: firstParams});
				rxChannel.setOptions({encrypted:true, cipherParams: firstParams});
				cb(null);
			});
		};

		var sendFirstMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data == messageText, 'Message data not expected value');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			}
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		var createSecondKey = function(cb) {
			Crypto.getDefaultParams(function(err, params) {
				if(err) {
					test.fail('Unable to get cipher params; err = ' + e);
					return;
				}
				secondParams = params;
				txChannel.setOptions({encrypted:true, cipherParams: secondParams});
				cb(null);
			});
		};

		var sendSecondMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data.cipherData, 'Message does not have cipherData property');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			}
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		var setSecondKey = function(cb) {
			rxChannel.setOptions({encrypted:true, cipherParams: secondParams});
			cb(null);
		};

		var sendThirdMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data == messageText, 'Message data not expected (third message)');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			}
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		async.series([
			waitAttach,
			setInitialOptions,
			sendFirstMessage,
			createSecondKey,
			sendSecondMessage,
			setSecondKey,
			sendThirdMessage
		], function(err) {
			if(err) {
				test.fail('Unexpected error running test; err = ' + e);
				test.done();
				txRealtime.close();
				rxRealtime.close();
				return;
			}
			test.done();
			txRealtime.close();
			rxRealtime.close();
		});
	};

	return rExports;
};
