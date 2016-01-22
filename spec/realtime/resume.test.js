"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
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
	}});

	/**
	 * Simple resume case
	 * Send 5 messages; disconnect; send 5 messages; reconnect
	 */
	function resume_active(test, channelName, txOpts, rxOpts) {
		var count = 5;

		var txRest = helper.AblyRest(mixin(txOpts));
		var rxRealtime = helper.AblyRealtime(mixin(rxOpts));
		test.expect(3);

		var rxChannel = rxRealtime.channels.get('resume1');
		var txChannel = txRest.channels.get('resume1');
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
	}});

	return module.exports = helper.withTimeout(exports, 120000); // allow 2 minutes for some of the longer phased tests
});
