"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};

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

	function isTransportAvailable(transport) {
		return (transport in Ably.Realtime.ConnectionManager.supportedTransports);
	}

	function realtimeConnection(transports) {
		var options = {};
		if (transports) options.transports = transports;
		return helper.AblyRealtime(options);
	}

	function failWithin(timeInSeconds, test, ably, description) {
		var timeout = setTimeout(function () {
			test.ok(false, 'Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)');
			test.done();
			ably.close();
		}, timeInSeconds * 1000);

		return {
			stop: function () {
				clearTimeout(timeout);
			}
		};
	}

	function connectionWithTransport(test, transport) {
		test.expect(1);
		try {
			var ably = realtimeConnection(transport && [transport]),
				connectionTimeout = failWithin(10, test, ably, 'connect');
			ably.connection.on('connected', function () {
				connectionTimeout.stop();
				test.ok(true, 'Verify ' + transport + ' connection with key');
				test.done();
				ably.close();
			});
			var exitOnState = function(state) {
				ably.connection.on(state, function () {
					connectionTimeout.stop();
					test.ok(false, transport + ' connection to server failed');
					test.done();
					ably.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch (e) {
			test.ok(false, 'Init ' + transport + ' connection failed with exception: ' + e);
			test.done();
			connectionTimeout.stop();
		}
	}

	function heartbeatWithTransport(test, transport) {
		test.expect(1);
		try {
			var ably = realtimeConnection(transport && [transport]),
				connectionTimeout = failWithin(10, test, ably, 'connect'),
				heartbeatTimeout;

			ably.connection.on('connected', function () {
				connectionTimeout.stop();
				heartbeatTimeout = failWithin(25, test, ably, 'wait for heartbeat');
				ably.connection.ping(function(err) {
					heartbeatTimeout.stop();
					test.ok(!err, 'verify ' + transport + ' heartbeat');
					test.done();
					ably.close();
				});
			});
			var exitOnState = function(state) {
				ably.connection.on(state, function () {
					connectionTimeout.stop();
					test.ok(false, transport + ' connection to server failed');
					test.done();
					ably.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch (e) {
			test.ok(false, transport + ' connect with key failed with exception: ' + e.stack);
			test.done();
			connectionTimeout.stop();
			if (heartbeatTimeout) heartbeatTimeout.stop();
		}
	}

	function publishWithTransport(test, transport) {
		var count = 5;
		var sentCount = 0, receivedCount = 0, sentCbCount = 0;
		var timer;
		var checkFinish = function () {
			if ((receivedCount === count) && (sentCbCount === count)) {
				receiveMessagesTimeout.stop();
				test.done();
				ably.close();
			}
		};
		var ably = realtimeConnection(transport && [transport]),
			connectionTimeout = failWithin(5, test, ably, 'connect'),
			receiveMessagesTimeout;

		ably.connection.on('connected', function () {
			connectionTimeout.stop();
			receiveMessagesTimeout = failWithin(15, test, ably, 'wait for published messages to be received');

			timer = setInterval(function () {
				console.log('sending: ' + sentCount++);
				channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
					console.log(transport + ' publish callback called; err = ' + err);
					sentCbCount++;
					checkFinish();
				});
				if (sentCount === count) clearInterval(timer);
			}, 500);
		});

		test.expect(count);
		var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
		/* subscribe to event */
		channel.subscribe('event0', function () {
			test.ok(true, 'Received event0');
			console.log(transport + 'event received');
			receivedCount++;
			checkFinish();
		});
	}

	exports.simpleInitBase0 = function (test) {
		test.expect(1);
		try {
			var timeout,
				ably = realtimeConnection();

			ably.connection.on('connected', function () {
				clearTimeout(timeout);
				test.ok(true, 'Verify init with key');
				test.done();
				ably.close();
			});
			var exitOnState = function(state) {
				ably.connection.on(state, function () {
					test.ok(false, 'Connection to server failed');
					test.done();
					ably.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
			timeout = setTimeout(function () {
				test.ok(false, 'Timed out: Trying to connect took longer than expected');
				test.done();
				ably.close();
			}, 10 * 1000);
		} catch (e) {
			test.ok(false, 'Init with key failed with exception: ' + e);
			test.done();
		}
	};

	var wsTransport = 'web_socket';
	if(isTransportAvailable(wsTransport)) {
		exports.wsbase0 = function (test) {
			connectionWithTransport(test, wsTransport);
		};

		/*
		 * Publish and subscribe, json transport
		 */
		exports.wspublish0 = function (test) {
			publishWithTransport(test, wsTransport);
		};

		/*
		 * Check heartbeat
		 */
		exports.wsheartbeat0 = function (test) {
			heartbeatWithTransport(test, wsTransport);
		};
	}

	var xhrTransport = 'xhr';
	if(isTransportAvailable(xhrTransport)) {
		exports.xhrbase0 = function (test) {
			connectionWithTransport(test, xhrTransport);
		};

		/*
		 * Publish and subscribe, json transport
		 */
		exports.xhrppublish0 = function (test) {
			publishWithTransport(test, xhrTransport);
		};

		/*
		 * Check heartbeat
		 */
		exports.xhrheartbeat0 = function (test) {
			heartbeatWithTransport(test, xhrTransport);
		};
	}

	var jsonpTransport = 'jsonp';
	if(isTransportAvailable(jsonpTransport)) {
		exports.jsonpbase0 = function (test) {
			connectionWithTransport(test, jsonpTransport);
		};

		/*
		 * Publish and subscribe, json transport
		 */
		exports.jsonppublish0 = function (test) {
			publishWithTransport(test, jsonpTransport);
		};


		/*
		 * Check heartbeat
		 */
		exports.jsonpheartbeat0 = function (test) {
			heartbeatWithTransport(test, jsonpTransport);
		};
	}

	exports.auto_transport_base0 = function (test) {
		connectionWithTransport(test);
	};

	/*
	 * Publish and subscribe
	 */
	exports.auto_transport_publish0 = function (test) {
		publishWithTransport(test);
	};

	/*
	 * Check heartbeat
	 */
	exports.auto_transport_heartbeat0 = function (test) {
		heartbeatWithTransport(test);
	};

	return module.exports = helper.withTimeout(exports);
});
