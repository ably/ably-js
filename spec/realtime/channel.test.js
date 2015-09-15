"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection;

	exports.setupauth = function(test) {
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

	/*
	 * Base attach case, binary transport
	 */
	exports.channelattach0 = function(test) {
		var transport = 'binary';

		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channel0');
				channel0.attach(function(err) {
					if(err)
						test.ok(false, 'Attach failed with error: ' + err);
					else
						test.ok(true, 'Attach to channel 0 with no options');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Base attach case, text/json transport
	 */
	exports.channelattach1 = function(test) {
		var transport = 'json';

		test.expect(1);
		try {
			var realtime = helper.AblyRealtime({ useBinaryProtocol: false });
			realtime.connection.on('connected', function() {
				var channel1 = realtime.channels.get('channel1');
				channel1.attach(function(err) {
					if(err)
						test.ok(false, 'Attach failed with error: ' + err);
					else
						test.ok(true, 'Attach to channel1 with no options');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach before connect, binary transport
	 */
	exports.channelattach2 = function(test) {
		var transport = 'binary';

		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			var channel2 = realtime.channels.get('channel2');
			channel2.attach(function(err) {
				if(err)
					test.ok(false, 'Attach failed with error: ' + err);
				else
					test.ok(true, 'Attach to channel 0 with no options');
				closeAndFinish(test, realtime);
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach then detach, binary transport
	 */
	exports.channelattach3 = function(test) {
		var transport = 'binary';

		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				var channel0 = realtime.channels.get('channel0');
				channel0.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
					}
					channel0.detach(function(err) {
						if(err) {
							test.ok(false, 'Detach failed with error: ' + err);
							closeAndFinish(test, realtime);
						}
						if(channel0.state == 'detached')
							test.ok(true, 'Attach then detach to channel 0 with no options');
						else
							test.ok(false, 'Detach failed: State is '+channel0.state);
						closeAndFinish(test, realtime);
					});
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach with an empty channel and expect a channel error
	 * and the connection to remain open
	 */
	exports.channelattachempty = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.once('connected', function() {
				var channel0 = realtime.channels.get('');
				channel0.attach(function(err) {
					if(err) {
						test.expect(2);
						test.ok(true, 'Attach failed as expected');
						setTimeout(function() {
							test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
							closeAndFinish(test, realtime);
						}, 1000);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach with an invalid channel name and expect a channel error
	 * and the connection to remain open
	 */
	exports.channelattach_invalid = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.once('connected', function() {
				realtime.channels.get(':hell').attach(function(err) {
					if(err) {
						test.expect(2);
						test.ok(true, 'Attach failed as expected');
						setTimeout(function() {
							test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
							closeAndFinish(test, realtime);
						}, 1000);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Implicit attach with an invalid channel name by publishing
	 */
	exports.channelattach_publish = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.once('connected', function() {
				realtime.channels.get('channelattach_publish').publish(function(err) {
					if(err) {
						test.ok(false, 'Unexpected attach failure');
						closeAndFinish(test, realtime);
						return;
					}
					test.ok(true, 'publishfailed as expected');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Implicit attach with an invalid channel name by publishing
	 */
	exports.channelattach_publish_invalid = function(test) {
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.once('connected', function() {
				realtime.channels.get(':hell').publish(function(err) {
					if(err) {
						test.ok(true, 'publishfailed as expected');
						test.equal(err.code, 40010, "correct error code")
						closeAndFinish(test, realtime);
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	/*
	 * Attach with an invalid channel name and expect a channel error
	 * and the connection to remain open
	 */
	exports.channelattach_invalid_twice = function(test) {
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.once('connected', function() {
				realtime.channels.get(':hell').attach(function(err) {
					if(err) {
						test.expect(2);
						test.ok(true, 'Attach failed as expected');
						/* attempt second attach */
						realtime.channels.get(':hell').attach(function(err) {
							if(err) {
								test.expect(3);
								test.ok(true, 'Attach (second attempt) failed as expected');
								setTimeout(function() {
									test.ok(realtime.connection.state === 'connected', 'Client should still be connected');
									closeAndFinish(test, realtime);
								}, 1000);
								return;
							}
							test.ok(false, 'Unexpected attach (second attempt) success');
							closeAndFinish(test, realtime);
						});
						return;
					}
					test.ok(false, 'Unexpected attach success');
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	if (isBrowser) {
		/*
		 * Base attach case, jsonp transport
		 */
		exports.channelattachjson1 = function(test) {
			var transport = 'jsonp';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						closeAndFinish(test, realtime);
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};

		/*
		 * Attach then detach, jsonp transport
		 */
		exports.channelattachjson2 = function(test) {
			var transport = 'jsonp';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							closeAndFinish(test, realtime);
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								closeAndFinish(test, realtime);
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							closeAndFinish(test, realtime);
						});
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};

		/*
		 * Base attach case, xhr transport
		 */
		exports.channelattachxhr1 = function(test) {
			var transport = 'xhr';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						closeAndFinish(test, realtime);
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};

		/*
		 * Attach then detach, xhr transport
		 */
		exports.channelattachxhr2 = function(test) {
			var transport = 'xhr';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							closeAndFinish(test, realtime);
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								closeAndFinish(test, realtime);
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							closeAndFinish(test, realtime);
						});
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};
	} else {
		/*
		 * Base attach case, comet transport
		 */
		exports.channelattachcomet1 = function(test) {
			var transport = 'comet';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel3 = realtime.channels.get('channel3');
					channel3.attach(function(err) {
						if(err)
							test.ok(false, 'Attach failed with error: ' + err);
						else
							test.ok(true, 'Attach to channel 3 with no options');
						closeAndFinish(test, realtime);
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};

		/*
		 * Attach then detach, comet transport
		 */
		exports.channelattachcomet2 = function(test) {
			var transport = 'comet';

			test.expect(1);
			try {
				var realtime = helper.AblyRealtime({ transports: [transport] });
				realtime.connection.on('connected', function() {
					var channel5 = realtime.channels.get('channel5');
					channel5.attach(function(err) {
						if(err) {
							test.ok(false, 'Attach failed with error: ' + err);
							closeAndFinish(test, realtime);
						}
						/* we can't get a callback on a detach, so set a timeout */
						channel5.detach(function(err) {
							if(err) {
								test.ok(false, 'Attach failed with error: ' + err);
								closeAndFinish(test, realtime);
							}
							if(channel5.state == 'detached')
								test.ok(true, 'Attach then detach to channel 0 with no options');
							else
								test.ok(false, 'Detach failed');
							closeAndFinish(test, realtime);
						});
					});
				});
				monitorConnection(test, realtime);
			} catch(e) {
				test.ok(false, 'Channel attach failed with exception: ' + e.stack);
				closeAndFinish(test, realtime);
			}
		};
	}

	/*
	 * Subscribe, then unsubscribe, binary transport
	 */
	exports.channelsubscribe0 = function(test) {
		var transport = 'binary';

		test.expect(1);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				var channel6 = realtime.channels.get('channel6');
				channel6.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
					}
					try {
						channel6.subscribe('event0', function() {});
						setTimeout(function() {
							try {
								channel6.unsubscribe('event0', function() {});
								test.ok(true, 'Subscribe then unsubscribe to channel6:event0 with no options');
								closeAndFinish(test, realtime);
							} catch(e) {
								test.ok(false, 'Unsubscribe failed with error: ' + e.stack);
								closeAndFinish(test, realtime);
							}
						}, 1000);
					} catch(e) {
						test.ok(false, 'Subscribe failed with error: ' + e);
						closeAndFinish(test, realtime);
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	return module.exports = helper.withTimeout(exports);
});
