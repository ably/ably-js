"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		closeAndFinish = helper.closeAndFinish,
		createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
		displayError = helper.displayError,
		monitorConnection = helper.monitorConnection;

	exports.setupConnection = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				test.ok(true, 'app set up');
			}
			test.done();
		});
	};

	exports.connectionPing = function(test) {
		test.expect(1);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				realtime.connection.ping();
				test.ok(true, 'check that ping without did not raise exception');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.connectionPingWithCallback = function(test) {
		test.expect(2);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				realtime.connection.ping(function(err, responseTime){
					if(err) {
						test.ok(false, helper.displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					test.equal(typeof responseTime, "number", 'check that a responseTime returned');
					test.ok(responseTime > 0, 'check that responseTime was +ve');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.connectionAttributes = function(test) {
		test.expect(6);
		var realtime;
		try {
			realtime = helper.AblyRealtime({log: {level: 4}});
			realtime.connection.on('connected', function() {
				test.equal(realtime.connection.serial, -1, "verify serial is -1 on connect");
				test.equal(realtime.connection.recoveryKey, realtime.connection.key + ':' + realtime.connection.serial + ':' + realtime.connection.connectionManager.msgSerial, 'verify correct recovery key');

				var channel = realtime.channels.get('connectionattributes');
				channel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					async.parallel([
						function(cb) {
							channel.subscribe(function() {
								setTimeout(function() {
									test.equal(realtime.connection.serial, 0, "verify serial is 0 after message received")
									if(realtime.connection.serial !== 0) {
										var cm = realtime.connection.connectionManager;
										console.log("connectionAttributes test: connection serial is " + realtime.connection.serial + "; active transport" + (cm.activeProtocol && cm.activeProtocol.transport && cm.activeProtocol.transport.shortName))
									}
									test.equal(realtime.connection.recoveryKey, realtime.connection.key + ':' + realtime.connection.serial + ':' + realtime.connection.connectionManager.msgSerial, 'verify recovery key still correct');
									cb();
								}, 0);
							});
						},
						function(cb) {
							channel.publish("name", "data", cb);
							test.equal(realtime.connection.serial, -1, "verify serial is -1 after publish begun but before message received")
						}
					], function(err) {
						if(err) {
							test.ok(false, 'test failed with error: ' + displayError(err));
							closeAndFinish(test, realtime);
							return;
						}
						realtime.connection.close();
						realtime.connection.whenState('closed', function() {
							test.equal(realtime.connection.recoveryKey, null, 'verify recovery key null after close');
							closeAndFinish(test, realtime);
						});
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.unrecoverableConnection = function(test) {
		test.expect(5);
		var realtime,
			fakeRecoveryKey = '_____!ablyjs_test_fake-key____:5:3';
		try {
			realtime = helper.AblyRealtime({recover: fakeRecoveryKey});
			realtime.connection.on('connected', function(stateChange) {
				test.equal(stateChange.reason.code, 80008, "verify unrecoverable-connection error set in stateChange.reason");
				test.equal(realtime.connection.errorReason.code, 80008, "verify unrecoverable-connection error set in connection.errorReason");
				test.equal(realtime.connection.serial, -1, "verify serial is -1 (new connection), not 5");
				test.equal(realtime.connection.connectionManager.msgSerial, 0, "verify msgSerial is 0 (new connection), not 3");
				test.equal(realtime.connection.key.indexOf('ablyjs_test_fake'), -1, "verify connection using a new connectionkey");
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Check that a message published on one transport that has not yet been
	 * acked will be republished with the same msgSerial on a new transport (eg
		* after a resume or an upgrade), before any new messages are send (and
		* without being merged with new messages)
	 */
	exports.connectionQueuing = function(test) {
		test.expect(5);
		var realtime = helper.AblyRealtime({transports: [helper.bestTransport]}),
			channel = realtime.channels.get('connectionQueuing'),
			connectionManager = realtime.connection.connectionManager;

		realtime.connection.once('connected', function() {
			var transport = connectionManager.activeProtocol.transport;
			channel.attach(function(err) {
				if(err) {
					test.ok(false, 'Attach failed with error: ' + helper.displayError(err));
					closeAndFinish(test, realtime);
					return;
				}
				/* Sabotage sending the message */
				transport.send = function(msg) {
					if(msg.action == 15) {
						test.equal(msg.msgSerial, 0, 'Expect msgSerial to be 0');
					}
				};

				async.parallel([
					function(cb) {
						/* Sabotaged publish */
						channel.publish('first', null, function(err) {
							test.ok(!err, "Check publish happened (eventually) without err");
							cb();
						});
					},
					function(cb) {
						/* After the disconnect, on reconnect, spy on transport.send again */
						connectionManager.once('transport.pending', function(transport) {
							var oldSend = transport.send;

							transport.send = function(msg, msgCb) {
								if(msg.action === 15) {
									if(msg.messages[0].name === 'first') {
										test.equal(msg.msgSerial, 0, 'Expect msgSerial of original message to still be 0');
										test.equal(msg.messages.length, 1, 'Expect second message to not have been merged with the attempted message');
									} else if(msg.messages[0].name === 'second') {
										test.equal(msg.msgSerial, 1, 'Expect msgSerial of new message to be 1');
										cb();
									}
								}
								oldSend.call(transport, msg, msgCb);
							};
							channel.publish('second', null);
						});

						/* Disconnect the transport (will automatically reconnect and resume) () */
						connectionManager.disconnectAllTransports();
					}
				], function() {
					closeAndFinish(test, realtime);
				});

			});
		});
	};

	/*
	 * Inject a new CONNECTED with different connectionDetails; check they're used
	 */
	exports.connectionDetails = function(test) {
		test.expect(5);
		var realtime = helper.AblyRealtime(),
			connectionManager = realtime.connection.connectionManager;
		realtime.connection.once('connected', function() {
			connectionManager.once('connectiondetails', function(details) {
				test.equal(details.connectionStateTtl, 12345, 'Check connectionStateTtl in event');
				test.equal(connectionManager.connectionStateTtl, 12345, 'Check connectionStateTtl set in connectionManager');
				test.equal(details.clientId, 'foo', 'Check clientId in event');
				test.equal(realtime.auth.clientId, 'foo', 'Check clientId set in auth');
				test.equal(realtime.options.maxMessageSize, 98765, 'Check maxMessageSize set');
				closeAndFinish(test, realtime);
			});
			connectionManager.activeProtocol.getTransport().onProtocolMessage(createPM({
				action: 4,
				connectionId: 'a',
				connectionKey: 'ab',
				connectionSerial: -1,
				connectionDetails: {
					clientId: 'foo',
					maxMessageSize: 98765,
					connectionStateTtl: 12345
				}
			}));
		});
		monitorConnection(test, realtime);
	};

	return module.exports = helper.withTimeout(exports);
});
