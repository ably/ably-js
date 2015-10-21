"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		loadTestData = helper.loadTestData,
		BufferUtils = Ably.Realtime.BufferUtils,
		Crypto = Ably.Realtime.Crypto,
		Message = Ably.Realtime.Message,
		displayError = helper.displayError,
		testResourcesPath = helper.testResourcesPath,
		msgpack = (typeof(window) == 'object') ? Ably.msgpack : require('msgpack-js'),
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	function attachChannels(channels, callback) {
		async.map(channels, function(channel, cb) { channel.attach(cb); }, callback);
	}

	function compareMessage(one, two) {
		if(one.encoding != two.encoding) return false;
		if(typeof(one.data) == 'string' && typeof(two.data) == 'string') {
			return one.data == two.data;
		}
		if(BufferUtils.isBuffer(one.data) && BufferUtils.isBuffer(two.data)) {
			return (BufferUtils.bufferCompare(one.data, two.data) === 0);
		}
		return JSON.stringify(one.data) == JSON.stringify(two.data);
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
			var channel = realtime.channels.get(channelName);
			var key = BufferUtils.base64Decode(testData.key);
			var iv = BufferUtils.base64Decode(testData.iv);

			Crypto.getDefaultParams(key, function(err, params) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				params.iv = iv;

				test.expect(testData.items.length * testsPerFixture);
				for(var i = 0; i < testData.items.length; i++) {
					var item = testData.items[i];

					/* read messages from test data */
					var testMessage = Message.fromValues(item.encoded);
					var encryptedMessage = Message.fromValues(item.encrypted);
					/* decode (ie remove any base64 encoding). Will throw when
					 * it gets to the cipher part of the encoding, so wrap in try/catch */
					try { Message.decode(testMessage); } catch(_) {}
					try { Message.decode(encryptedMessage); } catch(_) {}
					/* reset channel cipher, to ensure it uses the given iv */
					channel.setOptions({encrypted:true, cipherParams: params});

					fixtureTest(channel.options, testMessage, encryptedMessage, item.msgpack);
				}
				closeAndFinish(test, realtime);
			});
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

	exports.encrypt_message_128 = function(test) {
		testEachFixture(test, 'crypto-data-128.json', 'encrypt_message_128', 1, function(channelOpts, testMessage, encryptedMessage) {
			/* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
			Message.encode(testMessage, channelOpts);
			/* compare */
			test.ok(compareMessage(testMessage, encryptedMessage));
		});
	};

	exports.encrypt_message_256 = function(test) {
		testEachFixture(test, 'crypto-data-256.json', 'encrypt_message_256', 1, function(channelOpts, testMessage, encryptedMessage) {
			/* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
			Message.encode(testMessage, channelOpts);
			/* compare */
			test.ok(compareMessage(testMessage, encryptedMessage));
		});
	};

	exports.decrypt_message_128 = function(test) {
		testEachFixture(test, 'crypto-data-128.json', 'decrypt_message_128', 1, function(channelOpts, testMessage, encryptedMessage) {
			/* decrypt encrypted message; decode() also to handle data that is not string or buffer */
			Message.decode(encryptedMessage, channelOpts);
			/* compare */
			test.ok(compareMessage(testMessage, encryptedMessage));
		});
	};

	exports.decrypt_message_256 = function(test) {
		testEachFixture(test, 'crypto-data-256.json', 'decrypt_message_256', 1, function(channelOpts, testMessage, encryptedMessage) {
			/* decrypt encrypted message; decode() also to handle data that is not string or buffer */
			Message.decode(encryptedMessage, channelOpts);
			/* compare */
			test.ok(compareMessage(testMessage, encryptedMessage));
		});
	};

	exports.msgpack_128 = function(test) {
		if(!ArrayBuffer) {
			test.ok(false, 'Encryption or binary transport not supported');
			test.done();
			return;
		}

		testEachFixture(test, 'crypto-data-128.json', 'msgpack_128', 2, function(channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
			Message.encode(testMessage, channelOpts);
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
	};

	exports.msgpack_256 = function(test) {
		if(!ArrayBuffer) {
			test.ok(false, 'Encryption or binary transport not supported');
			test.done();
			return;
		}

		testEachFixture(test, 'crypto-data-256.json', 'msgpack_256', 2, function(channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
			Message.encode(testMessage, channelOpts);
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
	};

	/**
	 * Publish and subscribe, binary transport
	 */
	exports.single_send_binary = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var realtime = helper.AblyRealtime({ useBinaryProtocol: true });
		test.expect(3);
		var channel = realtime.channels.get('single_send_binary'),
			messageText = 'Test message (single_send_binary)';

		Crypto.getDefaultParams(function(err, params) {
			if(err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			test.equal(params.algorithm, 'aes');
			test.equal(params.keyLength, 128);
			channel.setOptions({encrypted:true, cipherParams: params});
			channel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				closeAndFinish(test, realtime);
			});
			channel.publish('event0', messageText);
		});
	};

	/**
	 * Publish and subscribe, text transport
	 */
	exports.single_send_text = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var realtime = helper.AblyRealtime({ useBinaryProtocol: false });
		test.expect(3);
		var channel = realtime.channels.get('single_send_text'),
			messageText = 'Test message (single_send_text)';

		Crypto.getDefaultParams(function(err, params) {
			test.equal(params.algorithm, 'aes');
			test.equal(params.keyLength, 128);
			if(err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
			channel.setOptions({encrypted:true, cipherParams: params});
			channel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				closeAndFinish(test, realtime);
			});
			channel.publish('event0', messageText);
		});
	};

	/**
	 * Publish and subscribe, binary transport, 256-bit key
	 */
	exports.single_send_binary_256 = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var realtime = helper.AblyRealtime({ useBinaryProtocol: true });
		test.expect(3);
		var channel = realtime.channels.get('single_send_binary_256'),
			messageText = 'Test message (single_send_binary_256)';

		Crypto.generateRandom(256 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'aes');
				test.equal(params.keyLength, 256);
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				channel.setOptions({encrypted:true, cipherParams: params});
				channel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					closeAndFinish(test, realtime);
				});
				channel.publish('event0', messageText);
			});
		});
	};

	/**
	 * Publish and subscribe, text transport, 256-bit key
	 */
	exports.single_send_text_256 = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var realtime = helper.AblyRealtime({ useBinaryProtocol: false });
		test.expect(3);
		var channel = realtime.channels.get('single_send_text_256'),
			messageText = 'Test message (single_send_text_256)';

		Crypto.generateRandom(256 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'aes');
				test.equal(params.keyLength, 256);
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				channel.setOptions({encrypted:true, cipherParams: params});
				channel.subscribe('event0', function(msg) {
					test.ok(msg.data == messageText);
					closeAndFinish(test, realtime);
				});
				channel.publish('event0', messageText);
			});
		});
	};

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

		Crypto.generateRandom(128 / 8, function(err, key) {
			Crypto.getDefaultParams(key, function(err, params) {
				test.equal(params.algorithm, 'aes');
				test.equal(params.keyLength, 128);
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, realtime);
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

	/**
	 * Connect twice to the service, using the binary protocol
	 * and the text protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	exports.single_send_binary_text = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime({ useBinaryProtocol: true });
		var rxRealtime = helper.AblyRealtime({ useBinaryProtocol: false });
		test.expect(3);
		var channelName = 'single_send_binary_text',
			messageText = 'Test message (' + channelName + ')',
			txChannel = txRealtime.channels.get(channelName),
			rxChannel = rxRealtime.channels.get(channelName);

		async.parallel([
			Crypto.getDefaultParams,
			function(cb) { attachChannels([txChannel, rxChannel], cb); }
		], function(err, res) {
			if (err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			var params = res[0];
			test.equal(params.algorithm, 'aes');
			test.equal(params.keyLength, 128);

			txChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.setOptions({encrypted:true, cipherParams: params});

			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				closeAndFinish(test, [txRealtime, rxRealtime]);
			});
			txChannel.publish('event0', messageText);
		});
	};

	/**
	 * Connect twice to the service, using the text protocol and the
	 * binary protocol. Publish an encrypted message on that channel using
	 * the default cipher params and verify correct receipt.
	 */
	exports.single_send_text_binary = function(test) {
		if(!Crypto) {
			test.ok(false, 'Encryption not supported');
			test.done();
			return;
		}

		var txRealtime = helper.AblyRealtime({ useBinaryProtocol: false });
		var rxRealtime = helper.AblyRealtime({ useBinaryProtocol: true });
		test.expect(3);
		var channelName = 'single_send_text_binary',
			messageText = 'Test message (' + channelName + ')',
			txChannel = txRealtime.channels.get(channelName),
			rxChannel = rxRealtime.channels.get(channelName);

		async.parallel([
			Crypto.getDefaultParams,
			function(cb) { attachChannels([txChannel, rxChannel], cb); }
		], function(err, res) {
			if (err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			var params = res[0];
			test.equal(params.algorithm, 'aes');
			test.equal(params.keyLength, 128);

			txChannel.setOptions({encrypted:true, cipherParams: params});
			rxChannel.setOptions({encrypted:true, cipherParams: params});

			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data == messageText);
				closeAndFinish(test, [txRealtime, rxRealtime]);
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
			Crypto.getDefaultParams,
			Crypto.getDefaultParams,
			function(cb) { attachChannels([txChannel, rxChannel], cb); }
		], function(err, res) {
			if(err) {
				test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			var txParams = res[0],
				rxParams = res[1];

			txChannel.setOptions({encrypted:true, cipherParams: txParams});
			rxChannel.setOptions({encrypted:true, cipherParams: rxParams});
			rxChannel.subscribe('event0', function(msg) {
				test.ok(msg.data != messageText);
				closeAndFinish(test, [txRealtime, rxRealtime]);
			});
			txChannel.publish('event0', messageText);
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
			Crypto.getDefaultParams(function(err, rxParams) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				rxChannel.setOptions({encrypted:true, cipherParams: rxParams});
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
	 * Publish an unencrypted message and verify that the receiving connection
	 * does not attempt to decrypt it.
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
			Crypto.getDefaultParams(function(err, txParams) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				txChannel.setOptions({encrypted:true, cipherParams: txParams});
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
	exports.set_cipher_params = function(test) {
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
			firstParams, secondParams;

		var waitAttach = function(cb) { attachChannels([txChannel, rxChannel], cb); };
		var setInitialOptions = function(cb) {
			Crypto.getDefaultParams(function(err, params) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
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
			};
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		var createSecondKey = function(cb) {
			Crypto.getDefaultParams(function(err, params) {
				if(err) {
					test.ok(false, 'Unable to get cipher params; err = ' + displayError(err));
					closeAndFinish(test, [txRealtime, rxRealtime]);
					return;
				}
				secondParams = params;
				txChannel.setOptions({encrypted: true, cipherParams: secondParams});
				rxChannel.setOptions({encrypted: false});
				cb(null);
			});
		};

		var sendSecondMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.encoding.indexOf('cipher') > -1, 'Message does not have cipher transform');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			};
			rxChannel.subscribe('event0', handler);
			txChannel.publish('event0', messageText);
		};

		var setSecondKey = function(cb) {
			rxChannel.setOptions({encrypted: true, cipherParams: secondParams});
			cb(null);
		};

		var sendThirdMessage = function(cb) {
			var handler = function(msg) {
				test.ok(msg.data == messageText, 'Message data not expected (third message)');
				rxChannel.unsubscribe('event0', handler);
				cb(null);
			};
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
				test.ok(false, 'Unexpected error running test; err = ' + displayError(err));
				closeAndFinish(test, [txRealtime, rxRealtime]);
				return;
			}
			closeAndFinish(test, [txRealtime, rxRealtime]);
		});
	};

	return module.exports = helper.withTimeout(exports);
});
