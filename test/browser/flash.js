/*
 * Flash init case
 */
var _flash = {};
var flash = this.flash = {};

flash.flashbase0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.key0Str,
			transports: ['flash_socket']
		});
		ably.connection.on('connected', function () {
			test.ok(true, 'Verify flash connection with key');
			test.done();
			ably.close();
		});
		['failed', 'suspended'].forEach(function (state) {
			ably.connection.on(state, function () {
				test.ok(false, 'flash connection to server failed');
				test.done();
			});
		});
	} catch (e) {
		test.ok(false, 'Init flash connection failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Check heartbeat
 */
flash.flashheartbeat0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost:testVars.realtimeHost,
			wsHost:testVars.realtimeHost,
			port:testVars.realtimePort,
			tlsPort:testVars.realtimeTlsPort,
			key: testVars.key0Str,
			transports: ['flash_socket']
		});
		/* when we see the transport we're interested in get activated,
		 * listen for the heartbeat event */
		var failTimer;
		var connectionManager = ably.connection.connectionManager;
		connectionManager.on('transport.active', function (transport) {
			if (transport.toString().indexOf('ws://') > -1)
				transport.once('heartbeat', function () {
					clearTimeout(failTimer);
					test.ok(true, 'verify flash heartbeat');
					test.done();
					ably.close();
				});
		});

		ably.connection.on('connected', function () {
			failTimer = setTimeout(function () {
				test.ok(false, 'flash heartbeat failed (timer expired)');
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
		test.ok(false, 'flash connect with key failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Publish and subscribe, json transport
 */
flash.flashppublish0 = function (test) {
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
		key: testVars.key0Str,
		transports: ['flash_socket']
	});
	test.expect(count);
	var channel = ably.channels.get('flashpublish0' + String(Math.random()).substr(1));
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
