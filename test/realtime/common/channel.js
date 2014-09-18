"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var currentTime;

	rExports.setupchannel = function(test) {
		test.expect(1);
		var rest = base.rest({
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

	/*
	 * Base attach case, binary transport
	 */
	rExports.channelattach0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channel0');
				channel0.attach(function(err) {
					if(err)
						test.ok(false, 'Attach failed with error: ' + err);
					else
						test.ok(true, 'Attach to channel 0 with no options');
					test.done();
					realtime.close();
				});
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Base attach case, text transport
	 */
	rExports.channelattach1 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log: {level: 4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
				useTextProtocol: true
			});
			realtime.connection.on('connected', function() {
				var channel1 = realtime.channels.get('channel1');
				channel1.attach(function(err) {
					if(err)
						test.ok(false, 'Attach failed with error: ' + err);
					else
						test.ok(true, 'Attach to channel1 with no options');
					test.done();
					realtime.close();
				});
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Attach before connect, binary transport
	 */
	rExports.channelattach2 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			var channel2 = realtime.channels.get('channel2');
			channel2.attach(function(err) {
				if(err)
					test.ok(false, 'Attach failed with error: ' + err);
				else
					test.ok(true, 'Attach to channel 0 with no options');
				test.done();
				realtime.close();
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Attach then detach, binary transport
	 */
	rExports.channelattach3 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				//log:{level:4},
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channel0');
				channel0.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						test.done();
						realtime.close();
					}
					channel0.detach(function(err) {
						if(err) {
							test.ok(false, 'Detach failed with error: ' + err);
							test.done();
							realtime.close();
						}
						if(channel0.state == 'detached')
							test.ok(true, 'Attach then detach to channel 0 with no options');
						else
							test.ok(false, 'Detach failed: State is '+channel0.state);
						test.done();
						realtime.close();
					});
				});
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	if (base.isBrowser) {
		/*
		 * Base attach case, jsonp transport
		 */
		rExports.channelattachjson1 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['jsonp']
				});
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						test.done();
						realtime.close();
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};

		/*
		 * Attach then detach, jsonp transport
		 */
		rExports.channelattachjson2 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['jsonp']
				});
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							test.done();
							realtime.close();
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								test.done();
								realtime.close();
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							test.done();
							realtime.close();
						});
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};

		/*
		 * Base attach case, xhr transport
		 */
		rExports.channelattachxhr1 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['xhr']
				});
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						test.done();
						realtime.close();
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};

		/*
		 * Attach then detach, xhr transport
		 */
		rExports.channelattachxhr2 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['xhr']
				});
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							test.done();
							realtime.close();
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								test.done();
								realtime.close();
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							test.done();
							realtime.close();
						});
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};
	} else {
		/*
		 * Base attach case, comet transport
		 */
		rExports.channelattachcomet1 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['comet']
				});
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						test.done();
						realtime.close();
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};

		/*
		 * Attach then detach, comet transport
		 */
		rExports.channelattachcomet2 = function(test) {
			test.expect(1);
			try {
				var realtime = base.realtime({
					key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
					transports: ['comet']
				});
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							test.done();
							realtime.close();
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								test.done();
								realtime.close();
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							test.done();
							realtime.close();
						});
					});
				});
				var exitOnState = function(state) {
					realtime.connection.on(state, function () {
						test.ok(false, transport + ' connection to server failed');
						test.done();
						realtime.close();
					});
				}
				exitOnState('failed');
				exitOnState('suspended');
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				test.done();
			}
		};
	}

	/*
	 * Subscribe, then unsubscribe, binary transport
	 */
	rExports.channelsubscribe0 = function(test) {
		test.expect(1);
		try {
			var realtime = base.realtime({
				key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
			});
			realtime.connection.on('connected', function() {
				var channel6 = realtime.channels.get('channel6');
				channel6.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						test.done();
						realtime.close();
					}
					try {
						channel6.subscribe('event0', function() {});
						setTimeout(function() {
							try {
								channel6.unsubscribe('event0', function() {});
								test.ok(true, 'Subscribe then unsubscribe to channel6:event0 with no options');
								test.done();
								realtime.close();
							} catch(e) {
								test.ok(false, 'Unsubscribe failed with error: ' + e.stack);
								test.done();
								realtime.close();
							}
						}, 1000);
					} catch(e) {
						test.ok(false, 'Subscribe failed with error: ' + e);
						test.done();
						realtime.close();
					}
				});
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			}
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	return rExports;
};
