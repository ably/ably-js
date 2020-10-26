"use strict";

define(['shared_helper', 'vcdiff-decoder', 'async'], function(helper, vcdiffDecoder, async) {
	helper.describeWithCounter('realtime/delta', function (expect, counter) {
		var exports = {},
			_exports = {},
			displayError = helper.displayError,
			closeAndFinish = helper.closeAndFinish,
			monitorConnection = helper.monitorConnection,
			testData = [
				{ foo: 'bar', count: 1, status: 'active' },
				{ foo: 'bar', count: 2, status: 'active' },
				{ foo: 'bar', count: 2, status: 'inactive' },
				{ foo: 'bar', count: 3, status: 'inactive' },
				{ foo: 'bar', count: 3, status: 'active' }
			];

		function equals(a, b) {
			return JSON.stringify(a) === JSON.stringify(b);
		}

		function getTestVcdiffDecoder() {
			return {
				numberOfCalls: 0,
				decode: function(delta, base) {
					this.numberOfCalls++;
					return vcdiffDecoder.decode(delta, base);
				}
			};
		}

		it('setupMessage', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, displayError(err));
				} else {
					expect(true, 'setup app');
				}
				counter.assert();
				done();
			});
		});

		it('deltaPlugin', function(done) {
			counter.expect(testData.length + 1);
			var testName = 'deltaPlugin';
			try {
				var testVcdiffDecoder = getTestVcdiffDecoder();
				var realtime = helper.AblyRealtime({
					plugins: {
						vcdiff: testVcdiffDecoder
					}
				});
				var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

				channel.attach(function(err) {
					if(err) {
						expect(false, displayError(err));
						closeAndFinish(done, realtime);
					}

					channel.on('attaching', function(stateChange) {
						expect(false, 'Channel reattaching, presumably due to decode failure; reason =' + displayError(stateChange.reason));
					});

					channel.subscribe(function(message) {
						var index = Number(message.name);
						expect(equals(testData[index], message.data), 'Check message.data');

						if (index === testData.length - 1) {
							expect(testVcdiffDecoder.numberOfCalls).to.equal(testData.length - 1, 'Check number of delta messages');
							counter.assert();
							closeAndFinish(done, realtime);
						}
					});

					async.timesSeries(testData.length, function(i, cb) {
						channel.publish(i.toString(), testData[i], cb);
					});
				});

				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('unusedPlugin', function(done) {
			counter.expect(testData.length + 1);
			var testName = 'unusedPlugin';
			try {
				var testVcdiffDecoder = getTestVcdiffDecoder();
				var realtime = helper.AblyRealtime({
					plugins: {
						vcdiff: testVcdiffDecoder
					}
				});
				var channel = realtime.channels.get(testName);

				channel.attach(function(err) {
					if(err) {
						expect(false, displayError(err));
						closeAndFinish(done, realtime);
					}
					channel.subscribe(function(message) {
						var index = Number(message.name);
						expect(equals(testData[index], message.data), 'Check message.data');

						if (index === testData.length - 1) {
							expect(testVcdiffDecoder.numberOfCalls).to.equal(0, 'Check number of delta messages');
							counter.assert();
							closeAndFinish(done, realtime);
						}
					});

					async.timesSeries(testData.length, function(i, cb) {
						channel.publish(i.toString(), testData[i], cb);
					});
				});

				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('lastMessageNotFoundRecovery', function(done) {
			counter.expect(testData.length + 2);
			var testName = 'lastMessageNotFoundRecovery';
			try {
				var testVcdiffDecoder = getTestVcdiffDecoder();
				var realtime = helper.AblyRealtime({
					plugins: {
						vcdiff: testVcdiffDecoder
					}
				});
				var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

				channel.attach(function(err) {
					if(err) {
						expect(false, displayError(err));
						closeAndFinish(done, realtime);
					}
					channel.subscribe(function(message) {
						var index = Number(message.name);
						expect(equals(testData[index], message.data), 'Check message.data');

						if (index === 1) {
							/* Simulate issue */
							channel._lastPayload.messageId = null;
							channel.once('attaching', function(stateChange) {
								expect(stateChange.reason.code).to.equal(40018, 'Check error code passed through per RTL18c');
								channel.on('attaching', function(stateChange) {
									expect(false, 'Check no further decode failures; reason =' + displayError(stateChange.reason));
								});
							})
						} else if (index === testData.length - 1) {
							expect(testVcdiffDecoder.numberOfCalls).to.equal(testData.length - 2, 'Check number of delta messages');
							counter.assert();
							closeAndFinish(done, realtime);
						}
					});

					async.timesSeries(testData.length, function(i, cb) {
						channel.publish(i.toString(), testData[i], cb);
					});
				});

				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		it('deltaDecodeFailureRecovery', function(done) {
			counter.expect(testData.length * 2 - 1);
			var testName = 'deltaDecodeFailureRecovery';
			try {
				var failingTestVcdiffDecoder = {
					decode: function(delta, base) {
						throw new Error('Failed to decode delta.');
					}
				};

				var realtime = helper.AblyRealtime({
					plugins: {
						vcdiff: failingTestVcdiffDecoder
					}
				});
				var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

				channel.attach(function(err) {
					if(err) {
						expect(false, displayError(err));
						closeAndFinish(done, realtime);
					}
					channel.on('attaching', function(stateChange) {
						expect(stateChange.reason.code).to.equal(40018, 'Check error code passed through per RTL18c');
					});
					channel.subscribe(function(message) {
						var index = Number(message.name);
						expect(equals(testData[index], message.data), 'Check message.data');

						if (index === testData.length - 1) {
							counter.assert();
							closeAndFinish(done, realtime);
						}
					});

					async.timesSeries(testData.length, function(i, cb) {
						channel.publish(i.toString(), testData[i], cb);
					});
				});

				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});

		/* Check that channel becomes failed if we get deltas when we don't have a vcdiff plugin */
		it('noPlugin', function(done) {
			try {
				var realtime = helper.AblyRealtime();
				var channel = realtime.channels.get('noPlugin', { params: { delta: 'vcdiff' } });

				channel.attach(function(err) {
					if(err) {
						expect(false, displayError(err));
						closeAndFinish(done, realtime);
					}
					channel.once('failed', function(stateChange) {
						expect(stateChange.reason.code).to.equal(40019, 'Check error code');
						closeAndFinish(done, realtime);
					});
					async.timesSeries(testData.length, function(i, cb) {
						channel.publish(i.toString(), testData[i], cb);
					});
				});

				monitorConnection(done, expect, realtime);
			} catch(e) {
				expect(false, testName + ' test failed with exception: ' + e.stack);
				closeAndFinish(done, realtime);
			}
		});
	});
});
