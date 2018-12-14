"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {}, _exports = {},
		displayError = helper.displayError,
		utils = helper.Utils,
		createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	function extractClientIds(presenceSet) {
		return utils.arrMap(presenceSet, function(presmsg) {
			return presmsg.clientId;
		}).sort();
	}

	function extractMember(presenceSet, clientId) {
		return helper.arrFind(presenceSet, function(member) {
			return member.clientId === clientId;
		});
	}

	var rest, authToken, authToken2;
	var testClientId = 'testclient', testClientId2 = 'testclient2';

	var createListenerChannel = function(channelName, callback) {
		var channel, realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				console.log("Listener connected");
				channel = realtime.channels.get(channelName);
				channel.attach(function(err) {
					console.log("Listener attached to channel " + channelName);
					callback(err, realtime, channel);
				});
			});
		} catch(err) {
			callback(err, realtime);
		}
	};

	var listenerFor = function(eventName, expectedClientId) {
		return function(test, channel, callback) {
			var presenceHandler = function(presmsg) {
				if(this.event === eventName) {
					test.ok(true, 'Presence ' + eventName + ' received');
					if(expectedClientId !== undefined) {
						test.equal(presmsg.clientId, expectedClientId, 'Verify correct clientId');
					}
					channel.presence.unsubscribe(presenceHandler);
					callback();
				}
			};
			channel.presence.subscribe(presenceHandler);
		};
	};

	var runTestWithEventListener = function(test, channel, eventListener, testRunner) {
		try {
			createListenerChannel(channel, function(err, listenerRealtime, presenceChannel){
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, listenerRealtime);
					return;
				}
				console.log("presenceChannel:", presenceChannel.name);

				async.parallel([
					function(cb) {
						eventListener(test, presenceChannel, cb);
					},
					testRunner
				], function(err, res) {
					console.log("in callback, err = ", err);
					if(err) {
						test.ok(false, displayError(err));
					}
					// testRunner might or might not call back with an open realtime
					var openConnections = (res[1] && res[1].close) ?
						[listenerRealtime, res[1]] :
						listenerRealtime;
					closeAndFinish(test, openConnections);
				});
			});
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			test.done();
		}
	};

	exports.setupPresence = function(test) {
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

	/*
	 * Create authTokens associated with specific clientIds
	 */
	exports.setupPresenceTokens = function(test) {
		test.expect(2);
		try {
			rest = helper.AblyRest();
			rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				authToken = tokenDetails;
				test.equal(tokenDetails.clientId, testClientId, 'Verify client id');

				rest.auth.requestToken({clientId:testClientId2}, function(err, tokenDetails) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					authToken2 = tokenDetails;
					test.equal(tokenDetails.clientId, testClientId2, 'Verify client id (2)');
					test.done();
				});
			});
		} catch(err) {
			test.ok(false, 'Test failed with exception: ' + err.stack);
			test.done();
		}
	};


	/*
	 * Attach to channel, enter presence channel with data and await entered event
	 */
	exports.presenceAttachAndEnter = function(test) {
		test.expect(2);

		var channelName = 'attachAndEnter';
		var attachAndEnter = function(cb) {
			/* set up authenticated connection */
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter('Test client data (enter0)', function(err) {
						if(!err)
							test.ok(true, 'Presence event sent');
						cb(err, clientRealtime);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), attachAndEnter);
	};

	/*
	 * Enter presence channel without prior attach and await entered event
	 */
	exports.presenceEnterWithoutAttach = function(test) {
		test.expect(2);

		var channelName = 'enterWithoutAttach';
		var enterWithoutAttach = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.presence.enter('Test client data (enterWithoutAttach)', function(err) {
					if(!err)
						test.ok(true, 'Presence event sent');
					cb(err, clientRealtime);
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), enterWithoutAttach);
	};

	/*
	 * Enter presence channel without prior connect and await entered event
	 */
	exports.presenceEnterWithoutConnect = function(test) {
		test.expect(2);

		var channelName = 'enterWithoutConnect';
		var enterWithoutConnect = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			var clientChannel = clientRealtime.channels.get(channelName);
			clientChannel.presence.enter('Test client data (enterWithoutConnect)', function(err) {
				if(!err)
					test.ok(true, 'Presence event sent');
				cb(err, clientRealtime);
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), enterWithoutConnect);
	};

	/*
	 * Attach to channel, enter presence channel (without waiting for attach callback), detach
	 * from channel immediately in 'attached' callback
	 */
	exports.presenceEnterDetachRace = function(test) {
		// Can't use runTestWithEventListener helper as one of the successful
		// outcomes is an error in presence enter, in which case listenForEventOn
		// will not run its callback
		var channelName = 'enterDetachRace';
		try {
			/* listen for the enter event, test is complete when received */

			createListenerChannel(channelName, function(err, listenerRealtime, presenceChannel){
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, listenerRealtime);
					return;
				}

				var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });

				listenerFor('enter', testClientId)(test, presenceChannel, function() {
					closeAndFinish(test, [listenerRealtime, clientRealtime]);
				});

				clientRealtime.connection.on('connected', function() {
					/* get channel, attach, and enter */
					var clientChannel = clientRealtime.channels.get(channelName);
					clientChannel.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + displayError(err));
							closeAndFinish(test, [listenerRealtime, clientRealtime]);
							return;
						}
						test.ok(true, 'Attached');
						clientChannel.detach(function(err) {
							if(err) {
								test.ok(false, 'Detach failed with error: ' + displayError(err));
								closeAndFinish(test, [listenerRealtime, clientRealtime]);
								return;
							}
						});
					});
					clientChannel.presence.enter('Test client data (enter3)', function(err) {
						// Note: either an error (pending messages failed to send due to detach)
						//   or a success (pending messages were pushed out before the detach)
						//   is an acceptable result. Throwing an uncaught exception (the behaviour
						//   that we're testing for) isn't.
						if(err) {
							test.ok(true, 'Enter failed with error: ' + JSON.stringify(err));
							closeAndFinish(test, [listenerRealtime, clientRealtime]);
							return;
						}
						/* if presence event gets sent successfully, second and third assertions happen and test
						* finishes in the presence event handler */
					});
				});
				monitorConnection(test, clientRealtime);
			});
		} catch(e) {
			test.ok(false, 'presence.enterDetachRace failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Attach to channel, enter presence channel with a callback but no data and await entered event
	 */
	exports.presenceEnterWithCallback = function(test) {
		test.expect(2);

		var channelName = 'enterWithCallback';
		var enterWithCallback = function(cb) {
			/* set up authenticated connection */
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter(function(err) {
						if(!err)
							test.ok(true, 'Presence event sent');
						cb(err, clientRealtime);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), enterWithCallback);
	};

	/*
	 * Attach to channel, enter presence channel with neither callback nor data and await entered event
	 */
	exports.presenceEnterWithNothing = function(test) {
		test.expect(1);

		var channelName = 'enterWithNothing';
		var enterWithNothing = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter();
					cb(null, clientRealtime);
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), enterWithNothing);
	};

	/*
	 * Attach to channel, enter presence channel with data but no callback and await entered event
	 */
	exports.presenceEnterWithData = function(test) {
		test.expect(1);

		var channelName = 'enterWithData';
		var enterWithData = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter('Test client data (enter6)');
					cb(null, clientRealtime);
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('enter'), enterWithData);
	};

	/*
	 * Attach to channel, enter presence channel and ensure PresenceMessage
	 * has valid action string
	 */
	exports.presenceMessageAction = function(test) {
		test.expect(1);

		var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
		var channelName = 'presenceMessageAction';
		var clientChannel = clientRealtime.channels.get(channelName);
		var presence = clientChannel.presence;
		presence.subscribe(function(presenceMessage) {
			test.equals(presenceMessage.action, 'enter', 'Action should contain string "enter"');
			closeAndFinish(test, clientRealtime);
		});
		clientChannel.presence.enter();
		monitorConnection(test, clientRealtime);
	};

	/*
	 * Enter presence channel (without attaching), detach, then enter again to reattach
	 */
	exports.presenceEnterDetachEnter = function(test) {
		test.expect(4);

		var channelName = 'enterDetachEnter';
		var secondEventListener = function(test, channel, callback) {
			var presenceHandler = function(presenceMsg) {
				if(presenceMsg.data == 'second') {
					test.ok(true, 'Second presence event received');
					channel.presence.unsubscribe(presenceHandler);
					callback();
				}
			};
			channel.presence.subscribe(presenceHandler);
		};
		var enterDetachEnter = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken, transports: [helper.bestTransport]}); // NB remove besttransport in 1.1 spec, see attachdetach0
			var clientChannel = clientRealtime.channels.get(channelName);
			clientRealtime.connection.once('connected', function() {
				clientChannel.presence.enter('first', function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					test.ok(true, 'Entered presence first time');
					clientChannel.detach(function(err) {
						if(err) {
							cb(err, clientRealtime);
							return;
						}
						test.ok(true, 'Detached from channel');
						clientChannel.presence.enter('second', function(err){
							if(!err)
								test.ok(true, 'Second presence enter sent');
							cb(err, clientRealtime);
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, secondEventListener, enterDetachEnter);
	};

	/*
	 * Enter invalid presence channel (without attaching), check callback was called with error
	 */
	exports.presenceEnterInvalid = function(test) {
		var clientRealtime;
		try {
			test.expect(2);
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			var clientChannel = clientRealtime.channels.get('');
			clientRealtime.connection.once('connected', function() {
				clientChannel.presence.enter('clientId', function(err) {
					if(err) {
						test.ok(true, 'Enter correctly failed with error: ' + displayError(err));
						test.equal(err.code, 40010, 'Correct error code');
						closeAndFinish(test, clientRealtime);
						return;
					}
					test.ok(false, 'should have failed');
					closeAndFinish(test, clientRealtime);
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presenceEnterInvalid failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	/*
	 * Attach to channel, enter+leave presence channel and await leave event
	 */
	exports.presenceEnterAndLeave = function(test) {
		test.expect(3);

		var channelName = 'enterAndLeave';
		var enterAndLeave = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter('Test client data (leave0)', function(err) {
						if(err) {
							cb(err, clientRealtime);
							return;
						}
						test.ok(true, 'Presence event sent');
					});
					clientChannel.presence.leave(function(err) {
						if(!err)
							test.ok(true, 'Presence event sent');
						cb(err, clientRealtime);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, listenerFor('leave'), enterAndLeave);
	};

	/*
	 * Attach to channel, enter presence channel, update data, and await update event
	 */
	exports.presenceEnterUpdate = function(test) {
		test.expect(5);

		var newData = "New data";
		var channelName = 'enterUpdate';
		var eventListener = function(test, channel, callback) {
			var presenceHandler = function(presenceMsg) {
				if(this.event == 'update') {
					test.ok(true, 'Update event received');
					test.equal(presenceMsg.clientId, testClientId, 'Check presence event has correct clientId');
					test.equal(presenceMsg.data, newData, 'Check presence event has correct data');
					channel.presence.unsubscribe(presenceHandler);
					callback();
				}
			};
			channel.presence.subscribe(presenceHandler);
		};
		var enterUpdate = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter('Original data', function(err) {
						if(err) {
							cb(err, clientRealtime);
							return;
						}
						test.ok(true, 'Presence enter sent');
						clientChannel.presence.update(newData, function(err) {
							if(!err)
								test.ok(true, 'Presence update sent');
							cb(err, clientRealtime);
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, eventListener, enterUpdate);
	};

	/*
	 * Attach to channel, enter presence channel and get presence
	 */
	exports.presenceEnterGet = function(test) {
		test.expect(4);
		var channelName = 'enterGet';
		var testData = 'some data for presenceEnterGet';
		var eventListener = function(test, channel, callback) {
			var presenceHandler = function() {
				/* Should be ENTER, but may be PRESENT in a race */
				channel.presence.get(function(err, presenceMembers) {
					if(err) {
						callback(err);
						return;
					}
					test.equal(presenceMembers.length, 1, 'Expect test client to be the only member present');
					test.equal(presenceMembers[0].clientId, testClientId, 'Expected test clientId to be correct');
					test.equal(presenceMembers[0].data, testData, 'Expected data to be correct');
					channel.presence.unsubscribe(presenceHandler);
					callback();
				});
			};
			channel.presence.subscribe(presenceHandler);
		};
		var enterGet = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter(testData, function(err) {
						if(!err)
							test.ok(true, 'Presence enter sent');
						cb(err, clientRealtime);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, eventListener, enterGet);
	};

	/*
	 * Realtime presence subscribe on an unattached channel should implicitly attach
	 */
	exports.presenceSubscribeUnattached = function(test) {
		test.expect(1);
		var channelName = 'subscribeUnattached';
		var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
		var clientRealtime2;
		clientRealtime.connection.on('connected', function() {
			var clientChannel = clientRealtime.channels.get(channelName);
			clientChannel.presence.subscribe(function(presMsg) {
				test.equal(presMsg.clientId, testClientId2, 'verify clientId correct');
				closeAndFinish(test, [clientRealtime, clientRealtime2]);
			})
			/* Technically a race, but c2 connecting and attaching should take longer than c1 attaching */
			clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
			clientRealtime2.connection.on('connected', function() {
				var clientChannel2 = clientRealtime2.channels.get(channelName);
				clientChannel2.presence.enter('data');
			});
		});
		monitorConnection(test, clientRealtime);
	};

	/*
	 * Realtime presence GET on an unattached channel should attach and wait for sync
	 */
	exports.presenceGetUnattached = function(test) {
		test.expect(5);
		var channelName = 'getUnattached';
		var testData = 'some data';
		var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
		clientRealtime.connection.on('connected', function() {
			/* get channel, attach, and enter */
			var clientChannel = clientRealtime.channels.get(channelName);
			clientChannel.presence.enter(testData, function(err) {
				if(!err) test.ok(true, 'Presence enter sent');

				var clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
				clientRealtime2.connection.on('connected', function() {
					var clientChannel2 = clientRealtime2.channels.get(channelName);
					/* GET without attaching */
					clientChannel2.presence.get(function(err, presenceMembers) {
						if(err) {
							test.ok(false, 'presence get failed with error: ' + displayError(err));
							closeAndFinish(test, [clientRealtime, clientRealtime2]);
							return;
						}
						test.ok(clientChannel2.state, 'attached', 'Verify channel attached');
						test.ok(clientChannel2.presence.syncComplete, 'Verify sync complete');
						test.equal(presenceMembers.length, 1, 'Expect test client to be present');
						test.equal(presenceMembers[0].clientId, testClientId, 'Expected test clientId to be correct');
						closeAndFinish(test, [clientRealtime, clientRealtime2]);
					});
				});
			});
		});
		monitorConnection(test, clientRealtime);
	};

	/*
	 * Attach to channel, enter+leave presence channel and get presence
	 */
	exports.presenceEnterLeaveGet = function(test) {
		test.expect(3);
		var channelName = 'enterLeaveGet';
		var eventListener = function(test, channel, callback) {
			var presenceHandler = function() {
				// Ignore the first (enter) event
				if(this.event == 'leave') {
					channel.presence.get(function(err, presenceMembers) {
						if(err) {
							callback(err);
							return;
						}
						test.equal(presenceMembers.length, 0, 'Expect presence set to be empty');
						channel.presence.unsubscribe(presenceHandler);
						callback();
					});
				}
			};
			channel.presence.subscribe(presenceHandler);
		};
		var enterLeaveGet = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter('testClientData', function(err) {
						if(err) {
							cb(err, clientRealtime);
							return;
						}
						test.ok(true, 'Presence enter event sent');
						clientChannel.presence.leave(function(err) {
							if(!err)
								test.ok(true, 'Presence leave event sent');
							cb(err, clientRealtime);
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, eventListener, enterLeaveGet);
	};

	/*
	 * Attach to channel, enter+leave presence, detatch again, and get presence history
	 */
	exports.presenceHistory = function(test) {
		test.expect(3);
		var clientRealtime;
		var channelName = 'history';
		var testClientData = 'Test client data (history0)';
		var queryPresenceHistory = function(channel) {
			channel.presence.history(function(err, resultPage) {
				if(err) {
					test.ok(false, displayError(err));
					closeAndFinish(test, clientRealtime);
					return;
				}

				var presenceMessages = resultPage.items;
				test.equal(presenceMessages.length, 2, 'Verify correct number of presence messages found');
				var actions = utils.arrMap(presenceMessages, function(msg){return msg.action;}).sort();
				test.deepEqual(actions, ['enter','leave'], 'Verify presenceMessages have correct actions');
				test.equal(presenceMessages[0].data || presenceMessages[1].data, testClientData, 'Verify correct data (from whichever message was the "enter")');
				closeAndFinish(test, clientRealtime);
			});
		};
		try {
			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, clientRealtime);
						return;
					}
					clientChannel.presence.enter(testClientData, function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + displayError(err));
							closeAndFinish(test, clientRealtime);
							return;
						}
						clientChannel.presence.leave(function(err) {
							if(err) {
								test.ok(false, 'Enter failed with error: ' + displayError(err));
								closeAndFinish(test, clientRealtime);
								return;
							}
							clientChannel.detach(function(err) {
								if(err) {
									test.ok(false, 'Attach failed with error: ' + displayError(err));
									closeAndFinish(test, clientRealtime);
									return;
								}
								queryPresenceHistory(clientChannel);
							});
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.history0 failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	exports.presenceHistoryUntilAttach = function(test) {
		test.expect(6);

		var clientRealtime = helper.AblyRealtime({clientId: testClientId});
		var channelName = 'historyUntilAttach';
		var clientChannel = clientRealtime.channels.get(channelName);
		var testClientData = 'Test client data (history0)';
		var attachEnterAndLeave = function(callback) {
			clientChannel.attach(function(err) {
				if(err) {
					test.ok(false, 'Attach failed with error: ' + displayError(err));
					closeAndFinish(test, clientRealtime);
					return;
				}
				clientChannel.presence.enter(testClientData, function(err) {
					if(err) {
						test.ok(false, 'Enter failed with error: ' + displayError(err));
						closeAndFinish(test, clientRealtime);
						return;
					}
					clientChannel.presence.leave(function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + displayError(err));
							closeAndFinish(test, clientRealtime);
							return;
						}
						callback();
					});
				});
			});
		};
		var sortedActions = function(presenceMessages) {
			return utils.arrMap(presenceMessages, function(msg){
				return msg.action;
			}).sort();
		};
		var tests = [
			function(callback) {
				clientChannel.presence.history({untilAttach: false}, function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 4, 'Verify both sets of presence messages returned when untilAttached is false');
					test.deepEqual(sortedActions(resultPage.items), ['enter','enter','leave','leave'], 'Verify presenceMessages have correct actions');
					callback();
				});
			},
			function(callback) {
				clientChannel.presence.history({untilAttach: true}, function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 2, 'Verify only the first set of presence messages returned when untilAttached is true');
					test.deepEqual(sortedActions(resultPage.items), ['enter','leave'], 'Verify presenceMessages have correct actions');
					callback();
				});
			},
			function(callback) {
				clientChannel.presence.history(function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 4, 'Verify both sets of presence messages returned when untilAttached is not present');
					test.deepEqual(sortedActions(resultPage.items), ['enter','enter','leave','leave'], 'Verify presenceMessages have correct actions');
					callback();
				});
			}
		];

		try {
			clientRealtime.connection.on('connected', function() {
				/* Attach, enter, leave, then detach. Then attach, enter, and
				 * leave, but stay attached. Then query presence history with
				 * untilAttach both true, false, and not present, checking that
				 * the right presence messages are returned in each case */
				attachEnterAndLeave(function() {
					clientChannel.detach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + displayError(err));
							closeAndFinish(test, clientRealtime);
							return;
						}
						attachEnterAndLeave(function() {
							async.parallel(tests, function(err){
								if(err) {
									test.ok(false, displayError(err));
									closeAndFinish(test, clientRealtime);
									return;
								}
								closeAndFinish(test, clientRealtime);
							});
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.history_until_attach failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	/*
	 * Attach to channel, enter presence channel, then initiate second
	 * connection, seeing existing member in message subsequent to second attach response
	 */
	exports.presenceSecondConnection = function(test) {
		test.expect(3);

		var clientRealtime1, clientRealtime2;
		var channelName = 'secondConnection';
		try {
			/* set up authenticated connection */
			clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime1.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel1 = clientRealtime1.channels.get(channelName);
				clientChannel1.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, clientRealtime1);
						return;
					}
					clientChannel1.presence.enter('Test client data (attach0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + displayError(err));
							closeAndFinish(test, clientRealtime1);
							return;
						}
						test.ok(true, 'Presence event sent');
					});
					clientChannel1.presence.subscribe('enter', function() {
						clientChannel1.presence.get(function(err, presenceMembers1) {
							if(err) {
								test.ok(false, 'Presence get() failed with error: ' + displayError(err));
								closeAndFinish(test, clientRealtime1);
								return;
							}
							test.equal(presenceMembers1.length, 1, 'Member present');
							/* now set up second connection and attach */
							/* set up authenticated connection */
							clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
							clientRealtime2.connection.on('connected', function() {
								/* get channel, attach */
								var clientChannel2 = clientRealtime2.channels.get(channelName);
								clientChannel2.attach(function(err) {
									if(err) {
										test.ok(false, 'Attach failed with error: ' + displayError(err));
										closeAndFinish(test, [clientRealtime1, clientRealtime2]);
										return;
									}
									clientChannel2.presence.subscribe('present', function() {
										/* get the channel members and verify testclient is there */
										clientChannel2.presence.get(function(err, presenceMembers2) {
											if(err) {
												test.ok(false, 'Presence get() failed with error: ' + displayError(err));
												closeAndFinish(test, [clientRealtime1, clientRealtime2]);
												return;
											}
											console.log(presenceMembers1, presenceMembers2);
											test.deepEqual(presenceMembers1, presenceMembers2, 'Verify member presence is indicated after attach');
											closeAndFinish(test, [clientRealtime1, clientRealtime2]);
										});
									});
								});
							});
							monitorConnection(test, clientRealtime2);
						});
					});
				});
			});
			monitorConnection(test, clientRealtime1);
		} catch(e) {
			test.ok(false, 'presenceSecondConnection failed with exception: ' + e.stack);
			closeAndFinish(test, [clientRealtime1, clientRealtime2]);
		}
	};

	/*
	 * Attach and enter channel on two connections, seeing
	 * both members in presence set
	 * Use get to filter by clientId and connectionId
	 */
	exports.presenceTwoMembers = function(test) {
		test.expect(10);

		var clientRealtime1, clientRealtime2, clientChannel1, clientChannel2;
		var channelName = "twoMembers";
		var done = function() {
			closeAndFinish(test, [clientRealtime1, clientRealtime2]);
		};
		try {
			/* set up authenticated connections */
			async.parallel([
				function(cb1) {
					var data = 'Test client data (member0-1)';
					clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
					clientRealtime1.connection.on('connected', function() {
						/* get channel, attach, and enter */
						clientChannel1 = clientRealtime1.channels.get(channelName);
						clientChannel1.attach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + displayError(err));
								cb1(err);
								return;
							}
							clientChannel1.presence.enter(data, function(err) {
								if(err) {
									test.ok(false, 'Enter failed with error: ' + displayError(err));
									cb1(err);
									return;
								}
								test.ok(true, 'Presence event sent');
								cb1();
							});
						});
					});
					monitorConnection(test, clientRealtime1);
				},
				function(cb2) {
					var data = 'Test client data (member0-2)';
					clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
					clientRealtime2.connection.on('connected', function() {
						/* get channel, attach */
						clientChannel2 = clientRealtime2.channels.get(channelName);
						clientChannel2.attach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + displayError(err));
								cb2(err);
								return;
							}
							var enterPresence = function(onEnterCB) {
								clientChannel2.presence.enter(data, function(err) {
									if(err) {
										test.ok(false, 'Enter failed with error: ' + displayError(err));
										cb2(err);
										return;
									}
									test.ok(true, 'Presence event sent');
									onEnterCB();
								});
							};
							// Wait for both enter events to be received on clientChannel2 before calling back
							var waitForClient = function(clientId) {
								return function(onEnterCb) {
										var presenceHandler = function(presenceEvent){
										/* PrenceEvent from first connection might come through as an enter or a present */
										if(presenceEvent.clientId == clientId && (this.event === 'enter' || this.event === 'present')) {
											test.ok(true, 'Presence event for ' + clientId + ' received');
											clientChannel2.presence.unsubscribe(presenceHandler);
											onEnterCb();
										}
									};
									clientChannel2.presence.subscribe(presenceHandler);
								};
							};
							async.parallel([
								waitForClient(testClientId),
								waitForClient(testClientId2),
								enterPresence
							], function() {
								cb2();
							});
						});
					});
					monitorConnection(test, clientRealtime2);
				}
			], function(err) {
				if (err) {
					test.ok(false, 'Setup failed: ' + displayError(err));
					return done();
				}
				async.parallel([
					/* First test: no filters */
					function(cb) {
						clientChannel2.presence.get(function(err, members) {
							if(err) {
								test.ok(false, 'Presence.get() failed with error: ' + displayError(err));
								return cb(err);
							}
							test.equal(members.length, 2, 'Verify both members present');
							test.notEqual(members[0].connectionId, members[1].connectionId, 'Verify members have distinct connectionIds');
							cb();
						});
					},
					/* Second test: filter by clientId */
					function(cb) {
						clientChannel2.presence.get({ clientId: testClientId }, function(err, members) {
							if(err) {
								test.ok(false, 'Presence.get() failed with error: ' + displayError(err));
								return cb(err);
							}
							test.equal(members.length, 1, 'Verify only one member present when filtered by clientId');
							test.equal(members[0].clientId, testClientId, 'Verify clientId filter works');
							cb();
						});
					},
					/* Third test: filter by connectionId */
					function(cb) {
						clientChannel2.presence.get({ connectionId: clientRealtime1.connection.id }, function(err, members) {
							if(err) {
								test.ok(false, 'Presence.get() failed with error: ' + displayError(err));
								return cb(err);
							}
							test.equal(members.length, 1, 'Verify only one member present when filtered by connectionId');
							test.equal(members[0].connectionId, clientRealtime1.connection.id, 'Verify connectionId filter works');
							cb();
						});
					}
				], function(err) {
					if (err) {
						test.ok(false, 'Setup failed: ' + displayError(err));
					}
					done();
				});

			});
		} catch(e) {
			test.ok(false, 'presence.presenceTwoMembers failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Enter presence channel (without attaching), close the connection,
	 * reconnect, then enter again to reattach
	 */
	exports.presenceEnterAfterClose = function(test) {
		test.expect(5);

		var channelName = "enterAfterClose";
		var secondEnterListener = function(test, channel, callback) {
			var presenceHandler = function(presenceMsg) {
				if(this.event == 'enter' && presenceMsg.data == 'second') {
					test.ok(true, 'Second presence event received');
					channel.presence.unsubscribe(presenceHandler);
					callback();
				}
			};
			channel.presence.subscribe(presenceHandler);
		};
		var enterAfterClose = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			var clientChannel = clientRealtime.channels.get(channelName);
			clientRealtime.connection.once('connected', function() {
				/* get channel and enter (should automatically attach) */
				clientChannel.presence.enter('first', function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					test.ok(true, 'Entered presence first time');
					clientRealtime.close();
					clientRealtime.connection.whenState('closed', function() {
						test.ok(true, 'Connection successfully closed');
						clientRealtime.connection.once('connected', function() {
							test.ok(true, 'Successfully reconnected');
							//Should automatically reattach
							clientChannel.presence.enter('second', function(err) {
								if(!err)
									test.ok(true, 'Second presence enter sent');
								cb(err, clientRealtime);
							});
						});
						clientRealtime.connection.connect();
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, secondEnterListener, enterAfterClose);
	};

	/*
	 * Try to enter presence channel on a closed connection and check error callback
	 */
	exports.presenceEnterClosed = function(test) {
		var clientRealtime;
		var channelName = "enterClosed";
		try {
			test.expect(2);
			clientRealtime = helper.AblyRealtime();
			var clientChannel = clientRealtime.channels.get(channelName);
			clientRealtime.connection.on('connected', function() {
				clientRealtime.close();
				clientChannel.presence.enterClient('clientId', function(err) {
					test.equal(err.code, 80017, 'presence enter failed with correct code');
					test.equal(err.statusCode, 400, 'presence enter failed with correct statusCode');
					test.done();
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presenceEnterClosed failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	/*
	 * Client ID is implicit in the connection so should not be sent for current client operations
	 */
	exports.presenceClientIdIsImplicit = function(test) {
		var clientId = 'implicitClient',
				client = helper.AblyRealtime({ clientId: clientId });

		test.expect(6);
		var channel = client.channels.get('presenceClientIdIsImplicit'),
				presence = channel.presence;

		var originalSendPresence = channel.sendPresence;
		channel.sendPresence = function(presence, callback) {
			test.ok(!presence.clientId, 'Client ID should not be present as it is implicit');
			originalSendPresence.apply(channel, arguments);
		};

		presence.enter(null, function(err) {
			test.ok(!err, 'Enter with implicit clientId failed');
			presence.update(null, function(err) {
				test.ok(!err, 'Update with implicit clientId failed');
				presence.leave(null, function(err) {
					test.ok(!err, 'Leave with implicit clientId failed');
					closeAndFinish(test, client);
				});
			});
		});
	};

	/*
	 * Check that old deprecated on/off methods still work
	 */
	exports.presenceOn = function(test) {
		test.expect(1);
		var channelName = 'enterOn';
		var testData = 'some data';
		var eventListener = function(test, channel, callback) {
			var presenceHandler = function() {
				callback();
			};
			channel.presence.on(presenceHandler);
		};
		var enterOn = function(cb) {
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get(channelName);
				clientChannel.attach(function(err) {
					if(err) {
						cb(err, clientRealtime);
						return;
					}
					clientChannel.presence.enter(testData, function(err) {
						if(!err)
							test.ok(true, 'Presence enter sent');
						cb(err, clientRealtime);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		};

		runTestWithEventListener(test, channelName, eventListener, enterOn);
	};

	/*
	 * Check that encodable presence messages are encoded correctly
	 */
	exports.presenceEncoding = function(test) {
		test.expect(6);
		var data = {'foo': 'bar'},
			encodedData = JSON.stringify(data),
			options = { clientId: testClientId, tokenDetails: authToken, autoConnect: false, transports: [helper.bestTransport] };

		var realtimeBin = helper.AblyRealtime(utils.mixin(options, { useBinaryProtocol: true }));
		var realtimeJson = helper.AblyRealtime(utils.mixin(options, { useBinaryProtocol: false }));

		var runTest = function(realtime, callback) {
			realtime.connection.connectionManager.once('transport.active', function(transport) {
				var originalSend = transport.send;

				transport.send = function(message) {
					if(message.action === 14) {
						/* Message is formatted for Ably by the toJSON method, so need to
						* stringify and parse to see what actually gets sent */
						var presence = JSON.parse(JSON.stringify(message.presence[0]));
						test.equal(presence.action, 2, 'Enter action');
						test.equal(presence.data, encodedData, 'Correctly encoded data');
						test.equal(presence.encoding, 'json', 'Correct encoding');
						transport.send = originalSend;
						callback();
					}
					originalSend.apply(transport, arguments);
				};

				var channel = realtime.channels.get('presence-' + (realtime.options.useBinaryProtocol ? 'bin' : 'json') + '-encoding');
				channel.presence.enter(data);
			});
			realtime.connect();
		}

		async.series([
			function(callback) { console.log('realtimeBin'); runTest(realtimeBin, callback); },
			function(callback) { console.log('realtimeJson'); runTest(realtimeJson, callback); }
		], function() {
			closeAndFinish(test, [realtimeBin, realtimeJson]);
		});
	}

	/*
	 * Request a token using clientId, then initialize a connection without one,
	 * and check that can enter presence with the clientId inherited from tokenDetails
	 */
	exports.presence_enter_inherited_clientid = function(test) {
		test.expect(3);
		var channelName = "enter_inherited_clientid"

		var authCallback = function(tokenParams, callback) {
			rest.auth.requestToken({clientId: testClientId}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				callback(null, tokenDetails);
			});
		};

		var enterInheritedClientId = function(cb) {
			var realtime = helper.AblyRealtime({ authCallback: authCallback });
			var channel = realtime.channels.get(channelName);
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.clientId, testClientId);
				channel.presence.enter("test data", function(err) {
					cb(err, realtime);
				});
			});
			monitorConnection(test, realtime);
		}

		runTestWithEventListener(test, channelName, listenerFor('enter', testClientId), enterInheritedClientId);
	};

	/*
	 * Request a token using clientId, then initialize a connection without one,
	 * and check that can enter presence with the clientId inherited from tokenDetails
	 * before we're connected, so before we know our clientId
	 */
	exports.presence_enter_before_know_clientid = function(test) {
		test.expect(4);
		var channelName = "enter_before_know_clientid"

		var enterInheritedClientId = function(cb) {
			rest.auth.requestToken({clientId: testClientId}, function(err, tokenDetails) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				var realtime = helper.AblyRealtime({ token: tokenDetails.token, autoConnect: false });
				var channel = realtime.channels.get(channelName);
				test.equal(realtime.auth.clientId, null, 'no clientId when entering');
				channel.presence.enter("test data", function(err) {
					test.equal(realtime.auth.clientId, testClientId, 'clientId has been set by the time we entered');
					cb(err, realtime);
				});
				realtime.connect()
				monitorConnection(test, realtime);
			});
		}

		runTestWithEventListener(test, channelName, listenerFor('enter', testClientId), enterInheritedClientId);
	};

	/*
	 * Check that, on a reattach when presence map has changed since last attach,
	 * all members are emitted and map is in the correct state
	 */
	exports.presence_refresh_on_detach = function(test) {
		test.expect(7);
		var channelName = "presence_refresh_on_detach";
		var realtime = helper.AblyRealtime();
		var observer = helper.AblyRealtime();
		var realtimeChannel = realtime.channels.get(channelName);
		var observerChannel = observer.channels.get(channelName);

		function waitForBothConnect(cb) {
			async.parallel([
				function(connectCb) { realtime.connection.on('connected', connectCb); },
				function(connectCb) { observer.connection.on('connected', connectCb); }
			], function() { cb(); });
		}

		function enterOneAndTwo(cb) {
			async.parallel([
				function(enterCb) { realtimeChannel.presence.enterClient('one', enterCb); },
				function(enterCb) { realtimeChannel.presence.enterClient('two', enterCb); }
			], cb);
		}

		function checkPresence(first, second, cb) {
			observerChannel.presence.get(function(err, presenceMembers) {
				var clientIds = utils.arrMap(presenceMembers, function(msg){return msg.clientId;}).sort();
				test.equal(clientIds.length, 2, 'Two members present');
				test.equal(clientIds[0], first, 'Member ' + first + ' present');
				test.equal(clientIds[1], second, 'Member ' + second + ' present');
				cb(err);
			});
		}

		function swapTwoForThree(cb) {
			async.parallel([
				function(innerCb) { realtimeChannel.presence.leaveClient('two', innerCb); },
				function(innerCb) { realtimeChannel.presence.enterClient('three', innerCb); }
			], cb);
		}

		function attachAndListen(cb) {
			var here = [];
			observerChannel.presence.subscribe(function(pm) {
				here.push(pm.clientId);
				if(here.length == 2) {
					test.deepEqual(here.sort(), ['one', 'three']);
					cb();
				}
			});
			observerChannel.attach();
		}

		async.series([
			waitForBothConnect,
			function(cb) { realtimeChannel.attach(cb); },
			enterOneAndTwo,
			function(cb) { observerChannel.attach(cb); },
			function(cb) { checkPresence('one', 'two', cb); },
			function(cb) { observerChannel.detach(cb); },
			swapTwoForThree,
			attachAndListen,
			function(cb) { checkPresence('one', 'three', cb); }
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, [realtime, observer]);
		});
	};

	exports.presence_detach_during_sync = function(test) {
		test.expect(1);
		var channelName = "presence_detach_during_sync";
		var enterer = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
		var detacher = helper.AblyRealtime();
		var entererChannel = enterer.channels.get(channelName);
		var detacherChannel = detacher.channels.get(channelName);

		function waitForBothConnect(cb) {
			async.parallel([
				function(connectCb) { enterer.connection.on('connected', connectCb); },
				function(connectCb) { detacher.connection.on('connected', connectCb); }
			], function() { cb(); });
		}

		async.series([
			waitForBothConnect,
			function(cb) { entererChannel.presence.enter(cb); },
			function(cb) { detacherChannel.attach(cb); },
			function(cb) { detacherChannel.detach(cb); },
			function(cb) { test.equal(detacherChannel.state, 'detached', 'Check detacher properly detached'); cb(); }
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, [enterer, detacher]);
		});
	};

	/* RTP5c2, RTP17
	 * Test the auto-re-enter functionality by injecting a member into the
	 * private _myMembers set while suspended. Expect on re-attach and sync that
	 * member to be sent to realtime and, with luck, make its way into the normal
	 * presence set */
	exports.presence_auto_reenter = function(test) {
		test.expect(7);
		var channelName = "presence_auto_reenter";
		var realtime = helper.AblyRealtime();
		var channel = realtime.channels.get(channelName);

		async.series([
			function(cb) { realtime.connection.once('connected', function() { cb(); }); },
			function(cb) { channel.attach(cb); },
			function(cb) { channel.presence.members.waitSync(cb); },
			function(cb) {
				channel.presence.enterClient('one', 'onedata');
				channel.presence.subscribe('enter', function() {
					channel.presence.unsubscribe('enter');
					cb();
				});
			},
			function(cb) {
				/* inject an additional member into the myMember set, then force a suspended state */
				var connId = realtime.connection.connectionManager.connectionId;
				channel.presence._myMembers.put({
					action: 'enter',
					clientId: 'two',
					connectionId: connId,
					id: connId + ':0:0',
					data: 'twodata'
				});
				helper.becomeSuspended(realtime, cb);
			},
			function(cb) {
				test.equal(channel.state, 'suspended', 'sanity-check channel state');
				/* Reconnect */
				realtime.connection.connect();
				channel.once('attached', function() { cb(); });
			},
			function(cb) {
				/* Since we haven't been gone for two minutes, we don't know for sure
				 * that realtime will feel it necessary to do a sync - if it doesn't,
					* we request one */
				if(channel.presence.syncComplete) {
					channel.sync();
				}
				channel.presence.members.waitSync(cb);
			},
			function(cb) {
				/* Now just wait for an enter! */
				channel.presence.subscribe('enter', function(presmsg) {
					test.equal(presmsg.clientId, 'two', 'Check expected clientId');
					channel.presence.unsubscribe('enter');
					cb();
				});
			},
			function(cb) {
				channel.presence.get(function(err, results) {
					test.ok(channel.presence.syncComplete, 'Check in sync');
					test.equal(results.length, 2, 'Check correct number of results');
					test.deepEqual(extractClientIds(results), ['one', 'two'], 'check correct members');
					test.equal(extractMember(results, 'one').data, 'onedata', 'check correct data on one');
					test.equal(extractMember(results, 'two').data, 'twodata', 'check correct data on two');
					cb();
				});
			}
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, realtime);
		});
	};

	/* RTP5c3
	 * Test failed presence auto-re-entering */
	exports.presence_failed_auto_reenter = function(test) {
		test.expect(5);
		var channelName = "presence_failed_auto_reenter",
			realtime, channel, token;

		async.series([
			function(cb) {
				/* Request a token without the capabilities to be in the presence set */
				var tokenParams = {clientId: 'me', capability: {}};
				tokenParams.capability[channelName] = ['publish', 'subscribe'];
				rest.auth.requestToken(tokenParams, function(err, tokenDetails) {
					token = tokenDetails;
					cb(err);
				});
			},
			function(cb) {
				realtime = helper.AblyRealtime({tokenDetails: token});
				channel = realtime.channels.get(channelName);
				realtime.connection.once('connected', function() { cb(); });
			},
			function(cb) { channel.attach(cb); },
			function(cb) {
				channel.presence.get(function(err, members) {
					test.equal(members.length, 0, 'Check no-one in presence set');
					cb();
				});
			},
			function(cb) {
				/* inject an additional member into the myMember set, then force a suspended state */
				var connId = realtime.connection.connectionManager.connectionId;
				channel.presence._myMembers.put({
					action: 'enter',
					clientId: 'me',
					connectionId: connId,
					id: connId + ':0:0'
				});
				helper.becomeSuspended(realtime, cb);
			},
			function(cb) {
				realtime.connection.connect();
				channel.once('attached', function() { cb(); });
			},
			function(cb) {
				/* The channel will now try to auto-re-enter the me client, which will result in... */
				channel.once(function(channelStateChange) {
					test.equal(this.event, 'update', 'Check get an update event');
					test.equal(channelStateChange.current, 'attached', 'Check still attached')
					test.equal(channelStateChange.reason && channelStateChange.reason.code, 91004, 'Check error code')
					cb();
				})
			},
			function(cb) {
				channel.presence.get(function(err, members) {
					test.equal(members.length, 0, 'Check no-one in presence set');
					cb();
				});
			}
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, realtime);
		});
	};

	/* Enter ten clients while attaching, finish the attach, check they were all entered correctly */
	exports.multiple_pending = function(test) {
		/* single transport to avoid upgrade stalling due to the stubbed attachImpl */
		var realtime = helper.AblyRealtime({transports: [helper.bestTransport]}),
			channel = realtime.channels.get('multiple_pending'),
			originalAttachImpl = channel.attachImpl;

		async.series([
			function(cb) { realtime.connection.once('connected', function() { cb(); }); },
			function(cb) {
				/* stub out attachimpl */
				channel.attachImpl = function() {};
				channel.attach();

				for(var i=0; i<10; i++) {
					channel.presence.enterClient('client_' + i.toString(), i.toString());
				}

				channel.attachImpl = originalAttachImpl;
				channel.checkPendingState();

				/* Now just wait for an enter. One enter implies all, they'll all be
				 * sent in one protocol message */
				channel.presence.subscribe('enter', function() {
					channel.presence.unsubscribe('enter');
					helper.Utils.nextTick(cb);
				});
			},
			function(cb) {
				channel.presence.get(function(err, results) {
					test.equal(results.length, 10, 'Check all ten clients are there');
					cb();
				});
			}
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, realtime);
		});
	};

	/* RTP19
	 * Check that a LEAVE message is published for anyone in the local presence
	 * set but missing from a sync */
	exports.leave_published_for_member_missing_from_sync = function(test) {
		test.expect(6);
		var realtime = helper.AblyRealtime({transports: helper.availableTransports}),
			continuousClientId = 'continuous',
			goneClientId = 'gone',
			continuousRealtime = helper.AblyRealtime({clientId: continuousClientId}),
			channelName = 'leave_published_for_member_missing_from_sync',
			channel = realtime.channels.get(channelName),
			continuousChannel = continuousRealtime.channels.get(channelName);
		monitorConnection(test, realtime);
		monitorConnection(test, continuousRealtime);

		async.series([
			function(cb) { continuousRealtime.connection.whenState('connected', function() { cb(); }); },
			function(cb) { continuousChannel.attach(cb); },
			function(cb) { continuousChannel.presence.enter(cb); },
			function(cb) { realtime.connection.whenState('connected', function() { cb(); }); },
			function(cb) { channel.attach(cb); },
			function(cb) {
				channel.presence.get({waitForSync: true}, function(err, members) {
					test.equal(members && members.length, 1, 'Check one member present');
					cb(err);
				});
			},
			function(cb) {
				/* Inject an additional member locally */
				channel.onMessage({
					"action": 14,
					"id": "messageid:0",
					"connectionId": "connid",
					"timestamp": utils.now(),
					"presence": [{
						"clientId": goneClientId,
						"action": 'enter'
					}]});
				channel.presence.get(function(err, members) {
					test.equal(members && members.length, 2, 'Check two members present');
					cb(err);
				});
			},
			function(cb) {
				channel.presence.subscribe(function(presmsg) {
					channel.presence.unsubscribe();
					test.equal(presmsg.action, 'leave', 'Check action was leave');
					test.equal(presmsg.clientId, goneClientId, 'Check goneClient has left');
					cb();
				});
				channel.sync();
			},
			function(cb) {
				channel.presence.get({waitForSync: true}, function(err, members) {
					test.equal(members && members.length, 1, 'Check back to one member present');
					test.equal(members && members[0] && members[0].clientId, continuousClientId, 'check cont still present')
					cb(err);
				});
			},
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				return;
			}
			closeAndFinish(test, [realtime, continuousRealtime]);
		});
	};

	/* RTP19a
	 * Check that a LEAVE message is published for anyone in the local presence
	 * set if get an ATTACHED with no HAS_PRESENCE */
	exports.leave_published_for_members_on_presenceless_attached = function(test) {
		test.expect(4);
		var realtime = helper.AblyRealtime(),
			channelName = 'leave_published_for_members_on_presenceless_attached',
			channel = realtime.channels.get(channelName),
			fakeClientId = 'faker';
		monitorConnection(test, realtime);

		async.series([
			function(cb) { realtime.connection.whenState('connected', function() { cb(); }); },
			function(cb) { channel.attach(cb); },
			function(cb) {
				/* Inject a member locally */
				channel.onMessage({
					"action": 14,
					"id": "messageid:0",
					"connectionId": "connid",
					"timestamp": utils.now(),
					"presence": [{
						"clientId": fakeClientId,
						"action": 'enter'
					}]});
				channel.presence.get(function(err, members) {
					test.equal(members && members.length, 1, 'Check one member present');
					cb(err);
				});
			},
			function(cb) {
				channel.presence.subscribe(function(presmsg) {
					test.equal(presmsg.action, 'leave', 'Check action was leave');
					test.equal(presmsg.clientId, fakeClientId, 'Check fake client has left');
					cb();
				});
				/* Inject an ATTACHED with RESUMED and HAS_PRESENCE both false */
				channel.onMessage(createPM({
					"action": 11,
					"channelSerial": channel.properties.attachSerial,
					"flags": 0
				}));
			},
			function(cb) {
				channel.presence.get(function(err, members) {
					test.equal(members && members.length, 0, 'Check no members present');
					cb(err);
				});
			},
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				return;
			}
			closeAndFinish(test, realtime);
		});
	};

	/* RTP5f; RTP11d
	 * Check that on ATTACHED -> SUSPENDED -> ATTACHED, members map is preserved
	 * and only members that changed between ATTACHED states should result in
	 * presence events */
	exports.suspended_preserves_presence = function(test) {
		test.expect(8);
		var mainRealtime = helper.AblyRealtime({clientId: 'main', log: {level: 4}}),
			continuousRealtime = helper.AblyRealtime({clientId: 'continuous', log: {level: 4}}),
			leavesRealtime = helper.AblyRealtime({clientId: 'leaves', log: {level: 4}}),
			channelName = 'suspended_preserves_presence',
			mainChannel = mainRealtime.channels.get(channelName);

		monitorConnection(test, continuousRealtime);
		monitorConnection(test, leavesRealtime);
		var enter = function(rt) {
			return function(outerCb) {
				var channel = rt.channels.get(channelName);
				async.series([
					function(cb) { rt.connection.whenState('connected', function() { cb(); }); },
					function(cb) { channel.attach(cb); },
					function(cb) { channel.presence.enter(cb); }
				], outerCb);
			};
		};
		var waitFor = function(expectedClientId) {
			return function(cb) {
				var presenceHandler = function(presmsg) {
					if(expectedClientId == presmsg.clientId) {
						mainChannel.presence.unsubscribe(presenceHandler);
						cb();
					}
				};
				mainChannel.presence.subscribe(presenceHandler);
			};
		};

		async.series([
			enter(mainRealtime),
			function(cb) {
				async.parallel([
					waitFor('continuous'),
					enter(continuousRealtime)
				], cb)
			},
			function(cb) {
				async.parallel([
					waitFor('leaves'),
					enter(leavesRealtime)
				], cb)
			},
			function(cb) {
				mainChannel.presence.get(function(err, members) {
					test.equal(members.length, 3, 'Check all three expected members here');
					cb(err);
				});
			},
			function(cb) {
				helper.becomeSuspended(mainRealtime, cb);
			},
			function(cb) {
				mainChannel.presence.get(function(err) {
					/* Check RTP11d: get() returns an error by default */
					test.ok(err, 'Check error returned by get() while suspended');
					test.equal(err && err.code, 91005, 'Check error code for get() while suspended');
					cb();
				});
			},
			function(cb) {
				mainChannel.presence.get({ waitForSync: false }, function(err, members) {
					/* Check RTP11d: get() works while suspended if waitForSync: false */
					test.ok(!err, 'Check no error returned by get() while suspended if waitForSync: false');
					test.equal(members && members.length, 3, 'Check all three expected members here');
					cb(err);
				});
			},
			function(cb) {
				leavesRealtime.connection.whenState('closed', function() { cb(); });
				leavesRealtime.close();
			},
			function(cb) {
				mainChannel.presence.subscribe(function(presmsg) {
					test.equal(presmsg.clientId, 'leaves', 'Check the only presmsg we get is a leave from leaves');
					test.equal(presmsg.action, 'leave', 'Check the only presmsg we get is a leave from leaves');
					cb();
				});
				/* Don't need to reattach explicitly; should be done automatically on connected */
				mainRealtime.connect();
			},
			function(cb) {
				/* Wait a bit to make sure we don't receive any other presence messages */
				setTimeout(cb, 1000);
			},
			function(cb) {
				mainChannel.presence.get(function(err, members) {
					test.equal(members && members.length, 2, 'Check two expected members here');
					cb(err);
				});
			}
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, [mainRealtime, continuousRealtime, leavesRealtime]);
		});
	};

	/*
	 * Send >10 presence updates, check they were all broadcast. Point of this is
	 * to check for a bug in the original 0.8 spec re presence membersmap
	 * comparisons.
	 */
	exports.presence_many_updates = function(test) {
		var client = helper.AblyRealtime({ clientId: testClientId });

		test.expect(1);
		var channel = client.channels.get('presence_many_updates'),
			presence = channel.presence,
			numUpdates = 0;

		channel.attach(function(err) {
			if(err) {
				test.ok(false, displayError(err));
				closeAndFinish(test, client);
			}
			presence.subscribe(function(presMsg) {
				numUpdates++;
			});

			async.timesSeries(15, function(i, cb) {
				presence.update(i.toString(), cb);
			}, function(err) {
				if(err) { test.ok(false, displayError(err)); }
				// Wait to make sure everything has been received
				setTimeout(function() {
					test.equal(numUpdates, 15, 'Check got all the results');
					client.close();
					test.done();
				}, 1000);
			});
		})
	};

	return module.exports = helper.withTimeout(exports);
});
