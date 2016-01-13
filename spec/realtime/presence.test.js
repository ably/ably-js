"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {}, _exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

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
			test.expect(3);
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
							test.equal(err.code, 40400);
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
			var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
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
						test.ok(clientChannel2.presence.syncComplete(), 'Verify sync complete');
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
		test.expect(4);
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
				var actions = presenceMessages.map(function(msg){return msg.action;}).sort();
				test.deepEqual(actions, [2,3], 'Verify presenceMessages have correct actions');
				test.equal(presenceMessages[0].data, testClientData, 'Verify first presenceMessages has correct data');
				test.equal(presenceMessages[1].data, testClientData, 'Verify second presenceMessages has correct data');
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
			return presenceMessages.map(function(msg){
				return msg.action;
			}).sort();
		};
		var tests = [
			function(callback) {
				clientChannel.presence.history({untilAttach: false}, function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 4, 'Verify both sets of presence messages returned when untilAttached is false');
					test.deepEqual(sortedActions(resultPage.items), [2,2,3,3], 'Verify presenceMessages have correct actions');
					callback();
				});
			},
			function(callback) {
				clientChannel.presence.history({untilAttach: true}, function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 2, 'Verify only the first set of presence messages returned when untilAttached is true');
					test.deepEqual(sortedActions(resultPage.items), [2,3], 'Verify presenceMessages have correct actions');
					callback();
				});
			},
			function(callback) {
				clientChannel.presence.history(function(err, resultPage) {
					if(err) { callback(err); }
					test.equal(resultPage.items.length, 4, 'Verify both sets of presence messages returned when untilAttached is not present');
					test.deepEqual(sortedActions(resultPage.items), [2,2,3,3], 'Verify presenceMessages have correct actions');
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
					test.equal(err.statusCode, 408, 'presence enter failed with correct statusCode');
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
	 * Check that JSON-encodable presence messages are encoded correctly
	 */
	exports.presenceJsonEncoding = function(test) {
		test.expect(3);
		var data = {'foo': 'bar'},
			encodedData = JSON.stringify(data);

		var realtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });

		realtime.connection.once('connected', function() {
			var transport = realtime.connection.connectionManager.activeProtocol.transport,
					originalSend = transport.send;

			transport.send = function(message) {
				if(message.action === 14) {
					var presence = message.presence[0];
					console.log(JSON.stringify(presence))
					test.equal(presence.action, 2, 'Enter action');
					test.equal(presence.data, encodedData, 'Correctly encoded data');
					test.equal(presence.encoding, 'json', 'Correct encoding');
					closeAndFinish(test, realtime);
				}
				originalSend.apply(transport, arguments);
			};

			var channel = realtime.channels.get('presence-json-encoding');
			channel.presence.enter(data);
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
			realtime.connection.on('connected', function() {
				test.equal(realtime.auth.clientId, testClientId);
				var channel = realtime.channels.get(channelName);
				channel.presence.enter("test data", function(err) {
					cb(err, realtime);
				});
			});
			monitorConnection(test, realtime);
		}

		runTestWithEventListener(test, channelName, listenerFor('enter', testClientId), enterInheritedClientId);
	};

	return module.exports = helper.withTimeout(exports);
});
