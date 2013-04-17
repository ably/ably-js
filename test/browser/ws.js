/*
 * Base init case
 */
var _ws = {};
var ws = this.ws = {};

ws.wsbase0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.key0Str,
			transports: ['web_socket']
		});
		ably.connection.on('connected', function () {
			test.ok(true, 'Verify ws connection with key');
			test.done();
			ably.close();
		});
		['failed', 'suspended'].forEach(function (state) {
			ably.connection.on(state, function () {
				test.ok(false, 'Ws connection to server failed');
				test.done();
			});
		});
	} catch (e) {
		test.ok(false, 'Init ws connection failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Check heartbeat
 */
ws.wsheartbeat0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.key0Str,
			transports: ['web_socket']
		});
		/* when we see the transport we're interested in get activated,
		 * listen for the heartbeat event */
		var failTimer;
		var connectionManager = ably.connection.connectionManager;
		connectionManager.on('transport.active', function (transport) {
			if (transport.toString().indexOf('ws://') > -1)
				transport.once('heartbeat', function () {
					clearTimeout(failTimer);
					test.ok(true, 'verify ws heartbeat');
					test.done();
					ably.close();
				});
		});

		ably.connection.on('connected', function () {
			failTimer = setTimeout(function () {
				test.ok(false, 'ws heartbeat failed (timer expired)');
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
		test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Publish and subscribe, json transport
 */
ws.wspublish0 = function (test) {
	var count = 10;
	var sent = 0, sendCb = 0, recv = 0;
	var cbCount = 10;
	var timer;
	var checkFinish = function () {
		console.log('checkFinish(): sendCb = ' + sendCb + '; recv = ' + recv);
		if(sendCb == count && recv == count) {
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
		key: testVars.key0Str,
		transports: ['web_socket']
	});
	test.expect(count);
	var channel = ably.channels.get('wspublish0' + String(Math.random()).substr(1));
	/* subscribe to event */
	channel.subscribe('event0', function (msg) {
		test.ok(true, 'Received event0');
		++recv;
		checkFinish();
	});
	timer = setInterval(function () {
		console.log('sending: ' + sent++);
		channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
			console.log('publish callback called');
			++sendCb;
			checkFinish();
		});
		if(sent == count)
			clearInterval(timer);
	}, 2000);
};
