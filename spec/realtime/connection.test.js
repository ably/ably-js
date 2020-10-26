"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('realtime/connection', function (expect, counter) {
		var exports = {},
			_exports = {},
			closeAndFinish = helper.closeAndFinish,
			createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
			displayError = helper.displayError,
			monitorConnection = helper.monitorConnection;

		it('setupConnection', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		it('connectionPing', function(done) {
			counter.expect(1);
			var realtime;
			try {
				realtime = helper.AblyRealtime();
				realtime.connection.on('connected', function() {
					realtime.connection.ping();
					expect(true, 'check that ping without did not raise exception');
					counter.assert();
					closeAndFinish(done, realtime);
				});
				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, 'test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('connectionPingWithCallback', function(done) {
			counter.expect(2);
			var realtime;
			try {
				realtime = helper.AblyRealtime();
				realtime.connection.on('connected', function() {
					realtime.connection.ping(function(err, responseTime){
						if(err) {
							expect(false, helper.displayError(err));
							closeAndFinish(done, realtime);
							return;
						}
						expect(typeof responseTime).to.equal("number", 'check that a responseTime returned');
						expect(responseTime > 0, 'check that responseTime was +ve');
						counter.assert();
						closeAndFinish(done, realtime);
					});
				});
				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, 'test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('connectionAttributes', function(done) {
			counter.expect(6);
			var realtime;
			try {
				realtime = helper.AblyRealtime({log: {level: 4}});
				realtime.connection.on('connected', function() {
					expect(realtime.connection.serial).to.equal(-1, "verify serial is -1 on connect");
					expect(realtime.connection.recoveryKey).to.equal(realtime.connection.key + ':' + realtime.connection.serial + ':' + realtime.connection.connectionManager.msgSerial, 'verify correct recovery key');

					var channel = realtime.channels.get('connectionattributes');
					channel.attach(function(err) {
						if(err) {
							expect(false, 'Attach failed with error: ' + displayError(err));
							closeAndFinish(done, realtime);
							return;
						}
						async.parallel([
							function(cb) {
								channel.subscribe(function() {
									setTimeout(function() {
										expect(realtime.connection.serial).to.equal(0, "verify serial is 0 after message received")
										if(realtime.connection.serial !== 0) {
											var cm = realtime.connection.connectionManager;
											console.log("connectionAttributes test: connection serial is " + realtime.connection.serial + "; active transport" + (cm.activeProtocol && cm.activeProtocol.transport && cm.activeProtocol.transport.shortName))
										}
										expect(realtime.connection.recoveryKey).to.equal(realtime.connection.key + ':' + realtime.connection.serial + ':' + realtime.connection.connectionManager.msgSerial, 'verify recovery key still correct');
										cb();
									}, 0);
								});
							},
							function(cb) {
								channel.publish("name", "data", cb);
								expect(realtime.connection.serial).to.equal(-1, "verify serial is -1 after publish begun but before message received")
							}
						], function(err) {
							if(err) {
								expect(false, 'test failed with error: ' + displayError(err));
								closeAndFinish(done, realtime);
								return;
							}
							realtime.connection.close();
							realtime.connection.whenState('closed', function() {
								expect(realtime.connection.recoveryKey).to.equal(null, 'verify recovery key null after close');
								counter.assert();
								closeAndFinish(done, realtime);
							});
						});
					});
				});
				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, 'test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('unrecoverableConnection', function(done) {
			counter.expect(5);
			var realtime,
				fakeRecoveryKey = '_____!ablyjs_test_fake-key____:5:3';
			try {
				realtime = helper.AblyRealtime({recover: fakeRecoveryKey});
				realtime.connection.on('connected', function(stateChange) {
					expect(stateChange.reason.code).to.equal(80008, "verify unrecoverable-connection error set in stateChange.reason");
					expect(realtime.connection.errorReason.code).to.equal(80008, "verify unrecoverable-connection error set in connection.errorReason");
					expect(realtime.connection.serial).to.equal(-1, "verify serial is -1 (new connection), not 5");
					expect(realtime.connection.connectionManager.msgSerial).to.equal(0, "verify msgSerial is 0 (new connection), not 3");
					expect(realtime.connection.key.indexOf('ablyjs_test_fake')).to.equal(-1, "verify connection using a new connectionkey");
					counter.assert();
					closeAndFinish(done, realtime);
				});
			} catch(e) {
				expect(false, 'test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/*
		* Check that a message published on one transport that has not yet been
		* acked will be republished with the same msgSerial on a new transport (eg
			* after a resume or an upgrade), before any new messages are send (and
			* without being merged with new messages)
		*/
		it('connectionQueuing', function(done) {
			counter.expect(5);
			var realtime = helper.AblyRealtime({transports: [helper.bestTransport]}),
				channel = realtime.channels.get('connectionQueuing'),
				connectionManager = realtime.connection.connectionManager;

			realtime.connection.once('connected', function() {
				var transport = connectionManager.activeProtocol.transport;
				channel.attach(function(err) {
					if(err) {
						expect(false, 'Attach failed with error: ' + helper.displayError(err));
						closeAndFinish(done, realtime);
						return;
					}
					/* Sabotage sending the message */
					transport.send = function(msg) {
						if(msg.action == 15) {
							expect(msg.msgSerial).to.equal(0, 'Expect msgSerial to be 0');
						}
					};

					async.parallel([
						function(cb) {
							/* Sabotaged publish */
							channel.publish('first', null, function(err) {
								expect(!err, "Check publish happened (eventually) without err");
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
											expect(msg.msgSerial).to.equal(0, 'Expect msgSerial of original message to still be 0');
											expect(msg.messages.length).to.equal(1, 'Expect second message to not have been merged with the attempted message');
										} else if(msg.messages[0].name === 'second') {
											expect(msg.msgSerial).to.equal(1, 'Expect msgSerial of new message to be 1');
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
						counter.assert();
						closeAndFinish(done, realtime);
					});

				});
			});
		});

		/*
		* Inject a new CONNECTED with different connectionDetails; check they're used
		*/
		it('connectionDetails', function(done) {
			counter.expect(5);
			var realtime = helper.AblyRealtime(),
				connectionManager = realtime.connection.connectionManager;
			realtime.connection.once('connected', function() {
				connectionManager.once('connectiondetails', function(details) {
					expect(details.connectionStateTtl).to.equal(12345, 'Check connectionStateTtl in event');
					expect(connectionManager.connectionStateTtl).to.equal(12345, 'Check connectionStateTtl set in connectionManager');
					expect(details.clientId).to.equal('foo', 'Check clientId in event');
					expect(realtime.auth.clientId).to.equal('foo', 'Check clientId set in auth');
					expect(realtime.options.maxMessageSize).to.equal(98765, 'Check maxMessageSize set');
					counter.assert();
					closeAndFinish(done, realtime);
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
			monitorConnection(done, expect, realtime);
		});
	});
});
