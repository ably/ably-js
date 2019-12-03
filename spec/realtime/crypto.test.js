"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		loadTestData = helper.loadTestData,
		BufferUtils = Ably.Realtime.BufferUtils,
		Crypto = Ably.Realtime.Crypto,
		Message = Ably.Realtime.Message,
		displayError = helper.displayError,
		testResourcesPath = helper.testResourcesPath,
		msgpack = (typeof(window) == 'object') ? Ably.msgpack : require('@ably/msgpack-js'),
		testOnAllTransports = helper.testOnAllTransports,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	function attachChannels(channels, callback) {
		async.map(channels, function(channel, cb) { channel.attach(cb); }, callback);
	}

	function testMessageEquality(test, one, two) {
		// treat `null` same as `undefined` (using ==, rather than ===)
		test.ok(one.encoding == two.encoding, "Encoding mismatch ('" + one.encoding + "' != '" + two.encoding + "').");

		if(typeof(one.data) === 'string' && typeof(two.data) === 'string') {
			test.ok(one.data === two.data, "String data contents mismatch.");
			return;
		}

		if(BufferUtils.isBuffer(one.data) && BufferUtils.isBuffer(two.data)) {
			test.ok(BufferUtils.bufferCompare(one.data, two.data) === 0, "Buffer data contents mismatch.");
			return;
		}

		var json1 = JSON.stringify(one.data);
		var json2 = JSON.stringify(two.data);
		if (null === json1 || undefined === json1 || null === json2 || undefined === json2) {
			test.ok(false, "JSON stringify failed.");
			return;
		}
		test.ok(json1 === json2, "JSON data contents mismatch.");
	}

	function testEachFixture(test, filename, channelName, testsPerFixture, fixtureTest) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		loadTestData(testResourcesPath + filename, function(err, testData) {
			if(err) {
				test.ok(false, 'Unable to get test assets; err = ' + displayError(err));
				return;
			}
			var realtime = helper.AblyRealtime();
			var key = BufferUtils.base64Decode(testData.key);
			var iv = BufferUtils.base64Decode(testData.iv);
			var channel = realtime.channels.get(channelName, {cipher: {key: key, iv: iv}});

			test.expect(testData.items.length * testsPerFixture);
			for(var i = 0; i < testData.items.length; i++) {
				var item = testData.items[i];

				/* read messages from test data and decode (ie remove any base64 encoding). */
				var testMessage = Message.fromEncoded(item.encoded);
				var encryptedMessage = Message.fromEncoded(item.encrypted);
				/* reset channel cipher, to ensure it uses the given iv */
				channel.setOptions({cipher: {key: key, iv: iv}});
				fixtureTest(channel.channelOptions, testMessage, encryptedMessage, item.msgpack);
			}
			closeAndFinish(test, realtime);
		});
	}

	exports.setupCrypto = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			test.ok(true, 'app set up');
			test.done();
		});
	};

	/* generateRandomKey with an explicit keyLength */
	exports.generateRandomKey0 = function(test) {
		test.expect(1);
		Crypto.generateRandomKey(64, function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			/* .length for a nodejs buffer, .sigbytes for a browser CryptoJS WordArray */
			test.equal(key.length || key.sigBytes, 8, "generated key is the correct length");
			test.done();
		})
	}

	/* generateRandomKey with no keyLength should generate 256-bit keys */
	exports.generateRandomKey1 = function(test) {
		test.expect(1);
		Crypto.generateRandomKey(function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			test.equal(key.length || key.sigBytes, 32, "generated key is the default length");
			test.done();
		})
	}

	exports.getDefaultParams_wordArray_key = function(test) {
		test.expect(3);
		Crypto.generateRandomKey(function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			var params = Crypto.getDefaultParams({key: key});
			test.equal(params.key, key);
			test.equal(params.algorithm, 'aes', 'check default algorithm');
			test.equal(params.mode, 'cbc', 'check default mode');
			test.done();
		});
	}

	exports.getDefaultParams_base64_key = function(test) {
		test.expect(1);
		Crypto.generateRandomKey(function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			var b64key = Ably.Realtime.BufferUtils.base64Encode(key);
			var params = Crypto.getDefaultParams({key: b64key});
			test.equal(BufferUtils.bufferCompare(params.key, key), 0);
			test.done();
		});
	}

	exports.getDefaultParams_check_keylength = function(test) {
		test.expect(1);
		Crypto.generateRandomKey(64, function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			try {
				Crypto.getDefaultParams({key: key});
			} catch(e) {
				test.ok(true, 'getDefaultParams with a 64-bit key threw an exception');
				test.done();
			}
		});
	}

	exports.getDefaultParams_preserves_custom_algorithms = function(test) {
		test.expect(4);
		Crypto.generateRandomKey(64, function(err, key) {
			if(err) test.ok(false, helper.displayError(err));
			try {
				var params = Crypto.getDefaultParams({key: key, algorithm: 'foo', mode: 'bar'});
				test.equal(params.key, key);
				test.equal(params.algorithm, 'foo');
				test.equal(params.mode, 'bar');
				test.equal(params.keyLength, 64);
				test.done();
			} catch(e) {
				test.ok(false, 'getDefaultParams should not have thrown exception ' + e +' as it doesn’t recognise the algorithm');
			}
		});
	}

	exports.encrypt_message_128 = function(test) {
		testEachFixture(test, 'crypto-data-128.json', 'encrypt_message_128', 2, function(channelOpts, testMessage, encryptedMessage) {
			/* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
			Message.encode(testMessage, channelOpts, function() {
				/* compare */
				testMessageEquality(test, testMessage, encryptedMessage);
			});
		});
	};

	exports.encrypt_message_256 = function(test) {
		testEachFixture(test, 'crypto-data-256.json', 'encrypt_message_256', 2, function(channelOpts, testMessage, encryptedMessage) {
			/* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
			Message.encode(testMessage, channelOpts, function() {
				/* compare */
				testMessageEquality(test, testMessage, encryptedMessage);
			});
		});
	};

	exports.decrypt_message_128 = function(test) {
		testEachFixture(test, 'crypto-data-128.json', 'decrypt_message_128', 2, function(channelOpts, testMessage, encryptedMessage) {
			/* decrypt encrypted message; decode() also to handle data that is not string or buffer */
			Message.decode(encryptedMessage, channelOpts);
			/* compare */
			testMessageEquality(test, testMessage, encryptedMessage);
		});
	};

	exports.decrypt_message_256 = function(test) {
		testEachFixture(test, 'crypto-data-256.json', 'decrypt_message_256', 2, function(channelOpts, testMessage, encryptedMessage) {
			/* decrypt encrypted message; decode() also to handle data that is not string or buffer */
			Message.decode(encryptedMessage, channelOpts);
			/* compare */
			testMessageEquality(test, testMessage, encryptedMessage);
		});
	};

	exports.fromEncoded_cipher_options = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		loadTestData(testResourcesPath + 'crypto-data-256.json', function(err, testData) {
			if(err) {
				test.ok(false, 'Unable to get test assets; err = ' + displayError(err));
				return;
			}
			var key = BufferUtils.base64Decode(testData.key);
			var iv = BufferUtils.base64Decode(testData.iv);

			test.expect(testData.items.length * 2);
			for(var i = 0; i < testData.items.length; i++) {
				var item = testData.items[i];
				var testMessage = Message.fromEncoded(item.encoded);
				var decryptedMessage = Message.fromEncoded(item.encrypted, {cipher: {key: key, iv: iv}});
				testMessageEquality(test, testMessage, decryptedMessage);
			}
			test.done();
		});
	};

	exports.msgpack_128 = function(test) {
		if(typeof ArrayBuffer === 'undefined') {
			/* Encryption or binary transport not supported */
			test.done();
			return;
		}

		testEachFixture(test, 'crypto-data-128.json', 'msgpack_128', 2, function(channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
			Message.encode(testMessage, channelOpts, function() {
				var msgpackFromEncoded = msgpack.encode(testMessage);
				var msgpackFromEncrypted = msgpack.encode(encryptedMessage);
				var messageFromMsgpack = Message.fromValues(msgpack.decode(BufferUtils.base64Decode(msgpackEncodedMessage)));

				/* Mainly testing that we're correctly encoding the direct output from
				* CryptoJS (a wordArray) into the msgpack binary type */
				test.equal(BufferUtils.bufferCompare(msgpackFromEncoded, msgpackFromEncrypted), 0, 'verify msgpack encodings of newly-encrypted and preencrypted messages identical using bufferCompare');

				/* Can't compare msgpackFromEncoded with fixture data because can't
				* assume key order in the msgpack serialisation. So test decoded instead */
				test.deepEqual(messageFromMsgpack, encryptedMessage, 'verify msgpack fixture decodes correctly');
			});
		});
	};

	exports.msgpack_256 = function(test) {
		if(typeof ArrayBuffer === 'undefined') {
			/* Encryption or binary transport not supported */
			test.done();
			return;
		}

		testEachFixture(test, 'crypto-data-256.json', 'msgpack_256', 2, function(channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
			Message.encode(testMessage, channelOpts, function() {
				var msgpackFromEncoded = msgpack.encode(testMessage);
				var msgpackFromEncrypted = msgpack.encode(encryptedMessage);
				var messageFromMsgpack = Message.fromValues(msgpack.decode(BufferUtils.base64Decode(msgpackEncodedMessage)));

				/* Mainly testing that we're correctly encoding the direct output from
				* CryptoJS (a wordArray) into the msgpack binary type */
				test.equal(BufferUtils.bufferCompare(msgpackFromEncoded, msgpackFromEncrypted), 0, 'verify msgpack encodings of newly-encrypted and preencrypted messages identical using bufferCompare');

				/* Can't compare msgpackFromEncoded with fixture data because can't
				* assume key order in the msgpack serialisation. So test decoded instead */
				test.deepEqual(messageFromMsgpack, encryptedMessage, 'verify msgpack fixture decodes correctly');
			});
		});
	};

	function single_send(test, realtimeOpts, keyLength) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		test.expect(3);
		Crypto.generateRandomKey(keyLength, function(err, key) {
			if(err) {
				test.ok(false, 'Unable to generate key; err = ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			/* For single_send tests we test the 'shortcut' way of setting the cipher
			* in channels.get. No callback, but that's ok even for node which has
			* async iv generation since the publish is on an attach cb */
			var realtime = helper.AblyRealtime(realtimeOpts),
				channel = realtime.channels.get('single_send', {cipher: {key: key}}),
				messageText = 'Test message for single_send -	' + JSON.stringify(realtimeOpts);

			channel.attach(function(err) {
				if(err) {
					test.ok(false, 'Unable to attach; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.equal(channel.channelOptions.cipher.algorithm, 'aes');
				test.equal(channel.channelOptions.cipher.keyLength, keyLength);
				channel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					closeAndFinish(test, realtime);
				});
				channel.publish('event0', messageText);
			})
		});
	}

	/**
	 * Publish and subscribe, various transport, 128 and 256-bit
	 */
	testOnAllTransports(exports, 'single_send_128', function(realtimeOpts) { return function(test) {
		single_send(test, realtimeOpts, 128);
	}})

	testOnAllTransports(exports, 'single_send_256', function(realtimeOpts) { return function(test) {
		single_send(test, realtimeOpts, 256);
	}})

	function _multiple_send(test, text, iterations, delay) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var realtime = helper.AblyRealtime({ useBinaryProtocol: !text});
		test.expect(iterations + 3);
		var channelName = 'multiple_send_' + (text ? 'text_' : 'binary_') + iterations + '_' + delay,
			channel = realtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')';

		Crypto.generateRandomKey(128, function(err, key) {
			channel.setOptions({cipher: {key: key}});
			test.equal(channel.channelOptions.cipher.algorithm, 'aes');
			test.equal(channel.channelOptions.cipher.keyLength, 128);
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

			channel.attach(function(err) {
				if(err) {
					test.ok(false, 'Unable to attach; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				async.parallel([sendAll, recvAll], function(err) {
					if(err) {
						test.ok(false, 'Error sending messages; err = ' + displayError(err));
					}
					test.ok('Verify all messages received');
					closeAndFinish(test, realtime);
				});
			});
		});
	}

	exports.multiple_send_binary_2_200 = function(test) { _multiple_send(test, false, 2, 200); };
	exports.multiple_send_text_2_200 = function(test) { _multiple_send(test, true, 2, 200); };
	exports.multiple_send_binary_20_100 = function(test) { _multiple_send(test, false, 20, 100); };
	exports.multiple_send_text_20_100 = function(test) { _multiple_send(test, true, 20, 100); };

	function _single_send_separate_realtimes(test, txOpts, rxOpts) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime(txOpts),
			rxRealtime = helper.AblyRealtime(rxOpts),
			channelName = 'single_send_separate_realtimes';
		test.expect(3);
		var messageText = 'Test message for single_send_separate_realtimes',
			txChannel = txRealtime.channels.get(channelName),
			rxChannel = rxRealtime.channels.get(channelName);

		Crypto.generateRandomKey(function(err, key) {
			if(err) {
				test.ok(false, 'Unable to generate key; err = ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			async.parallel([
				function(cb) { txChannel.setOptions({cipher: {key: key}}); cb(); },
				function(cb) { rxChannel.setOptions({cipher: {key: key}}); cb(); }
			], function(err) {
				if(err) {
					test.ok(false, 'Unable to set cipher; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				test.equal(txChannel.channelOptions.cipher.algorithm, 'aes');
				test.equal(rxChannel.channelOptions.cipher.algorithm, 'aes');

				attachChannels([txChannel, rxChannel], function() {
					rxChannel.subscribe('event0', function(msg) {
						test.ok(msg.data == messageText);
						closeAndFinish(test, [txRealtime, rxRealtime]);
					});
					txChannel.publish('event0', messageText);
				});
			});
		});
	}

	/**
	 * Connect twice to the service, using the binary protocol
	 * and the text protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	exports.single_send_binary_text = function(test) {
		_single_send_separate_realtimes(test, { useBinaryProtocol: true }, { useBinaryProtocol: false });
	};

	/**
	 * Connect twice to the service, using the text protocol and the
	 * binary protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	exports.single_send_text_binary = function(test) {
		_single_send_separate_realtimes(test, { useBinaryProtocol: false }, { useBinaryProtocol: true });
	};

	exports.publish_immediately = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime(),
			rxRealtime = helper.AblyRealtime(),
			channelName = 'publish_immediately',
			messageText = 'Test message';
		test.expect(1);

		Crypto.generateRandomKey(function(err, key) {
			if(err) {
				test.ok(false, 'Unable to generate key; err = ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			var rxChannel = rxRealtime.channels.get(channelName, {cipher: {key: key}});
			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				closeAndFinish(test, [txRealtime, rxRealtime]);
			}, function() {
				var txChannel = txRealtime.channels.get(channelName, {cipher: {key: key}});
				txChannel.publish('event0', messageText);
			})
		});
	}

	/**
	 * Connect twice to the service, using different cipher keys.
	 * Publish an encrypted message on that channel using
	 * the default cipher params and verify that the decrypt failure
	 * is noticed as bad recovered plaintext.
	 */
	exports.single_send_key_mismatch = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime();
		var rxRealtime = helper.AblyRealtime();
		test.expect(1);
		var channelName = 'single_send_key_mismatch',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		async.parallel([
			Crypto.generateRandomKey,
			Crypto.generateRandomKey,
			function(cb) { attachChannels([txChannel, rxChannel], cb); }
		], function(err, res) {
			if(err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			var txKey = res[0],
				rxKey = res[1];

			async.parallel([
				function(cb) { txChannel.setOptions({cipher: {key: txKey}}); cb(); },
				function(cb) { rxChannel.setOptions({cipher: {key: rxKey}}); cb(); }
			], function() {
				rxChannel.subscribe('event0', function(msg) {
					test.ok(msg.data != messageText);
					closeAndFinish(test, [txRealtime, rxRealtime]);
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
	exports.single_send_unencrypted = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime();
		var rxRealtime = helper.AblyRealtime();
		test.expect(1);
		var channelName = 'single_send_unencrypted',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		attachChannels([txChannel, rxChannel], function(err) {
			if(err) {
				test.ok(false, 'Unable to get attach channels; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			Crypto.generateRandomKey(function(err, rxKey) {
				if(err) {
					test.ok(false, 'Unable to generate key; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				rxChannel.setOptions({cipher: {key: rxKey}});
				rxChannel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					closeAndFinish(test, [txRealtime, rxRealtime]);
				});
				txChannel.publish('event0', messageText);
			});
		});
	};

	/**
	 * Connect twice to the service, one with and one without encryption.
	 * Publish an encrypted message and verify that the receiving connection
	 * handles the encrypted message correctly.
	 */
	exports.single_send_encrypted_unhandled = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime();
		var rxRealtime = helper.AblyRealtime();
		test.expect(1);
		var channelName = 'single_send_encrypted_unhandled',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName);

		attachChannels([txChannel, rxChannel], function(err) {
			if(err) {
				test.ok(false, 'Unable to get attach channels; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			Crypto.generateRandomKey(function(err, txKey) {
				if(err) {
					test.ok(false, 'Unable to generate key; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				txChannel.setOptions({cipher: {key: txKey}});
				rxChannel.subscribe('event0', function(msg) {
					test.ok(msg.encoding.indexOf('cipher') > -1);
					closeAndFinish(test, [txRealtime, rxRealtime]);
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
	exports.set_cipher_params0 = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime();
		var rxRealtime = helper.AblyRealtime();
		test.expect(3);
		var channelName = 'set_cipher_params',
			txChannel = txRealtime.channels.get(channelName),
			messageText = 'Test message (' + channelName + ')',
			rxChannel = rxRealtime.channels.get(channelName),
			firstKey, secondKey;

		var waitAttach = function(cb) { attachChannels([txChannel, rxChannel], cb); };
		var setInitialOptions = function(cb) {
			Crypto.generateRandomKey(function(err, key) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				firstKey = key;
				async.parallel([
					function(innercb) {rxChannel.setOptions({cipher: {key: key}}); innercb();},
					function(innercb) {txChannel.setOptions({cipher: {key: key}}); innercb();}
				], cb)
			});
		};

		var sendFirstMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data == messageText, 'Message data not expected value');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			};
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		var createSecondKey = function(cb) {
			Crypto.generateRandomKey(function(err, key) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				secondKey = key;
				async.parallel([
					function(innercb) {rxChannel.setOptions({cipher: null}); innercb();},
					function(innercb) {txChannel.setOptions({cipher: {key: key}}); innercb();}
				], cb)
			});
		};

		var sendSecondMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.encoding.indexOf('cipher') > -1, 'Message does not have cipher transform');
				rxChannel.unsubscribe('event1', handler);
				cb(null);
			};
			rxChannel.subscribe('event1', handler);
			txChannel.publish('event1', messageText);
		};

		var setSecondKey = function(cb) {
			rxChannel.setOptions({cipher: {key: secondKey}});
			cb();
		};

		var sendThirdMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data == messageText, 'Message data not expected (third message)');
				rxChannel.unsubscribe('event2', handler);
				cb(null);
			};
			rxChannel.subscribe('event2', handler);
			txChannel.publish('event2', messageText);
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
				test.ok(false, 'Unexpected error running test; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			closeAndFinish(test, [txRealtime, rxRealtime]);
		});
	};

	return module.exports = helper.withTimeout(exports);
});
