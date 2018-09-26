"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		closeAndFinish = helper.closeAndFinish,
		displayError = helper.displayError,
		monitorConnection = helper.monitorConnection,
		simulateDroppedConnection = helper.simulateDroppedConnection,
		testOnAllTransports = helper.testOnAllTransports,
		bestTransport = helper.bestTransport;

	exports.setupResume = function(test) {
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

	function mixin(target, src) {
		for(var prop in src)
			target[prop] = src[prop];
		return target;
	}

	function sendAndAwait(message, sendingChannel, receivingChannel, callback) {
		var event = String(Math.random());
		receivingChannel.subscribe(event, function(msg) {
			console.log('received ' + msg.data + ' at ' + (new Date()).toString());
			receivingChannel.unsubscribe(event);
			callback();
		});
		console.log('sending ' + message + ' at ' + (new Date()).toString());
		sendingChannel.publish(event, message, function(err) {
			if(err) callback(err);
		});
	}

	/**
	 * Empty resume case
	 * Send 5 messages; disconnect; reconnect; send 5 messages
	 */
	function resume_inactive(test, channelName, txOpts, rxOpts) {
		var count = 5;

		var txRest = helper.AblyRest(mixin(txOpts));
		var rxRealtime = helper.AblyRealtime(mixin(rxOpts));
		test.expect(3);

		var rxChannel = rxRealtime.channels.get(channelName);
		var txChannel = txRest.channels.get(channelName);
		var rxCount = 0;

		function phase0(callback) {
			rxChannel.attach(callback);
		}

		function phase1(callback) {
			function ph1TxOnce() {
				sendAndAwait('phase 1, message ' + rxCount, txChannel, rxChannel, function(err) {
					if(err) callback(err);
					if(++rxCount == count) {
						console.log("phase 1 sent all messages, time: ", (new Date()).toString())
						test.ok(true, "phase 1: sent and received all messages")
						callback(null);
						return;
					}
					setTimeout(ph1TxOnce, 800);
				})
			}
			ph1TxOnce();
		}

		function phase2(callback) {
			console.log("starting phase 2, time: ", (new Date()).toString())
			simulateDroppedConnection(rxRealtime);
			/* continue in 5 seconds */
			setTimeout(callback, 5000);
		}

		function phase3(callback) {
			console.log("starting phase 3, time: ", (new Date()).toString())
			/* re-open the connection, verify resume mode */
			rxRealtime.connection.connect();
			var connectionManager = rxRealtime.connection.connectionManager;
			connectionManager.once('transport.active', function(transport) {
				test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
				callback(null);
			});
		}

		function phase4(callback) {
			console.log("starting phase 4, time: ", (new Date()).toString())
			rxCount = 0;
			function ph4TxOnce() {
				sendAndAwait('phase 4, message ' + rxCount, txChannel, rxChannel, function(err) {
					if(err) callback(err);
					if(++rxCount == count) {
						console.log("phase 4 sent all messages, time: ", (new Date()).toString())
						test.ok(true, "phase 4: sent and received all messages")
						callback(null);
						return;
					}
					setTimeout(ph4TxOnce, 800);
				})
			}
			ph4TxOnce();
		}

		phase0(function(err) {
			if(err) {
				test.ok(false, 'Phase 1 failed with err: ' + displayError(err));
				test.done();
				return;
			}
			phase1(function(err) {
				if(err) {
					test.ok(false, 'Phase 1 failed with err: ' + displayError(err));
					test.done();
					return;
				}
				phase2(function(err) {
					if(err) {
						test.ok(false, 'Phase 2 failed with err: ' + displayError(err));
						test.done();
						return;
					}
					phase3(function(err) {
						if(err) {
							test.ok(false, 'Phase 3 failed with err: ' + displayError(err));
							test.done();
							return;
						}
						phase4(function(err) {
							if(err) {
								test.ok(false, 'Phase 4 failed with err: ' + displayError(err));
								return;
							}
							closeAndFinish(test, rxRealtime);
						});
					});
				});
			});
		});
	}

	testOnAllTransports(exports, 'resume_inactive', function(realtimeOpts) { return function(test) {
		resume_inactive(test, 'resume_inactive' + String(Math.random()), {}, realtimeOpts);
	}}, /* excludeUpgrade: */ true);

	/**
	 * Simple resume case
	 * Send 5 messages; disconnect; send 5 messages; reconnect
	 */
	function resume_active(test, channelName, txOpts, rxOpts) {
		var count = 5;

		var txRest = helper.AblyRest(mixin(txOpts));
		var rxRealtime = helper.AblyRealtime(mixin(rxOpts));
		test.expect(3);

		var rxChannel = rxRealtime.channels.get(channelName);
		var txChannel = txRest.channels.get(channelName);
		var rxCount = 0;

		function phase0(callback) {
			rxChannel.attach(callback);
		}

		function phase1(callback) {
			function ph1TxOnce() {
				sendAndAwait('phase 1, message ' + rxCount, txChannel, rxChannel, function(err) {
					if(err) callback(err);
					if(++rxCount == count) {
						console.log("phase 1 sent all messages, time: ", (new Date()).toString())
						test.ok(true, "phase 1: sent and received all messages")
						callback(null);
						return;
					}
					setTimeout(ph1TxOnce, 800);
				})
			}
			ph1TxOnce();
		}

		function phase2(callback) {
			/* disconnect the transport and send 5 more messages
			 * NOTE: this uses knowledge of the internal operation
			 * of the client library to simulate a dropped connection
			 * without explicitly closing the connection */
			simulateDroppedConnection(rxRealtime);
			var txCount = 0;

			function ph2TxOnce() {
				console.log('sending (phase 2): ' + txCount);
				txChannel.publish('sentWhileDisconnected', 'phase 2, message ' + txCount, function(err) {
					if(err) callback(err);
				});
				if(++txCount == count) {
					/* sent all messages */
					setTimeout(function() { callback(null); }, 1000);
					return;
				}
				setTimeout(ph2TxOnce, 1000);
			}

			setTimeout(ph2TxOnce, 800);
		}

		function phase3(callback) {
			/* subscribe, re-open the connection, verify resume mode */
			rxChannel.subscribe('sentWhileDisconnected', function(msg) {
				console.log('received ' + msg.data + ' at ' + (new Date()).toString());
				++rxCount;
			});
			rxCount = 0;
			rxRealtime.connection.connect();
			var connectionManager = rxRealtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
				setTimeout(function() {
					test.equal(rxCount, count, 'Verify Phase 3 messages all received');
					callback(null);
				}, 2000);
			});
		}

		phase0(function(err) {
			if(err) {
				test.ok(false, 'Phase 1 failed with err: ' + displayError(err));
				closeAndFinish(test, rxRealtime);
				return;
			}
			phase1(function(err) {
				if(err) {
					test.ok(false, 'Phase 1 failed with err: ' + displayError(err));
					closeAndFinish(test, rxRealtime);
					return;
				}
				phase2(function(err) {
					if(err) {
						test.ok(false, 'Phase 2 failed with err: ' + displayError(err));
						closeAndFinish(test, rxRealtime);
						return;
					}
					phase3(function(err) {
						if(err) {
							test.ok(false, 'Phase 3 failed with err: ' + displayError(err));
							closeAndFinish(test, rxRealtime);
							return;
						}
						closeAndFinish(test, rxRealtime);
					});
				});
			});
		});
	}

	testOnAllTransports(exports, 'resume_active', function(realtimeOpts) { return function(test) {
		resume_active(test, 'resume_active' + String(Math.random()), {}, realtimeOpts);
	}}, /* excludeUpgrade: */ true);


	/* RTN15c3
	 * Resume with loss of continuity
	 */
	testOnAllTransports(exports, 'resume_lost_continuity', function(realtimeOpts) { return function(test) {
		var realtime = helper.AblyRealtime(realtimeOpts),
			connection = realtime.connection,
			attachedChannelName = 'resume_lost_continuity_attached',
			suspendedChannelName = 'resume_lost_continuity_suspended',
			attachedChannel = realtime.channels.get(attachedChannelName),
			suspendedChannel = realtime.channels.get(suspendedChannelName);

		test.expect(6);
		async.series([
			function(cb) {
				connection.once('connected', function() { cb(); });
			},
			function(cb) {
				suspendedChannel.state = 'suspended';
				attachedChannel.attach(cb);
			},
			function(cb) {
				/* Sabotage the resume */
				connection.connectionManager.connectionKey = '_____!ablyjs_test_fake-key____',
				connection.connectionManager.connectionId = 'ablyjs_tes';
				connection.connectionManager.connectionSerial = 17;
				connection.connectionManager.msgSerial = 15;
				connection.once('disconnected', function() { cb(); });
				connection.connectionManager.disconnectAllTransports();
			},
			function(cb) {
				connection.once('connected', function(stateChange) {
					test.equal(stateChange.reason && stateChange.reason.code, 80008, 'Unable to recover connection correctly set in the stateChange');
					test.equal(attachedChannel.state, 'attaching', 'Attached channel went into attaching');
					test.equal(suspendedChannel.state, 'attaching', 'Suspended channel went into attaching');
					test.equal(connection.connectionManager.msgSerial, 0, 'Check msgSerial is reset to 0');
					test.equal(connection.connectionManager.connectionSerial, -1, 'Check connectionSerial is reset by the new CONNECTED');
					test.ok(connection.connectionManager.connectionId !== 'ablyjs_tes', 'Check connectionId is set by the new CONNECTED');
					cb();
				});
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	}}, true /* Use a fixed transport as attaches are resent when the transport changes */);

	/* RTN15c5
	 * Resume with token error
	 */
	testOnAllTransports(exports, 'resume_token_error', function(realtimeOpts) { return function(test) {
		var realtime = helper.AblyRealtime(mixin(realtimeOpts, {useTokenAuth: true})),
			badtoken,
			connection = realtime.connection;

		test.expect(2);
		async.series([
			function(cb) {
				connection.once('connected', function() { cb(); });
			},
			function(cb) {
				realtime.auth.requestToken({ttl: 1}, null, function(err, token) {
					badtoken = token;
					cb(err);
				})
			},
			function(cb) {
				/* Sabotage the resume - use a valid but now-expired token */
				realtime.auth.tokenDetails.token = badtoken.token
				connection.once(function(stateChange) {
					test.ok(stateChange.current, 'disconnected', 'check connection disconnects first');
					cb();
				});
				connection.connectionManager.disconnectAllTransports();
			},
			function(cb) {
				connection.once('connected', function(stateChange) {
					test.ok(true, 'successfully reconnected after getting a new token');
					cb();
				});
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	}}, true);

	/* RTN15c4
	 * Resume with fatal error
	 */
	testOnAllTransports(exports, 'resume_fatal_error', function(realtimeOpts) { return function(test) {
		var realtime = helper.AblyRealtime(realtimeOpts),
			connection = realtime.connection;

		test.expect(3);
		async.series([
			function(cb) {
				connection.once('connected', function() { cb(); });
			},
			function(cb) {
				var keyName = realtime.auth.key.split(':')[0];
				realtime.auth.key = keyName+ ':wrong';
				connection.once(function(stateChange) {
					test.ok(stateChange.current, 'disconnected', 'check connection disconnects first');
					cb();
				});
				connection.connectionManager.disconnectAllTransports();
			},
			function(cb) {
				connection.once('failed', function(stateChange) {
					test.ok(true, 'check connection failed');
					test.equal(stateChange.reason.code, 40101, 'check correct code propogated');
					cb();
				});
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	}}, true);

	/* RTL2f
	 * Check channel resumed flag
	 * TODO: enable once realtime supports this
	 */
	exports.channel_resumed_flag = function(test) {
		var realtime = helper.AblyRealtime(),
			realtimeTwo,
			recoveryKey,
			connection = realtime.connection,
			channelName = 'channel_resumed_flag',
			channel = realtime.channels.get(channelName);

		test.expect(2);
		async.series([
			function(cb) {
				connection.once('connected', function() { cb(); });
			},
			function(cb) {
				channel.attach();
				channel.once('attached', function(stateChange) {
					test.equal(stateChange.resumed, false, 'Check channel not resumed when first attached');
					recoveryKey = connection.recoveryKey;
					cb();
				});
			},
			function(cb) {
				helper.becomeSuspended(realtime, cb);
			},
			function(cb) {
				realtimeTwo = helper.AblyRealtime({recover: recoveryKey});
				realtimeTwo.connection.once('connected', function(stateChange) {
					if(stateChange.reason) {
						test.ok(false, 'Error while recovering: ' + JSON.stringify(stateChange.reason));
					}
					cb();
				});
			},
			function(cb) {
				var channelTwo = realtimeTwo.channels.get(channelName);
				channelTwo.attach();
				channelTwo.once('attached', function(stateChange) {
					test.equal(stateChange.resumed, true, 'Check resumed flag is true');
					cb();
				});
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, [realtime, realtimeTwo]);
		});
	};

	/*
	 * Check the library doesn't try to resume once the connectionStateTtl has expired
	 */
	exports.no_resume_once_suspended = function(test) {
		var realtime = helper.AblyRealtime(),
			connection = realtime.connection,
			channelName = 'no_resume_once_suspended';

		test.expect(1);
		async.series([
			function(cb) {
				connection.once('connected', function() { cb(); });
			},
			function(cb) {
				helper.becomeSuspended(realtime, cb);
			},
			function(cb) {
				realtime.connection.connectionManager.tryATransport = function(transportParams) {
					test.equal(transportParams.mode, 'clean', 'Check library didn’t try to resume');
					cb();
				};
				connection.connect();
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			closeAndFinish(test, realtime);
		});
	};

	/*
	 * Check the library doesn't try to resume if the last known activity on the
	 * connection was > connectionStateTtl ago
	 */
	exports.no_resume_last_activity = function(test) {
		/* Specify a best transport so that upgrade activity doesn't reset the last activity timer */
		var realtime = helper.AblyRealtime({transports: [bestTransport]}),
			connection = realtime.connection,
			connectionManager = connection.connectionManager

		test.expect(1);
		connection.once('connected', function() {
			connectionManager.lastActivity = helper.Utils.now() - 10000000
			/* noop-out onProtocolMessage so that a DISCONNECTED message doesn't
			 * reset the last activity timer */
			connectionManager.activeProtocol.getTransport().onProtocolMessage = function(){};
			connectionManager.tryATransport = function(transportParams) {
				test.equal(transportParams.mode, 'clean', 'Check library didn’t try to resume');
				closeAndFinish(test, realtime);
			};
			connectionManager.disconnectAllTransports();
		});
	};

	return module.exports = helper.withTimeout(exports, 120000); // allow 2 minutes for some of the longer phased tests
});
