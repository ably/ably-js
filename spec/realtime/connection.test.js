"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	exports.setupConnection = function(test) {
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

	exports.connectionPing = function(test) {
		test.expect(1);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				realtime.connection.ping();
				test.ok(true, 'check that ping without did not raise exception');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.connectionPingWithCallback = function(test) {
		test.expect(2);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				realtime.connection.ping(function(err, responseTime){
					if(err) {
						test.ok(false, helper.displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					test.equal(typeof responseTime, "number", 'check that a responseTime returned');
					test.ok(responseTime > 0, 'check that responseTime was +ve');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.connectionAttributes = function(test) {
		test.expect(6);
		var realtime;
		try {
			realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				test.equal(realtime.connection.serial, -1, "verify serial is -1 on connect");
				test.equal(realtime.connection.recoveryKey, realtime.connection.key + ':' + realtime.connection.serial, 'verify correct recovery key');

				var channel = realtime.channels.get('connectionattributes');
				channel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}
					channel.subscribe(function() {
						setTimeout(function() {
							console.log("connectionAttributes test: connection serial is " + realtime.connection.serial)
							test.equal(realtime.connection.serial, 0, "verify serial is 0 after message received")
							test.equal(realtime.connection.recoveryKey, realtime.connection.key + ':' + realtime.connection.serial, 'verify recovery key still correct');

							realtime.connection.close();
							realtime.connection.whenState('closed', function() {
								test.equal(realtime.connection.recoveryKey, null, 'verify recovery key null after close');
								closeAndFinish(test, realtime);
							});
						}, 0);
					});
					channel.publish("name", "data", function(err) {
						if(err) {
							test.ok(false, 'Publish failed with error: ' + displayError(err));
							closeAndFinish(test, realtime);
							return;
						}
					});
					test.equal(realtime.connection.serial, -1, "verify serial is -1 after publish but before message received")
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.unrecoverableConnection = function(test) {
		test.expect(4);
		var realtime,
			fakeRecoveryKey = '_____!ablyjs_test_fake-key____:5';
		try {
			realtime = helper.AblyRealtime({recover: fakeRecoveryKey});
			realtime.connection.on('connected', function(stateChange) {
				console.log(JSON.stringify(stateChange));
				test.equal(stateChange.reason.code, 80008, "verify unrecoverable-connection error set in stateChange.reason");
				test.equal(realtime.connection.errorReason.code, 80008, "verify unrecoverable-connection error set in connection.errorReason");
				test.equal(realtime.connection.serial, -1, "verify serial is -1 (new connection), not 5");
				test.equal(realtime.connection.key.indexOf('ablyjs_test_fake'), -1, "verify connection using a new connectionkey");
				closeAndFinish(test, realtime);
			});
		} catch(e) {
			test.ok(false, 'test failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	return module.exports = helper.withTimeout(exports);
});
