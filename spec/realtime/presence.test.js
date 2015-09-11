"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	var rest, realtime, authToken, authToken2;
	var testClientId = 'testclient', testClientId2 = 'testclient2';
	var presenceChannel;

	exports.setupauth = function(test) {
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

	/**
	 * Set up the prerequisites of the presence tests below.
	 *
	 * A generic (anonymous connection) is established which listens
	 * for events on the presence object for a given channel.
	 * Individual tests listen on this object from time to time.
	 *
	 * An authToken is created that is associated with a specific
	 * client id, which is used to send events on the presence channel.
	 * @param test
	 */
	exports.setuppresence = function(test) {
		var expects = 0;
		async.series(
			[
				function(cb) {
					test.expect(++expects);
					try {
						rest = helper.AblyRest();
						rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
							if(err) {
								test.ok(false, displayError(err));
								cb(err);
								return;
							}
							authToken = tokenDetails.id;
							test.equal(tokenDetails.clientId, testClientId, 'Verify client id');
							test.expect(++expects);
							rest.auth.requestToken({clientId:testClientId2}, function(err, tokenDetails) {
								if(err) {
									test.ok(false, displayError(err));
									cb(err);
									return;
								}
								authToken2 = tokenDetails.id;
								test.equal(tokenDetails.clientId, testClientId2, 'Verify client id (2)');
								cb(null);
							});
						});
					} catch(err) {
						test.ok(false, 'Test failed with exception: ' + err.stack);
						cb(err);
					}
				},
				function(cb) {
					test.expect(++expects);
					try {
						realtime = helper.AblyRealtime();
						realtime.connection.on('connected', function() {
							presenceChannel = realtime.channels.get('presence0');
							presenceChannel.attach(function(err) {
								if(err)
									test.ok(false, 'Attach failed with error: ' + err);
								else
									test.ok(true, 'Attach to channel 0 with no options');
								cb(err);
							});
						});
						monitorConnection(test, realtime);
					} catch(err) {
						test.ok(false, 'Test failed with exception: ' + err.stack);
						cb(err);
					}
				}
			], function() {
				test.done();
			}
		);
	};

	/*
	 * Attach to channel, enter presence channel with data and await entered event
	 */
	exports.enter0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(2);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Test client data (enter0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Enter presence channel without prior attach and await entered event
	 */
	exports.enter1 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(2);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.presence.enter('Test client data (enter1)', function(err) {
					if(err) {
						test.ok(false, 'Enter failed with error: ' + err);
						done();
						return;
					}
					test.ok(true, 'Presence event sent');
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter1 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Enter presence channel without prior connect and await entered event
	 */
	exports.enter2 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(2);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			/* get channel, attach, and enter */
			var clientChannel = clientRealtime.channels.get('presence0');
			clientChannel.presence.enter('Test client data (enter2)', function(err) {
				if(err) {
					test.ok(false, 'Enter failed with error: ' + err);
					done();
					return;
				}
				test.ok(true, 'Presence event sent');
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter2 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel (without waiting for attach callback), detach
	 * from channel immediately in 'attached' callback
	 */
	exports.enter3 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(4);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					test.ok(true, 'Attached');
					clientChannel.detach(function(err) {
						if(err) {
							test.ok(false, 'Detach failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Detached');
					});
				});
				clientChannel.presence.enter('Test client data (enter3)', function(err) {
					// Note: either an error (pending messages failed to send due to detach)
					//   or a success (pending messages were pushed out before the detach)
					//   is an acceptable result. Throwing an uncaught exception (the behaviour
					//   that we're testing for) isn't.
					if(err) {
						test.ok(true, 'Enter failed with error: ' + err);
						done();
						return;
					}
					test.ok(true, 'Presence event sent');
					/* done() is called in presence event handler */
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter3 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel with a callback but no data and await entered event
	 */
	exports.enter4 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(2);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter(function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter4 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel with neither callback nor data and await entered event
	 */
	exports.enter5 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(1);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter();
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter5 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel with data but no callback and await entered event
	 */
	exports.enter6 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(1);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				if(this.event == 'enter') {
					test.ok(true, 'Presence event received');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Test client data (enter6)');
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter6 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Enter presence channel (without attaching), detach, then enter again to reattach
	 */
	exports.enter7 = function(test) {
		var clientRealtime;
		try {
			test.expect(2);
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			var clientChannel = clientRealtime.channels.get('presenceEnter7');
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function(presenceMsg) {
				if(this.event == 'enter' && presenceMsg.data == 'second') {
					test.ok(true, 'Second presence event received');
					closeAndFinish(test, clientRealtime);
				}
			};
			clientRealtime.connection.once('connected', function() {
				clientChannel.presence.enter('first', function(err) {
					if(err) {
						test.ok(false, 'Enter failed with error: ' + err);
						closeAndFinish(test, clientRealtime);
						return;
					}
					test.ok(true, 'Entered presence first time');
					clientChannel.detach(function(err) {
						if(err) {
							test.ok(false, 'Detach failed with error: ' + err);
							closeAndFinish(test, clientRealtime);
							return;
						}
						clientChannel.presence.on(presenceHandler);
						clientChannel.presence.enter('second', function(err){
							if(err) {
								test.ok(false, 'Enter failed with error: ' + err);
								closeAndFinish(test, clientRealtime);
								return;
							}
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.enter3 failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	/*
	 * Attach to channel, enter+leave presence channel and await leave event
	 */
	exports.leave0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(4);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function(presenceMessage) {
				//console.log('Event received on presence channel: event = ' + this.event + ', clientId = ' + presenceMessage.clientId + ', clientData = ' + presenceMessage.clientData);
				if(this.event == 'leave') {
					test.ok(true, 'Leave event received');
					test.equal(presenceMessage.clientId, testClientId, 'Presence event received with clientId');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);
			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Test client data (leave0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
					clientChannel.presence.leave(function(err) {
						if(err) {
							test.ok(false, 'Leave failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.leave0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel, update data, and await update event
	 */
	exports.update0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		var newData = "New data";
		try {
			test.expect(5);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				var clientChannel = clientRealtime.channels.get('presenceUpdate0');

				/* listen for the enter event, test is complete when received */
				var presenceHandler = function(presenceMessage) {
					if(this.event == 'update') {
						test.ok(true, 'Update event received');
						test.equal(presenceMessage.clientId, testClientId, 'Check presence event has correct clientId');
						test.equal(presenceMessage.data, newData, 'Check presence event has correct data');
						done();
						clientChannel.presence.off(presenceHandler);
					}
				};
				clientChannel.presence.on(presenceHandler);

				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Original data', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
					clientChannel.presence.update(newData, function(err) {
						if(err) {
							test.ok(false, 'Update failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.update0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel and get presence
	 */
	exports.get0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(2);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function() {
				presenceChannel.presence.get(function(err, presenceMembers) {
					if(err) {
						test.ok(false, 'Presence get() failed with error: ' + err);
						done();
						return;
					}
					var testClientPresent = false;
					if(presenceMembers)
						for(var i = 0; i < presenceMembers.length; i++)
							if(presenceMembers[i].clientId == testClientId)
								testClientPresent = true;
					test.ok(testClientPresent, 'Expected test client in set of members');
					done();
					presenceChannel.presence.off(presenceHandler);
				});
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Test client data (get0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.get0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter+leave presence channel and get presence
	 */
	exports.get1 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(3);
			/* listen for the enter event, test is complete when received */
			var testClientData = 'Test client data (get1)';
			var presenceHandler = function() {
				if(this.event == 'leave') {
					presenceChannel.presence.get(function(err, presenceMembers) {
						if(err) {
							test.ok(false, 'Presence get() failed with error: ' + err);
							done();
							return;
						}
						//console.log(require('util').inspect(presenceMembers));
						var testClientPresent = false;
						if(presenceMembers) {
							for(var i = 0; i < presenceMembers.length; i++)
								if(presenceMembers[i].clientId == testClientId && presenceMembers[i].clientData == testClientData)
									testClientPresent = true;
						}
						test.ok(!testClientPresent, 'Expected test client to be absent from set of members');
						done();
						presenceChannel.presence.off(presenceHandler);

					});
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter(testClientData, function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence enter event sent');
						clientChannel.presence.leave(function(err) {
							if(err) {
								test.ok(false, 'Enter failed with error: ' + err);
								done();
								return;
							}
							test.ok(true, 'Presence leave event sent');
						});
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.get1 failed with exception: ' + e.stack);
			done();
		}
	};

 /*
	 * Attach to channel, enter+leave presence, detatch again, and get presence history
	 */
	exports.history0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(4);
			/* listen for the enter event, test is complete when received */
			var testClientData = 'Test client data (history0)';
			var queryPresenceHistory = function(channel) {
				channel.presence.history(function(err, resultPage) {
					if(err) {
						test.ok(false, displayError(err));
						done();
						return;
					}

					var presenceMessages = resultPage.items;
					test.equal(presenceMessages.length, 2, 'Verify correct number of presence messages found');
					var actions = presenceMessages.map(function(msg){return msg.action}).sort();
					test.deepEqual(actions, [2,3], 'Verify presenceMessages have correct actions');
					test.equal(presenceMessages[0].data, testClientData, 'Verify first presenceMessages has correct data');
					test.equal(presenceMessages[1].data, testClientData, 'Verify second presenceMessages has correct data');
					done();
				});
			};

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presenceHistory0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter(testClientData, function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						clientChannel.presence.leave(function(err) {
							if(err) {
								test.ok(false, 'Enter failed with error: ' + err);
								done();
								return;
							}
							clientChannel.detach(function(err) {
								if(err) {
									test.ok(false, 'Attach failed with error: ' + err);
									done();
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
			done();
		}
	};

	exports.history_until_attach = function(test) {
		var clientRealtime = helper.AblyRealtime({clientId: testClientId});
		var clientChannel = clientRealtime.channels.get('presenceHistoryUntilAttach');
		var testClientData = 'Test client data (history0)';
		var done = function() {
			test.done(); clientRealtime.close();
		};
		var attachEnterAndLeave = function(callback) {
			clientChannel.attach(function(err) {
				if(err) {
					test.ok(false, 'Attach failed with error: ' + err);
					done();
					return;
				}
				clientChannel.presence.enter(testClientData, function(err) {
					if(err) {
						test.ok(false, 'Enter failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.leave(function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
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

		test.expect(6);

		try {
			clientRealtime.connection.on('connected', function() {
				/* Attach, enter, leave, then detach. Then attach, enter, and
				 * leave, but stay attached. Then query presence history with
				 * untilAttach both true, false, and not present, checking that
				 * the right presence messages are returned in each case */
				attachEnterAndLeave(function() {
					clientChannel.detach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							done();
							return;
						}
						attachEnterAndLeave(function() {
							async.parallel(tests, function(err){
								if(err) {
									test.ok(false, displayError(err));
									done();
									return;
								}
								done();
							});
						});
					});
				});
			});
			var exitOnState = function(state) {
				clientRealtime.connection.on(state, function () {
					test.ok(false, 'connection to server failed');
					done();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'presence.history_until_attach failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel, then initiate second
	 * connection, seeing existing member in message subsequent to second attach response
	 */
	exports.attach0 = function(test) {
		var clientRealtime1, clientRealtime2;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, [clientRealtime1, clientRealtime2]);
				}, 3000);
			}
		};
		try {
			test.expect(3);
			/* set up authenticated connection */
			clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime1.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel1 = clientRealtime1.channels.get('presence1');
				clientChannel1.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel1.presence.enter('Test client data (attach0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
						clientChannel1.presence.get(function(err, presenceMembers1) {
							if(err) {
								test.ok(false, 'Presence get() failed with error: ' + err);
								done();
								return;
							}
							test.equal(presenceMembers1.length, 1, 'Member present');
							/* now set up second connection and attach */
							/* set up authenticated connection */
							clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, authToken: authToken2 });
							clientRealtime2.connection.on('connected', function() {
								/* get channel, attach */
								var clientChannel2 = clientRealtime2.channels.get('presence1');
								clientChannel2.attach(function(err) {
									if(err) {
										test.ok(false, 'Attach failed with error: ' + err);
										done();
										return;
									}
									clientChannel2.presence.on('present', function() {
										/* get the channel members and verify testclient is there */
										clientChannel2.presence.get(function(err, presenceMembers2) {
											if(err) {
												test.ok(false, 'Presence get() failed with error: ' + err);
												done();
												return;
											}
											test.deepEqual(presenceMembers1, presenceMembers2, 'Verify member presence is indicated after attach');
											done();
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
			test.ok(false, 'presence.attach0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach and enter channel on two connections, seeing
	 * both members in presence set
	 */
	exports.member0 = function(test) {
		var clientRealtime1, clientRealtime2, clientChannel1, clientChannel2;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, [clientRealtime1, clientRealtime2]);
				}, 3000);
			}
		};
		try {
			test.expect(4);
			/* set up authenticated connections */
			async.parallel([
				function(cb1) {
					var data = 'Test client data (member0-1)';
					clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
					clientRealtime1.connection.on('connected', function() {
						/* get channel, attach, and enter */
						clientChannel1 = clientRealtime1.channels.get('presence2');
						clientChannel1.attach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								cb1(err);
								return;
							}
							clientChannel1.presence.on('enter', function(presenceEvent){
								if(presenceEvent.data == data)
									cb1();
							});
							clientChannel1.presence.enter(data, function(err) {
								if(err) {
									test.ok(false, 'Enter failed with error: ' + err);
									cb1(err);
									return;
								}
								test.ok(true, 'Presence event sent');
							});
						});
					});
					monitorConnection(test, clientRealtime1);
				},
				function(cb2) {
					var data = 'Test client data (member0-2)';
					clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, authToken: authToken2 });
					clientRealtime2.connection.on('connected', function() {
						/* get channel, attach */
						clientChannel2 = clientRealtime2.channels.get('presence2');
						clientChannel2.attach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								cb2(err);
								return;
							}
							clientChannel2.presence.on('enter', function(presenceEvent){
								if(presenceEvent.data == data)
									cb2();
							});
							clientChannel2.presence.enter(data, function(err) {
								if(err) {
									test.ok(false, 'Enter failed with error: ' + err);
									cb2(err);
									return;
								}
								test.ok(true, 'Presence event sent');
							});
						});
					});
					monitorConnection(test, clientRealtime2);
				}
			], function() {
				clientChannel2.presence.get(function(err, members) {
					if(err) {
						test.ok(false, 'Presence.get() failed with error: ' + err);
						done();
						return;
					}
					test.equal(members.length, 2, 'Verify both members present');
					test.notEqual(members[0].connectionId, members[1].connectionId, 'Verify members have distinct connectionIds');
					done();
				});
			});
		} catch(e) {
			test.ok(false, 'presence.member0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Attach to channel, enter presence channel, disconnect and await leave event
	 */
	exports.connection0 = function(test) {
		var clientRealtime;
		var isDone = false, done = function() {
			if(!isDone) {
				isDone = true;
				setTimeout(function() {
					closeAndFinish(test, clientRealtime);
				}, 3000);
			}
		};
		try {
			test.expect(3);
			/* listen for the enter event, test is complete when received */
			var presenceHandler = function(presenceMessage) {
				//console.log('Event received on presence channel: event = ' + this.event + ', clientId = ' + presenceMessage.clientId + ', clientData = ' + presenceMessage.clientData);
				if(this.event == 'leave') {
					test.ok(true, 'Leave event received');
					test.equal(presenceMessage.clientId, testClientId, 'Presence event received with clientId');
					done();
					presenceChannel.presence.off(presenceHandler);
				}
			};
			presenceChannel.presence.on(presenceHandler);

			/* set up authenticated connection */
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			clientRealtime.connection.on('connected', function() {
				/* get channel, attach, and enter */
				var clientChannel = clientRealtime.channels.get('presence0');
				clientChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						done();
						return;
					}
					clientChannel.presence.enter('Test client data (connection0)', function(err) {
						if(err) {
							test.ok(false, 'Enter failed with error: ' + err);
							done();
							return;
						}
						test.ok(true, 'Presence event sent');
						setTimeout(function() {
							/* once enter event is confirmed as having been
							 * delivered, close the connection */
													clientRealtime.close();
						}, 1000);
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			console.log('presence.leave0 failed with exception: ' + e.stack);
			test.ok(false, 'presence.leave0 failed with exception: ' + e.stack);
			done();
		}
	};

	/*
	 * Enter presence channel (without attaching), close the connection,
	 * reconnect, then enter again to reattach
	 */
	exports.connection1 = function(test) {
		var clientRealtime;
		try {
			test.expect(2);
			clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken });
			var clientChannel = clientRealtime.channels.get('presenceConnection1');
			var presenceHandler = function(presenceMsg) {
				if(this.event == 'enter' && presenceMsg.data == 'second') {
					test.ok(true, 'Second presence event received');
					closeAndFinish(test, clientRealtime);
				}
			};
			clientRealtime.connection.once('connected', function() {
				/* get channel and enter (should automatically attach) */
				clientChannel.presence.enter('first', function(err) {
					if(err) {
						test.ok(false, 'Enter failed with error: ' + err);
						closeAndFinish(test, clientRealtime);
						return;
					}
					test.ok(true, 'Entered presence first time');
					clientRealtime.close();
					clientRealtime.connection.once('closed', function() {
						clientRealtime.connection.once('connected', function(){
							//Should automatically reattach
							clientChannel.presence.on(presenceHandler);
							clientChannel.presence.enter('second', function(err){
								if(err) {
									test.ok(false, 'Enter failed with error: ' + err);
									closeAndFinish(test, clientRealtime);
									return;
								}
							});
						});
						clientRealtime.connection.connect();
					});
				});
			});
			monitorConnection(test, clientRealtime);
		} catch(e) {
			test.ok(false, 'presence.connection1 failed with exception: ' + e.stack);
			closeAndFinish(test, clientRealtime);
		}
	};

	exports.clear99 = function(test) {
		/* delay before closing, to allow final tests to see events on connections */
		setTimeout(function() {
			closeAndFinish(test, realtime);
		}, 3000);
	};

	return module.exports = helper.withTimeout(exports);
});
