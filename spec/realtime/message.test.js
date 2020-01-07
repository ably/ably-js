"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		displayError = helper.displayError,
		utils = helper.Utils,
		closeAndFinish = helper.closeAndFinish,
		createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
		monitorConnection = helper.monitorConnection,
		testOnAllTransports = helper.testOnAllTransports;

	var publishIntervalHelper = function(currentMessageNum, channel, dataFn, onPublish){
			return function(currentMessageNum) {
				console.log('sending: ' + currentMessageNum);
				channel.publish('event0', dataFn(), function() {
					console.log('publish callback called');
					onPublish();
				});
			};
		},
		publishAtIntervals = function(numMessages, channel, dataFn, onPublish){
			for(var i = numMessages; i > 0; i--) {
				setTimeout(publishIntervalHelper(i, channel, dataFn, onPublish), 20*i);
			}
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

	exports.publishonce = function(test) {
		test.expect(2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var testMsg = 'Hello world';
				var rtChannel = realtime.channels.get('publishonce');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to event */
					rtChannel.subscribe('event0', function(msg) {
						test.ok(true, 'Received event0');
						test.equal(msg.data, testMsg, 'Unexpected msg text received');
						closeAndFinish(test, realtime);
					});

					/* publish event */
					var restChannel = rest.channels.get('publishonce');
					restChannel.publish('event0', testMsg);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Test publishes in quick succession (on successive ticks of the event loop)
	 */
	testOnAllTransports(exports, 'publishfast', function(realtimeOpts) { return function(test) {
		test.expect(100);
		try {
			var realtime = helper.AblyRealtime(realtimeOpts);
			realtime.connection.once('connected', function() {
				var channel = realtime.channels.get('publishfast_' + String(Math.random()).substr(2));
				channel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					async.parallel([
						function(cb) {
							channel.subscribe('event', function(msg) {
								test.ok(true, 'Received event ' + msg.data);
								if(msg.data === '49') {
									cb();
								}
							});
						},
						function(cb) {
							var ackd = 0;
							var publish = function(i) {
								channel.publish('event', i.toString(), function(err) {
									test.ok(!err, 'successfully published ' + i + (err ? ' err was ' + displayError(err) : ''));
									ackd++;
									if(ackd === 50) cb();
								});
								if(i < 49) {
									setTimeout(function() {
										publish(i + 1);
									}, 0);
								}
							};
							publish(0);
						}
					], function() {
						closeAndFinish(test, realtime);
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};});

	/*
	 * Test queuing: publishing a series of messages that start before the lib is connected
	 * Also checks they arrive in the right order
	 */
	testOnAllTransports(exports, 'publishQueued', function(realtimeOpts) { return function(test) {
		test.expect(150);
		var txRealtime, rxRealtime;
		try {
			txRealtime = helper.AblyRealtime(utils.mixin(realtimeOpts, { autoConnect: false }));
			rxRealtime = helper.AblyRealtime();
			var txChannel = txRealtime.channels.get('publishQueued_' + String(Math.random()).substr(2));
			var rxChannel = rxRealtime.channels.get(txChannel.name);

		async.series([
			function(cb) {
				rxRealtime.connection.once('connected', function() { cb(); });
			},
			function(cb) {
				rxChannel.attach(function(err) { cb(err); });
			},
			function(cb) {
				async.parallel([
					function(parCb) {
						var expectedMsgNum = 0;
						rxChannel.subscribe('event', function(msg) {
							var num = msg.data.num;
							test.ok(true, 'Received event ' + num);
							test.equal(expectedMsgNum, num, 'Event ' + num + ' was in the right order');
							expectedMsgNum++;
							if(num === 49) parCb();
						});
					},
					function(parCb) {
						var ackd = 0;
						var publish = function(i) {
							txChannel.publish('event', {num: i}, function(err) {
								test.ok(!err, 'successfully published ' + i + (err ? ' err was ' + displayError(err) : ''));
								ackd++;
								if(ackd === 50) parCb();
							});
							if(i < 49) {
								setTimeout(function() {
									publish(i + 1);
								}, 20);
							}
						};
						publish(0);
					},
					function(parCb) {
						txRealtime.connection.once('connected', function() { parCb(); });
						txRealtime.connection.connect();
					}
				], cb);
			}
		], function() {
				closeAndFinish(test, [rxRealtime, txRealtime]);
			});
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, [rxRealtime, txRealtime]);
		}
	};});

	/*
	 * Test that a message is not sent back to the same realtime client
	 * when echoMessages is false (RTC1a and RTL7f)
	 *
	 * Test that a message is sent back to the same realtime client
	 * when echoMessages is true (RTC1a and RTL7f)
	 */
	exports.publishEcho = function(test) {
		test.expect(7);

		// set up two realtimes
		var rtNoEcho = helper.AblyRealtime({ echoMessages: false }),
			rtEcho = helper.AblyRealtime({ echoMessages: true }),

			rtNoEchoChannel = rtNoEcho.channels.get('publishecho'), 
			rtEchoChannel = rtEcho.channels.get('publishecho'),

			testMsg1 = 'Hello',
			testMsg2 = 'World!';

		// We expect to see testMsg2 on rtNoEcho and testMsg1 on both rtNoEcho and rtEcho
		var receivedMessagesNoEcho = [],
			receivedMessagesEcho = [];

		var finishTest = function() {
			if (receivedMessagesNoEcho.length + receivedMessagesEcho.length == 3) {
				test.equal(receivedMessagesNoEcho.length, 1, 'Received exactly one message on rtNoEcho');
				test.equal(receivedMessagesEcho.length, 2, 'Received exactly two messages on rtEcho');
				try {
					test.equal(receivedMessagesNoEcho[0], testMsg2, 'Received testMsg2 on rtNoEcho');
					test.equal(receivedMessagesEcho[0], testMsg1, 'Received testMsg1 on rtEcho first');
					test.equal(receivedMessagesEcho[1], testMsg2, 'Received testMsg2 on rtEcho second');
				} catch(e) {
					test.ok(false, 'Failed to find an expected message in the received messages');
				}
				closeAndFinish(test, [rtNoEcho, rtEcho]);
			}
		}

		// attach rtNoEchoChannel
		rtNoEchoChannel.attach(function(err) {
			test.ok(!err,'Attached to rtNoEchoChannel with no error');
			monitorConnection(test, rtNoEcho);

			// once rtNoEchoChannel attached, subscribe to event0
			rtNoEchoChannel.subscribe('event0', function(msg) {
				receivedMessagesNoEcho.push(msg.data);
				finishTest();
			});

			// attach rtEchoChannel
			rtEchoChannel.attach(function(err) {
				test.ok(!err,'Attached to rtEchoChannel with no error');
				monitorConnection(test, rtEcho);

				// once rtEchoChannel attached, subscribe to event0
				rtEchoChannel.subscribe('event0', function(msg) {
					receivedMessagesEcho.push(msg.data);
					finishTest();
				});
				
				// publish testMsg1 via rtNoEcho
				rtNoEchoChannel.publish('event0', testMsg1, function() {
					// publish testMsg2 via rtEcho
					rtEchoChannel.publish('event0', testMsg2);
				});
				
			});
		});
	};

	exports.publishVariations = function(test) {
		var testData = 'Some data';
		var testArguments = [
			[{name: 'objectWithName'}],
			[{name: 'objectWithNameAndNullData', data: null}],
			[{name: 'objectWithNameAndUndefinedData', data: undefined}],
			[{name: 'objectWithNameAndEmptyStringData', data: ''}],
			['nameAndNullData', null],
			['nameAndUndefinedData', undefined],
			['nameAndEmptyStringData', ''],
			['nameAndData', testData],
			[{name: 'objectWithNameAndData', data: testData}],
			// 5 messages with null name,
			[null, testData],
			[{name: null, data: testData}],
			[null, null],
			[{name: null}],
			[{name: null, data: null}]
		];
		var realtime;

		test.expect(testArguments.length * 2);
		try {
			/* set up realtime */
			realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishVariations');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to different message types */
					var messagesReceived = 0;
					rtChannel.subscribe(function(msg) {
						test.ok(true, 'Received ' + msg.name);
						++messagesReceived;
						switch(msg.name) {
							case 'objectWithName':
							case 'objectWithNameAndCallback':
							case 'objectWithNameAndNullData':
							case 'objectWithNameAndUndefinedData':
							case 'nameAndNullData':
							case 'nameAndUndefinedData':
								test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								break;
							case 'nameAndEmptyStringData':
							case 'objectWithNameAndEmptyStringData':
								test.strictEqual(msg.data, '', 'Msg data received was a ' + typeof(msg.data) + ' when should have been an empty string');
								break;
							case 'objectWithNameAndFalseData':
							case 'nameAndFalseData':
								test.strictEqual(msg.data, false, 'Msg data received was a ' + typeof(msg.data) + ' when should have been a bool false');
								break;
							case 'nameAndData':
							case 'nameAndDataAndCallback':
							case 'objectWithNameAndData':
							case 'objectWithNameAndDataAndCallback':
								test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								break;
							case undefined:
								if (msg.data) {
									// 3 messages: null name and data, null name and data and callback, object with null name and data
									test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								} else {
									// 3 messages: null name and null data, object with null name and no data, object with null name and null data
									test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								}
								break;
							default:
								test.ok(false, 'Unexpected message ' + msg.name + 'received');
								closeAndFinish(test, realtime);
						}

						if (messagesReceived == testArguments.length) {
							setTimeout(function() {
								closeAndFinish(test, realtime);
							}, 2000);
						}
					});

					/* publish events */
					var restChannel = rest.channels.get('publishVariations');
					async.eachSeries(testArguments, function iterator(args, callback) {
						args.push(callback);
						restChannel.publish.apply(restChannel, args);
					}, function(err) {
						if(err) {
							test.ok(false, 'Error received by publish callback ' + displayError(err));
							closeAndFinish(test, realtime);
							return;
						}
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishDisallowed = function(test) {
		var testArguments = [
			[{name: 'objectAndBoolData', data: false}],
			['nameAndBoolData', false],
			[{name: 'objectAndNumericData', data: 0}],
			['nameAndNumericData', 0],
			[{name: 'objectAndOtherObjectData', data: new Date()}],
			['nameAndOtherObjectData', new Date()]
		];

		test.expect(testArguments.length * 2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishDisallowed');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					/* publish events */
					var restChannel = rest.channels.get('publishDisallowed');
					for(var i = 0; i < testArguments.length; i++) {
						try {
							restChannel.publish.apply(restChannel, testArguments[i]);
							test.ok(false, "Exception was not raised");
						} catch (e) {
							test.ok(true, "Exception correctly raised");
							test.equal(e.code, 40013, "Invalid data type exception raised");
						}
					}
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishEncodings = function(test) {
		var testData = 'testData';
		var testArguments = [
			// valid
			[{name: 'justJson', encoding: 'json', data: '{\"foo\":\"bar\"}'}],
			// invalid -- encoding ending in utf-8 implies data is binary
			[{name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{\"foo\":\"bar\"}'}],
			// valid
			[{name: 'utf8base64', encoding: 'utf-8/base64', data: 'dGVzdERhdGE='}],
			// invalid -- nonsense/corrupt encoding
			[{name: 'nonsense', encoding: 'choahofhpxf', data: testData}]
		];

		test.expect(testArguments.length * 4); // One for sending, one for receiving, one each for data & encoding
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishEncodings');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					var subscribefn = function(cb) {
						var messagesReceived = 0;
						rtChannel.subscribe(function(msg) {
							test.ok(true, 'Received ' + msg.name);
							++messagesReceived;
							switch(msg.name) {
								case 'justJson':
									test.deepEqual(msg.data, {foo: "bar"}, 'justJson: correct decoded data');
									test.equal(msg.encoding, null, 'justJson: encoding stripped on decoding');
									break;
								case 'jsonUtf8string':
									test.equal(msg.data, '{\"foo\":\"bar\"}', 'justJsonUTF8string: data should be untouched');
									test.equal(msg.encoding, 'json/utf-8', 'justJsonUTF8string: encoding should be untouched');
									break;
								case 'utf8base64':
									test.equal(msg.data, "testData", 'utf8base64: correct decoded data');
									test.equal(msg.encoding, null, 'utf8base64: encoding stripped on decoding');
									break;
								case 'nonsense':
									test.deepEqual(msg.data, testData, 'nonsense: data untouched');
									test.equal(msg.encoding, 'choahofhpxf', 'nonsense: encoding untouched');
									break;
								default:
									test.ok(false, 'Unexpected message ' + msg.name + ' received');
									cb();
							}
							if (messagesReceived == testArguments.length) {
								cb();
							}
						});
					}

					/* publish events */
					var publishfn = function(cb) {
						var restChannel = rest.channels.get('publishEncodings');
						async.eachSeries(testArguments, function iterator(item, callback) {
							try {
								restChannel.publish(item, function(err) {
									test.ok(!err, "Successfully published");
									callback(err);
								});
							} catch (e) {
								test.ok(false, "Failed to publish");
							}
						}, cb);
					}

					async.parallel([subscribefn, publishfn], function() {
						closeAndFinish(test, realtime);
					})
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};


	exports.restpublish = function(test) {
		var count = 10;
		var rest = helper.AblyRest();
		var realtime = helper.AblyRealtime();
		test.expect(2 * count);
		var messagesSent = [];
		var sendchannel = rest.channels.get('restpublish');
		var recvchannel = realtime.channels.get('restpublish');
		/* subscribe to event */
		recvchannel.subscribe('event0', function(msg) {
			test.ok(true, 'Received event0');
			test.notEqual(-1, utils.arrIndexOf(messagesSent, msg.data), 'Received unexpected message text');
			if(!--count) {
				clearInterval(timer);
				closeAndFinish(test, realtime);
			}
		});
		var timer = setInterval(function() {
			// console.log('sending: ' + count);
			var msgText = 'Hello world at: ' + new Date();
			messagesSent.push(msgText);
			sendchannel.publish('event0', msgText);
		}, 500);
	};

	testOnAllTransports(exports, 'publish', function(realtimeOpts) { return function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				closeAndFinish(test, realtime);
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var realtime = helper.AblyRealtime(realtimeOpts);
		test.expect(count);
		var channel = realtime.channels.get('publish ' + JSON.stringify(realtimeOpts));
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		}, function() {
			var dataFn = function() { return 'Hello world at: ' + new Date(); };
			publishAtIntervals(count, channel, dataFn, onPublish);
		});
	}});

	exports.duplicateMsgId = function(test) {
		test.expect(1);
		var realtime = helper.AblyRealtime({log: {level: 4}}),
			connectionManager = realtime.connection.connectionManager,
			channel = realtime.channels.get('duplicateMsgId'),
			received = 0;

		channel.subscribe(function(_msg) {
			received++;
		})
		channel.once('attached', function() {
			realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 15,
				channel: channel.name,
				id: "foo:0",
				connectionSerial: 0,
				messages: [{name: null, data: null}]
			}));

			/* add some nonmessage channel message inbetween */
			realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 11,
				channel: channel.name
			}));

			realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 15,
				channel: channel.name,
				id: "foo:0",
				connectionSerial: 1,
				messages: [{name: null, data: null}]
			}));

			test.equal(received, 1);
			closeAndFinish(test, realtime);
		});
	};

	exports.duplicateConnectionId = function(test) {
		test.expect(1);
		var realtime = helper.AblyRealtime({log: {level: 4}}),
			connectionManager = realtime.connection.connectionManager,
			channel = realtime.channels.get('duplicateConnectionId'),
			received = 0;

		channel.subscribe(function(_msg) {
			received++;
		});
		channel.once('attached', function() {
			realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 15,
				channel: channel.name,
				id: "foo:0",
				connectionSerial: 0,
				messages: [{name: null, data: null}]
			}));

			realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 15,
				channel: channel.name,
				id: "bar:0",
				connectionSerial: 0,
				messages: [{name: null, data: null}]
			}));

			test.equal(received, 1);
			closeAndFinish(test, realtime);
		});
	};

	/* Authenticate with a clientId and ensure that the clientId is not sent in the Message
	   and is implicitly added when published */
	exports.implicit_client_id_0 = function(test) {
		var clientId = 'implicit_client_id_0',
				realtime = helper.AblyRealtime({ clientId: clientId });

		test.expect(3);

		realtime.connection.once('connected', function() {
			var transport = realtime.connection.connectionManager.activeProtocol.transport,
					originalSend = transport.send;

			transport.send = function(message) {
				if (message.action === 15) {
					test.ok(message.messages[0].name === 'event0', 'Outgoing message interecepted');
					test.ok(!message.messages[0].clientId, 'client ID is not added by the client library as it is implicit');
				}
				originalSend.apply(transport, arguments);
			};

			var channel = realtime.channels.get('implicit_client_id_0');
			/* subscribe to event */
			channel.subscribe('event0', function(message) {
				test.ok(message.clientId == clientId, 'Client ID was added implicitly');
				closeAndFinish(test, realtime);
			});
			channel.publish('event0', null);
		});
	};

	/* Authenticate with a clientId and explicitly provide the same clientId in the Message
	   and ensure it is published */
	exports.explicit_client_id_0 = function(test) {
		var clientId = 'explicit_client_id_0',
			/* Use a fixed transport as intercepting transport.send */
			realtime = helper.AblyRealtime({ clientId: clientId, transports: [helper.bestTransport] });

		test.expect(4);

		realtime.connection.once('connected', function() {
			var transport = realtime.connection.connectionManager.activeProtocol.transport,
					originalSend = transport.send;

			transport.send = function(message) {
				if (message.action === 15) {
					test.ok(message.messages[0].name === 'event0', 'Outgoing message interecepted');
					test.ok(message.messages[0].clientId === clientId, 'client ID is present when published to Ably');
				}
				originalSend.apply(transport, arguments);
			};

			var channel = realtime.channels.get('explicit_client_id_0');
			/* subscribe to event */
			channel.attach(function(err) {
				if(err) {
					test.ok(!err, err && helper.displayError(err));
					closeAndFinish(test, realtime);
				}
				async.parallel([
					function(cb) {
						channel.subscribe('event0', function(message) {
							test.ok(message.clientId == clientId, 'Client ID was added implicitly');
							cb();
						});
					},
					function(cb) {
						channel.publish({ name: 'event0', clientId: clientId }, function(err) {
							cb(err);
						});
					}
				], function(err) {
					test.ok(!err, err && helper.displayError(err));
					closeAndFinish(test, realtime);
				});
			});
		});
	};


	/* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
	   and expect it to not be published and be rejected */
	exports.explicit_client_id_1 = function(test) {
		var clientId = 'explicit_client_id_1',
				invalidClientId = 'invalid',
				rest = helper.AblyRest();

		test.expect(4);

		rest.auth.requestToken({ clientId: clientId }, function(err, token) {
			test.ok(token.clientId === clientId, 'client ID is present in the Token');

			/* Use a fixed transport as intercepting transport.send */
			var realtime = helper.AblyRealtime({ token: token.token, transports: [helper.bestTransport] }),
					channel = realtime.channels.get('explicit_client_id_1');

			// Publish before authentication to ensure the client library does not reject the message as the clientId is not known
			channel.publish({ name: 'event0', clientId: invalidClientId }, function(err) {
				test.ok(err, 'Message was not published');
				setTimeout(function() { closeAndFinish(test, realtime); }, 500); // ensure that the message is not published
			});

			realtime.connection.connectionManager.on('transport.pending', function(transport) {
				var originalSend = transport.send;

				transport.send = function(message) {
					if (message.action === 15) {
						test.ok(message.messages[0].name === 'event0', 'Outgoing message interecepted');
						test.ok(message.messages[0].clientId === invalidClientId, 'client ID is present when published to Ably');
					}
					originalSend.apply(transport, arguments);
				};

				/* subscribe to event */
				channel.subscribe('event0', function(message) {
					test.ok(false, 'Message should never have been received');
				});
			});
		});
	};

	exports.subscribe_with_event_array = function(test) {
		var realtime = helper.AblyRealtime(),
			channel = realtime.channels.get('subscribe_with_event_array');

		async.series([
			function(cb) {
				realtime.connection.once('connected', function() { cb(); });
			},
			function(cb) {
				channel.attach(function(err) { cb(err); });
			},
			function(outercb) {
				async.parallel([
					function(innercb) {
						var received = 0;
						channel.subscribe(['a', 'b'], function(message) {
							test.ok(message.name === 'a' || message.name === 'b', 'Correct messages received');
							++received;
							if(received === 2) {
								/* wait a tick to make sure no more messages come in */
								utils.nextTick(function() { innercb(); });
							}
						});
					},
					function(innercb) {
						channel.publish([{name: 'a'}, {name: 'b'}, {name: 'c'}, {name: 'd'}], function(err) {
							innercb(err);
						});
					}
				], outercb)
			}], function(err) {
				test.ok(!err, err && helper.displayError(err));
				closeAndFinish(test, realtime);
			});
	};

	exports.extras_field = function(test) {
		var realtime = helper.AblyRealtime(),
			channel = realtime.channels.get('extras_field'),
			extras = {some: 'metadata'};

		test.expect(3);

		async.series([
			function(cb) {
				realtime.connection.once('connected', function() { cb(); });
			},
			channel.attach.bind(channel),
			function(outercb) {
				async.parallel([
					function(innercb) {
						var received = 0;
						channel.subscribe(function(message) {
							test.ok(true, 'Message received');
							test.deepEqual(message.extras, extras, 'Check extras is present');
							innercb();
						});
					},
					function(innercb) {
						channel.publish([{name: 'a', extras: extras}], innercb);
					}
				], outercb)
			}], function(err) {
				test.ok(!err, err && helper.displayError(err));
				closeAndFinish(test, realtime);
			});
	};

	/* TO3l8; CD2C; RSL1i */
	exports.maxMessageSize = function(test) {
		test.expect(2);
		var realtime = helper.AblyRealtime(),
			connectionManager = realtime.connection.connectionManager,
			channel = realtime.channels.get('maxMessageSize');

		realtime.connection.once('connected', function() {
			connectionManager.once('connectiondetails', function(details) {
				channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', function(err) {
					test.ok(err, 'Check publish refused');
					test.equal(err.code, 40009);
					closeAndFinish(test, realtime);
				});
			});
			var connectionDetails = connectionManager.connectionDetails;
			connectionDetails.maxMessageSize = 64;
			connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 4,
				connectionDetails: connectionDetails
			}));
		});
	};

	/* RTL6d: publish a series of messages that exercise various bundling
	 * constraints, check they're satisfied */
	exports.bundling = function(test) {
		test.expect(30);
		var realtime = helper.AblyRealtime({maxMessageSize: 256, autoConnect: false}),
			channelOne = realtime.channels.get('bundlingOne'),
			channelTwo = realtime.channels.get('bundlingTwo');

		/* RTL6d3; RTL6d5 */
		channelTwo.publish('2a', {expectedBundle: 0});
		channelOne.publish('a', {expectedBundle: 1});
		channelOne.publish([{name: 'b', data: {expectedBundle: 1}}, {name: 'c', data: {expectedBundle: 1}}]);
		channelOne.publish('d', {expectedBundle: 1});
		channelTwo.publish('2b', {expectedBundle: 2});
		channelOne.publish('e', {expectedBundle: 3});
		channelOne.publish({name: 'f', data: {expectedBundle: 3}});
		/* RTL6d2 */
		channelOne.publish({name: 'g', data: {expectedBundle: 4}, clientId: 'foo'});
		channelOne.publish({name: 'h', data: {expectedBundle: 4}, clientId: 'foo'});
		channelOne.publish({name: 'i', data: {expectedBundle: 5}, clientId: 'bar'});
		channelOne.publish('j', {expectedBundle: 6});
		/* RTL6d1 */
		channelOne.publish('k', {expectedBundle: 7, moreData: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
		channelOne.publish('l', {expectedBundle: 8});
		/* RTL6d7 */
		channelOne.publish({name: 'm', id: 'bundle_m', data: {expectedBundle: 9}});
		channelOne.publish('z_last', {expectedBundle: 10});

		var queue = realtime.connection.connectionManager.queuedMessages;
		var messages;
		for(var i=0; i<=10; i++) {
			messages = queue.messages[i].message.messages || queue.messages[i].message.presence;
			for(var j=0; j<messages.length; j++) {
				test.equal(JSON.parse(messages[j].data).expectedBundle, i);
			}
		}

		/* RTL6d6 */
		var currentName = '';
		channelOne.subscribe(function(msg) {
			test.ok(currentName < msg.name, 'Check final ordering preserved');
			currentName = msg.name;
			if(currentName === 'z_last') {
				closeAndFinish(test, realtime);
			}
		});
		realtime.connect();
	};

	exports.idempotentRealtimePublishing = function(test) {
		test.expect(3);
		var realtime = helper.AblyRealtime(),
			channel = realtime.channels.get('idempotentRealtimePublishing');

		channel.attach(function(err) {
			if(err) {
				test.ok(false, 'Attach failed with error: ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}

			/* subscribe to event */
			var event0Msgs = [];
			channel.subscribe('event0', function(msg) {
				test.ok(true, 'Received event0');
				event0Msgs.push(msg);
			});

			channel.subscribe('end', function(msg) {
				test.ok(true, 'Received end');
				test.equal(event0Msgs.length, 1, 'Expect only one event0 message to be received');
				closeAndFinish(test, realtime);
			});

			/* publish event */
			channel.publish({name: 'event0', id: 'some_msg_id'});
			channel.publish({name: 'event0', id: 'some_msg_id'});
			channel.publish({name: 'event0', id: 'some_msg_id'});
			channel.publish('end', null);
		});
	};


	exports.publishpromise = function(test) {
		if(typeof Promise === 'undefined') {
			test.done();
			return;
		}
		test.expect(7);
		var realtime = helper.AblyRealtime({promises: true});
		var channel = realtime.channels.get('publishpromise');

		var publishPromise = realtime.connection.once('connected').then(function(connectionStateChange) {
			test.ok(true, 'Check once() returns a promise');
			test.equal(connectionStateChange.current, 'connected', 'Check promise is resolved with a connectionStateChange');
			return channel.attach();
		}).then(function() {
			return channel.publish('name', 'data');
		}).then(function() {
			test.ok(true, 'Check publish returns a promise that resolves on publish');
		})['catch'](function(err) {
			test.ok(false, 'Promise chain failed with error: ' + displayError(err));
		})

		var subscribePromise;
		var messagePromise = new Promise(function(msgResolve) {
			subscribePromise = channel.subscribe('name', function(msg) {
				test.ok(true, 'Received message');
				msgResolve();
			}).then(function() {
				test.ok(true, 'Check subscribe returns a promise that resolves on attach');
			});
		})

		var channelFailedPromise = realtime.channels.get(':invalid').attach()['catch'](function(err) {
			test.ok(true, 'Check attach returns a promise that is rejected on attach fail');
			test.equal(err.code, 40010, 'Check err passed through correctly');
		});

		Promise.all([publishPromise, subscribePromise, messagePromise, channelFailedPromise]).then(function() {
			closeAndFinish(test, realtime);
		});
	};

	return module.exports = helper.withTimeout(exports);
});
