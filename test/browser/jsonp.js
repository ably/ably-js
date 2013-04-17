/*
 * Base init case
 */
var _jsonp = {};
var jsonp = this.jsonp = {};

jsonp.jsonpbase0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.testKey0Str,
			transports: ['web_socket']
		});
		ably.connection.on('connected', function () {
			test.ok(true, 'Verify jsonp connection with key');
			test.done();
			ably.close();
		});
		['failed', 'suspended'].forEach(function (state) {
			ably.connection.on(state, function () {
				test.ok(false, 'jsonp connection to server failed');
				test.done();
			});
		});
	} catch (e) {
		test.ok(false, 'Init jsonp connection failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Check heartbeat
 */
jsonp.jsonpheartbeat0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.testKey0Str,
			transports: ['jsonp']
		});
		/* when we see the transport we're interested in get activated,
		 * listen for the heartbeat event */
		var failTimer;
		var connectionManager = ably.connection.connectionManager;
		connectionManager.on('transport.active', function (transport) {
			if (transport.toString().indexOf('/comet/') > -1)
				transport.once('heartbeat', function () {
					clearTimeout(failTimer);
					test.ok(true, 'verify jsonp heartbeat');
					test.done();
					ably.close();
				});
		});

		ably.connection.on('connected', function () {
			failTimer = setTimeout(function () {
				test.ok(false, 'jsonp heartbeat failed (timer expired)');
				test.done();
			}, 120000);
		});
		['failed', 'suspended'].forEach(function (state) {
			ably.connection.on(state, function () {
				test.ok(false, 'Connection to server failed');
				test.done();
			});
		});
	} catch (e) {
		test.ok(false, 'jsonp connect with key failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Publish and subscribe, json transport
 */
jsonp.jsonppublish0 = function (test) {
	var count = 10;
	var cbCount = 10;
	var timer;
	var checkFinish = function () {
		if (!count && !cbCount) {
			clearInterval(timer);
			test.done();
			ably.close();
		}
	};
	var ably = new Ably.Realtime({
		log: {level: 4},
		restHost:testVars.realtimeHost,
		wsHost:testVars.realtimeHost,
		port:testVars.realtimePort,
		tlsPort:testVars.realtimeTlsPort,
		key: testVars.testKey0Str,
		transports: ['jsonp']
	});
	test.expect(count);
	var channel = ably.channels.get('jsonppublish0' + String(Math.random()).substr(1));
	/* subscribe to event */
	channel.subscribe('event0', function (msg) {
		test.ok(true, 'Received event0');
		--count;
		checkFinish();
	});
	timer = setInterval(function () {
		console.log('sending: ' + count);
		channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
			console.log('publish callback called');
			--cbCount;
			checkFinish();
		});
	}, 2000);
};
