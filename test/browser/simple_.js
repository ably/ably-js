var simple_ = {};

function isTransportAvailable(transport) {
	return (transport in Ably.Realtime.ConnectionManager.transports);
}

function __log(msg) {
	document.getElementById('log').innerHTML += msg + '<br>';
}

function realtimeConnection(transports) {
	var options = {
		log: {level: 1, handler: __log},
		host: testVars.restHost,
		wsHost: testVars.realtimeHost,
		port: testVars.realtimePort,
		tlsPort: testVars.realtimeTlsPort,
		key: testVars.key0Str,
		tls: testVars.useTls
	};
	if (transports) options.transports = transports;
	return new Ably.Realtime(options);
}

function failWithin(timeInSeconds, test, ably, description) {
	var timeout = setTimeout(function () {
		test.ok(false, 'Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)');
		test.done();
		ably.close()
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
		function exitOnState(state) {
			ably.connection.on(state, function () {
				connectionTimeout.stop();
				test.ok(false, transport + ' connection to server failed');
				test.done();
				ably.close();
			});
		}
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
		function exitOnState(state) {
			ably.connection.on(state, function () {
				connectionTimeout.stop();
				test.ok(false, transport + ' connection to server failed');
				test.done();
				ably.close();
			});
		}
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
	var channelName = (transport || 'auto_transport_') + 'publish0';
	var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
	/* subscribe to event */
	channel.subscribe('event0', function (msg) {
		test.ok(true, 'Received event0');
		console.log(transport + 'event received');
		receivedCount++;
		checkFinish();
	});
}

simple_.initbase0 = function (test) {
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
		function exitOnState(state) {
			ably.connection.on(state, function () {
				connectionTimeout.stop();
				test.ok(false, 'Connection to server failed');
				test.done();
				ably.close();
			});
		}
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
	simple_.wsbase0 = function (test) {
		connectionWithTransport(test, wsTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	simple_.wspublish0 = function (test) {
		publishWithTransport(test, wsTransport);
	};

	/*
	 * Check heartbeat
	 */
	simple_.wsheartbeat0 = function (test) {
		heartbeatWithTransport(test, wsTransport);
	};
}

var xhrTransport = 'xhr';
if(isTransportAvailable(xhrTransport)) {
	simple_.xhrbase0 = function (test) {
		connectionWithTransport(test, xhrTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	simple_.xhrppublish0 = function (test) {
		publishWithTransport(test, xhrTransport);
	};

	/*
	 * Check heartbeat
	 */
	simple_.xhrheartbeat0 = function (test) {
		heartbeatWithTransport(test, xhrTransport);
	};
}

var jsonpTransport = 'jsonp';
if(isTransportAvailable(jsonpTransport)) {
	simple_.jsonpbase0 = function (test) {
		connectionWithTransport(test, jsonpTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	simple_.jsonppublish0 = function (test) {
		publishWithTransport(test, jsonpTransport);
	};


	/*
	 * Check heartbeat
	 */
	simple_.jsonpheartbeat0 = function (test) {
		heartbeatWithTransport(test, jsonpTransport);
	};
}

var iframeTransport = 'iframe';
if(isTransportAvailable(iframeTransport)) {
	simple_.iframebase0 = function (test) {
		connectionWithTransport(test, iframeTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	simple_.iframepublish0 = function (test) {
		publishWithTransport(test, iframeTransport);
	};

	/*
	 * Check heartbeat
	 */
	simple_.iframeheartbeat0 = function (test) {
		heartbeatWithTransport(test, iframeTransport);
	};
}

simple_.auto_transport_base0 = function (test) {
	connectionWithTransport(test);
};

/*
 * Publish and subscribe
 */
simple_.auto_transport_publish0 = function (test) {
	publishWithTransport(test);
};

/*
 * Check heartbeat
 */
simple_.auto_transport_heartbeat0 = function (test) {
	heartbeatWithTransport(test);
};
