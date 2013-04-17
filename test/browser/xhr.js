/*
 * Base init case
 */
var _xhr = {};
var xhr = this.xhr = {};

xhr.xhrbase0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost: 'localhost',
			wsHost: 'localhost',
			port: 8080,
			tlsPort: 8081,
			key: testVars.testKey0Str,
			transports: ['web_socket']
		});
		ably.connection.on('connected', function () {
			test.ok(true, 'Verify xhr connection with key');
			test.done();
			ably.close();
		});
		['failed', 'suspended'].forEach(function (state) {
			ably.connection.on(state, function () {
				test.ok(false, 'xhr connection to server failed');
				test.done();
			});
		});
	} catch (e) {
		test.ok(false, 'Init xhr connection failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Check heartbeat
 */
xhr.xhrheartbeat0 = function (test) {
	test.expect(1);
	try {
		var ably = new Ably.Realtime({
			log: {level: 4},
			restHost: 'localhost',
			wsHost: 'localhost',
			port: 8080,
			tlsPort: 8081,
			key: testVars.testKey0Str,
			transports: ['xhr']
		});
		/* when we see the transport we're interested in get activated,
		 * listen for the heartbeat event */
		var failTimer;
		var connectionManager = ably.connection.connectionManager;
		connectionManager.on('transport.active', function (transport) {
			if (transport.toString().indexOf('/comet/') > -1)
				transport.once('heartbeat', function () {
					clearTimeout(failTimer);
					test.ok(true, 'verify xhr heartbeat');
					test.done();
					ably.close();
				});
		});

		ably.connection.on('connected', function () {
			failTimer = setTimeout(function () {
				test.ok(false, 'xhr heartbeat failed (timer expired)');
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
		test.ok(false, 'xhr connect with key failed with exception: ' + e.stack);
		test.done();
	}
};

/*
 * Publish and subscribe, json transport
 */
xhr.xhrppublish0 = function (test) {
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
		restHost: 'localhost',
		wsHost: 'localhost',
		port: 8080,
		tlsPort: 8081,
		key: testVars.testKey0Str,
		transports: ['xhr']
	});
	test.expect(count);
	var channel = ably.channels.get('xhrpublish0');
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
