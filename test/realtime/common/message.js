"use strict";

exports.setup = function(base) {
	var rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var _exports = {};
	var currentTime;

	rExports.setupmessage = function(test) {
		test.expect(1);
		rest = base.rest({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		rest.time(function(err, time) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			currentTime = time;
			test.ok(true, 'Obtained time');
			test.done();
		});
	};

	rExports.publishonce = function(test) {
		test.expect(1);
		try {
			/* set up realtime */
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			/* connect and attach */
			realtime.connection.on('connected', function() {
				var testMsg = 'Hello world';
				var rtChannel = realtime.channels.get('publishonce');
				rtChannel.attach(function(err) {
					console.log('3: '+err);
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						test.done();
						realtime.close();
						return;
					}

					/* subscribe to event */
					rtChannel.subscribe('event0', function(msg) {
						console.log('4');
						test.expect(2);
						test.ok(true, 'Received event0');
						test.equal(msg.data, testMsg, 'Unexpected msg text received');
						test.done();
						realtime.close();
					});

					/* publish event */
					console.log('5');
					var restChannel = rest.channels.get('publishonce');
					restChannel.publish('event0', testMsg);
					console.log('6');
				});
			});
			['failed', 'suspended'].forEach(function(state) {
				realtime.connection.on(state, function() {
					test.ok(false, 'Connection to server failed');
					test.done();
				});
			});
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	rExports.restpublish = function(test) {
		var count = 10;
		rest = base.rest({
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		var realtime = base.realtime({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		test.expect(2 * count);
		var messagesSent = [];
		var sendchannel = rest.channels.get('restpublish');
		var recvchannel = realtime.channels.get('restpublish');
		/* subscribe to event */
		recvchannel.subscribe('event0', function(msg) {
			test.ok(true, 'Received event0');
			test.notEqual(-1, messagesSent.indexOf(msg.data), 'Received unexpected message text');
			if(!--count) {
				clearInterval(timer);
				test.done();
				realtime.close();
			}
		});
		var timer = setInterval(function() {
			console.log('sending: ' + count);
			var msgText = 'Hello world at: ' + new Date();
			messagesSent.push(msgText);
			sendchannel.publish('event0', msgText);
		}, 2000);
	};

	rExports.wspublish = function(test) {
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
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		test.expect(count);
		var channel = realtime.channels.get('wspublish');
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

	rExports.cometpublish = function(test) {
		var count = 10;
		var cbCount = 10;
		var timer;
		var checkFinish = function() {
			if(!count && !cbCount) {
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
		var channel = realtime.channels.get('cometpublish');
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
