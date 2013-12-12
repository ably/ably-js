"use strict";

exports.setup = function(base) {
	var rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var _exports = {};
	var currentTime;

	/*
	 * Base ws case
	 */
	rExports.wsbase0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['web_socket']
			});
			realtime.connection.on('connected', function() {
				test.ok(true, 'verify ws connect with key');
				test.done();
				realtime.close();
			});
			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat, json transport
	 */
	rExports.wsheartbeat0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['web_socket'],
				useTextProtocol: true
			});

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
	        var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().indexOf('ws://') > -1)
					transport.on('heartbeat', function() {
						clearTimeout(failTimer);
						test.ok(true, 'verify ws heartbeat');
						test.done();
						realtime.close();
					});
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'ws heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat, thrift transport
	 */
	rExports.wsheartbeat1 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['web_socket']
			});

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().indexOf('ws://') > -1)
					transport.on('heartbeat', function() {
						clearTimeout(failTimer);
						test.ok(true, 'verify ws heartbeat');
						test.done();
						realtime.close();
					});
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'ws heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check SYNC_TIME request is made
	 */
	rExports.wssync0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['web_socket']
			});
			/* when we see the transport we're interested in become pending,
			 * listen for the connect event */
			var failTimer = setTimeout(function() {
				test.ok(false, 'ws heartbeat failed (timer expired)');
				test.done();
			}, 120000);
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.pending', function(transport) {
				transport.on('connected', function(err, connectionId, flags) {
					var hasSync = (flags && (flags & (1 << base.messagetypes.TFlags.SYNC_TIME)));
					clearTimeout(failTimer);
					test.ok(hasSync, 'verify SYNC_TIME request is made');
					test.done();
					realtime.close();
				});
			});

			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'ws connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/**
	 * Publish and subscribe, json transport
	 */
	rExports.wspublish0 = function(test) {
		var count = 10;
		var cbCount = 10;
		var timer;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				clearInterval(timer);
				test.done();
				realtime.close();
			}
		};
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket'],
			useTextProtocol: true
		});
		test.expect(count);
		var channel = realtime.channels.get('wspublish0');
		/* subscribe to event */
		channel.subscribe('event0', function(msg) {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		});
		timer = setInterval(function() {
			console.log('sending: ' + count);
			channel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
				console.log('publish callback called');
				--cbCount;
				checkFinish();
			});
		}, 2000);
	};

	/**
	 * Publish and subscribe, thrift transport
	 */
	rExports.wspublish1 = function(test) {
		var count = 10;
		var cbCount = 10;
		var timer;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				clearInterval(timer);
				test.done();
				realtime.close();
			}
		};
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
			transports: ['web_socket']
		});
		test.expect(count);
		var channel = realtime.channels.get('wspublish1');
		/* subscribe to event */
		channel.subscribe('event0', function(msg) {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		});
		timer = setInterval(function() {
			console.log('sending: ' + count);
			channel.publish('event0', 'Hello world at: ' + new Date(), function(err) {
				console.log('publish callback called');
				--cbCount;
				checkFinish();
			});
		}, 2000);
	};

	return rExports;
};
