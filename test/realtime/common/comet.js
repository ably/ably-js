"use strict";

exports.setup = function(base) {
	var rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var _exports = {};
	var currentTime;

	/*
	 * Base comet case
	 */
	rExports.cometbase0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['comet']
			});
			realtime.connection.on('connected', function() {
				test.ok(true, 'verify comet connect with key');
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
			test.ok(false, 'comet connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat, json transport
	 */
	rExports.cometheartbeat0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['comet'],
				useTextProtocol: true
			});

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
	        var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().indexOf('/comet/') > -1)
					transport.on('heartbeat', function() {
						clearTimeout(failTimer);
						test.ok(true, 'verify comet heartbeat');
						test.done();
						realtime.close();
					});
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'comet heartbeat failed (timer expired)');
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
			test.ok(false, 'comet connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat, thrift transport
	 */
	rExports.cometheartbeat1 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				transports: ['comet']
			});

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().indexOf('/comet/') > -1)
					transport.on('heartbeat', function() {
						clearTimeout(failTimer);
						test.ok(true, 'verify comet heartbeat');
						test.done();
						realtime.close();
					});
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'comet heartbeat failed (timer expired)');
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
			test.ok(false, 'comet connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Publish and subscribe, json transport
	 */
	rExports.cometpublish0 = function(test) {
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
			transports: ['comet'],
			useTextProtocol: true
		});
		test.expect(count);
		var channel = realtime.channels.get('cometpublish0');
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

	/*
	 * Publish and subscribe, thrift transport
	 */
	rExports.cometpublish1 = function(test) {
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
			transports: ['comet']
		});
		test.expect(count);
		var channel = realtime.channels.get('cometpublish1');
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
