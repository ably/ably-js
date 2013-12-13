"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;

	/**
	 * Empty resume case, json transport
	 * Send 5 messages; disconnect; reconnect; send 5 messages
	 */
	rExports.resume0 = function(test) {
		var count = 5;
		var timer;

		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(3);

		var rxChannel = rxRealtime.channels.get('resume0');
		var txChannel = txRealtime.channels.get('resume0');
		var rxCount = 0;

		var lastActiveRxTransport;
		rxRealtime.connection.connectionManager.on('transport.active', function(transport) {
			lastActiveRxTransport = transport;
		});

		function phase1(callback) {
			/* subscribe to event */
			rxChannel.subscribe('event0', function(msg) {
				console.log('received message; serial = ' + msg.connectionSerial);
				++rxCount;
			});
			var txCount = 0;
			function ph1TxOnce() {
				console.log('sending (phase 1): ' + txCount);
				txChannel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
					console.log('publish callback called; err = ' + err);
				});
				if(++txCount == count) {
					/* sent all messages */
					setTimeout(function() {
						test.equal(rxCount, count, 'Verify Phase 1 messages all received');
						callback(null);
					}, 5000);
					return;
				}
				setTimeout(ph1TxOnce, 1000);
			}
			ph1TxOnce();
		}

		function phase2(callback) {
			/* disconnect the transport
			 * NOTE: this uses knowledge of the internal operation
			 * of the client library to simulate a dropped connection
			 * without explicitly closing the connection */
			lastActiveRxTransport.dispose();
			/* continue in 5 seconds */
			setTimeout(callback, 5000);
		}

		function phase3(callback) {
			/* re-open the connection, verify resume mode */
			rxRealtime.connection.connect();
			var connectionManager = rxRealtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
				callback(null);
			});
		}

		function phase4(callback) {
			/* subscribe to event */
			rxCount = 0;
			var txCount = 0
			function ph4TxOnce() {
				console.log('sending (phase 4): ' + txCount);
				txChannel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
					console.log('publish callback called; err = ' + err);
				});
				if(++txCount == count) {
					/* sent all messages */
					setTimeout(function() {
						test.equal(rxCount, count, 'Verify Phase 4 messages all received');
						callback(null);
					}, 5000);
					return;
				}
				setTimeout(ph4TxOnce, 1000);
			}
			ph4TxOnce();
		}

		phase1(function(err) {
			if(err) {
				test.ok(false, 'Phase 1 failed with err: ' + err);
				test.done();
				return;
			}
			phase2(function(err) {
				if(err) {
					test.ok(false, 'Phase 2 failed with err: ' + err);
					test.done();
					return;
				}
				phase3(function(err) {
					if(err) {
						test.ok(false, 'Phase 3 failed with err: ' + err);
						test.done();
						return;
					}
					phase4(function(err) {
						if(err) {
							test.ok(false, 'Phase 4 failed with err: ' + err);
							return;
						}
						rxRealtime.close();
						txRealtime.close();
						test.done();
					});
				});
			});
		});
	};

	/**
	 * Simple resume case, json transport
	 * Send 5 messages; disconnect; send 5 messages; reconnect
	 */
	rExports.resume1 = function(test) {
		var count = 5;
		var timer;

		var txRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		var rxRealtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(3);

		var rxChannel = rxRealtime.channels.get('resume1');
		var txChannel = txRealtime.channels.get('resume1');
		var rxCount = 0;

		var lastActiveRxTransport;
		rxRealtime.connection.connectionManager.on('transport.active', function(transport) {
			lastActiveRxTransport = transport;
		});

		function phase1(callback) {
			/* subscribe to event */
			rxChannel.subscribe('event0', function(msg) {
				console.log('received message; serial = ' + msg.connectionSerial);
				++rxCount;
			});
			var txCount = 0
			function ph1TxOnce() {
				console.log('sending (phase 1): ' + txCount);
				txChannel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
					//console.log('publish callback called');
				});
				if(++txCount == count) {
					/* sent all messages */
					setTimeout(function() {
						test.equal(rxCount, count, 'Verify Phase 1 messages all received ('+rxCount+', '+count+')');
						callback(null);
					}, 5000);
					return;
				}
				setTimeout(ph1TxOnce, 800);
			}
			ph1TxOnce();
		}

		function phase2(callback) {
			/* disconnect the transport and send 5 more messages
			 * NOTE: this uses knowledge of the internal operation
			 * of the client library to simulate a dropped connection
			 * without explicitly closing the connection */
			lastActiveRxTransport.dispose();
			var txCount = 0

			function ph2TxOnce() {
				console.log('sending (phase 2): ' + txCount);
				txChannel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
					//console.log('publish callback called');
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
			/* re-open the connection, verify resume mode */
			rxCount = 0;
			rxRealtime.connection.connect();
			var connectionManager = rxRealtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
				setTimeout(function() {
					test.equal(rxCount, count, 'Verify Phase 2 messages all received');
					callback(null);
				}, 5000);
			});
		}

		phase1(function(err) {
			if(err) {
				test.ok(false, 'Phase 1 failed with err: ' + err);
				test.done();
				return;
			}
			phase2(function(err) {
				if(err) {
					test.ok(false, 'Phase 2 failed with err: ' + err);
					test.done();
					return;
				}
				phase3(function(err) {
					if(err) {
						test.ok(false, 'Phase 3 failed with err: ' + err);
						test.done();
						return;
					}
					rxRealtime.close();
					txRealtime.close();
					test.done();
				});
			});
		});
	};

	return rExports;
};
