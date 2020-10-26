"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/history', function (expect, counter) {
		var currentTime, rest, restBinary, exports = {},
				restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack,
				displayError = helper.displayError,
				utils = helper.Utils,
				testMessages = [
					{ name: 'event0',
						data: 'some data' },
					{ name: 'event1',
						data: 'some more data' },
					{ name: 'event2',
						data: 'and more' },
					{ name: 'event3',
						data: 'and more' },
					{ name: 'event4',
						data: [1,2,3] },
					{ name: 'event5',
						data: {one: 1, two: 2, three: 3} },
					{ name: 'event6',
						data: {foo: 'bar'} }
				];

		it('setup_history', function(done) {
			counter.expect(1);
			helper.setupApp(function() {
				rest = helper.AblyRest();
				expect(true, 'Setup REST library');
				counter.assert();
				done();
			});
		});

		restTestOnJsonMsgpack('history_simple', function(done, rest, channelName) {
			counter.expect(2);
			var testchannel = rest.channels.get('persisted:' + channelName);

			/* first, send a number of events to this channel */

			var publishTasks = utils.arrMap(testMessages, function(event) {
				return function(publishCb) {
					testchannel.publish(event.name, event.data, publishCb);
				};
			});

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.parallel(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline */
					testchannel.history(function(err, resultPage) {
						//console.log(require('util').inspect(messages));
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify all messages are received */
						var messages = resultPage.items;
						expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

						/* verify message ids are unique */
						var ids = {};
						utils.arrForEach(messages, function(msg) { ids[msg.id] = msg; });
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		restTestOnJsonMsgpack('history_multiple', function(done, rest, channelName) {
			counter.expect(2);
			var testchannel = rest.channels.get('persisted:' + channelName);

			/* first, send a number of events to this channel */
			var publishTasks = [function(publishCb) {
				testchannel.publish(testMessages, publishCb);
			}];

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.parallel(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline */
					testchannel.history(function(err, resultPage) {
						//console.log(require('util').inspect(messages));
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify all messages are received */
				var messages = resultPage.items;
						expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

						/* verify message ids are unique */
						var ids = {};
						utils.arrForEach(messages, function(msg) { ids[msg.id] = msg; });
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		restTestOnJsonMsgpack('history_simple_paginated_b', function(done, rest, channelName) {
			var testchannel = rest.channels.get('persisted:' + channelName);

			/* first, send a number of events to this channel */
			counter.expect(5 * testMessages.length - 1);
			var publishTasks = utils.arrMap(testMessages, function(event) {
				return function(publishCb) {
					testchannel.publish(event.name, event.data, publishCb);
				};
			});

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.series(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline to get messages one at a time */
					var ids = {},
				totalMessagesExpected = testMessages.length,
				nextPage = function(cb) {
					testchannel.history({limit: 1, direction: 'backwards'}, cb);
				};

			testMessages.reverse();
					async.mapSeries(testMessages, function(expectedMessage, cb) {
						nextPage(function(err, resultPage) {
							if(err) {
								cb(err);
								return;
							}
							/* verify expected number of messages in this page */
							expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
							var resultMessage = resultPage.items[0];
							ids[resultMessage.id] = resultMessage;

							/* verify expected message */
							expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
							expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

							if(--totalMessagesExpected > 0) {
								expect(resultPage.hasNext(), 'Verify next link is present');
								expect(!resultPage.isLast(), 'Verify not last page');
								nextPage = resultPage.next;
							}
							cb();
						});
					}, function(err) {
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify message ids are unique */
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		it('history_simple_paginated_f', function(done) {
			var testchannel = rest.channels.get('persisted:history_simple_paginated_f');

			/* first, send a number of events to this channel */
			counter.expect(4 * testMessages.length);
			var publishTasks = utils.arrMap(testMessages, function(event) {
				return function(publishCb) {
					testchannel.publish(event.name, event.data, publishCb);
				};
			});

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.series(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline to get messages one at a time */
				var ids = {},
					totalMessagesExpected = testMessages.length,
					nextPage = function(cb) {
						testchannel.history({limit: 1, direction: 'forwards'}, cb);
					};

					async.mapSeries(testMessages, function(expectedMessage, cb) {
						nextPage(function(err, resultPage) {
							if(err) {
								cb(err);
								return;
							}
							/* verify expected number of messages in this page */
							expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
							var resultMessage = resultPage.items[0];
							ids[resultMessage.id] = resultMessage;

							/* verify expected message */
							expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
							expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

							if(--totalMessagesExpected > 0) {
								expect(resultPage.hasNext(), 'Verify next link is present');
								nextPage = resultPage.next;
							}
							cb();
						});
					}, function(err) {
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify message ids are unique */
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		it('history_multiple_paginated_b', function(done) {
			var testchannel = rest.channels.get('persisted:history_multiple_paginated_b');

			/* first, send a number of events to this channel */
			counter.expect(4 * testMessages.length);
			var publishTasks = [function(publishCb) {
				testchannel.publish(testMessages, publishCb);
			}];

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.series(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline to get messages one at a time */
				var ids = {},
					totalMessagesExpected = testMessages.length,
					nextPage = function(cb) {
						testchannel.history({limit: 1, direction: 'backwards'}, cb);
					};

					testMessages.reverse();
					async.mapSeries(testMessages, function(expectedMessage, cb) {
						nextPage(function(err, resultPage) {
							if(err) {
								cb(err);
								return;
							}
							/* verify expected number of messages in this page */
							expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
							var resultMessage = resultPage.items[0];
							ids[resultMessage.id] = resultMessage;

							/* verify expected message */
							expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
							expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

							if(--totalMessagesExpected > 0) {
								expect(resultPage.hasNext(), 'Verify next link is present');
								nextPage = resultPage.next;
							}
							cb();
						});
					}, function(err) {
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify message ids are unique */
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		it('history_multiple_paginated_f', function(done) {
			var testchannel = rest.channels.get('persisted:history_multiple_paginated_f');

			/* first, send a number of events to this channel */
			counter.expect(4 * testMessages.length);
			var publishTasks = [function(publishCb) {
				testchannel.publish(testMessages, publishCb);
			}];

			publishTasks.push(function(waitCb) { setTimeout(function() {
				waitCb(null);
			}, 1000); });
			try {
				async.series(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}

					/* so now the messages are there; try querying the timeline to get messages one at a time */
				var ids = {},
					totalMessagesExpected = testMessages.length,
					nextPage = function(cb) {
						testchannel.history({limit: 1, direction: 'forwards'}, cb);
					};

				async.mapSeries(testMessages, function(expectedMessage, cb) {
						nextPage(function(err, resultPage) {
							if(err) {
								cb(err);
								return;
							}
							/* verify expected number of messages in this page */
							expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
							var resultMessage = resultPage.items[0];
							ids[resultMessage.id] = resultMessage;

							/* verify expected message */
							expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
							expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

							if(--totalMessagesExpected > 0) {
								expect(resultPage.hasNext(), 'Verify next link is present');
								nextPage = resultPage.next;
							}
							cb();
						});
					}, function(err) {
						if(err) {
							expect(false, displayError(err));
							done();
							return;
						}
						/* verify message ids are unique */
						expect(utils.keysArray(ids).length).to.equal(testMessages.length, 'Verify correct number of distinct message ids found');
						counter.assert();
						done();
					});
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		restTestOnJsonMsgpack('history_encoding_errors', function(done, rest, channelName) {
			var testchannel = rest.channels.get('persisted:' + channelName);
			var badMessage = {name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{\"foo\":\"bar\"}'};
			counter.expect(2);
			try {
				testchannel.publish(badMessage, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}
					setTimeout(function(){
						testchannel.history(function(err, resultPage) {
							if(err) {
								expect(false, displayError(err));
								done();
								return;
							}
							/* verify all messages are received */
							var message = resultPage.items[0];
							expect(message.data).to.equal(badMessage.data, 'Verify data preserved');
							expect(message.encoding).to.equal(badMessage.encoding, 'Verify encoding preserved');
							counter.assert();
							done();
						});
					}, 1000);
				});
			} catch(e) {
				console.log(e.stack);
			}
		});

		it('historyPromise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			counter.expect(5);
			var rest = helper.AblyRest({promises: true});
			var testchannel = rest.channels.get('persisted:history_promise');

			testchannel.publish('one', null).then(function() {
				return testchannel.publish('two', null);
			}).then(function() {
				return testchannel.history({limit: 1, direction: 'forwards'});
			}).then(function(resultPage) {
				expect(resultPage.items.length).to.equal(1);
				expect(resultPage.items[0].name).to.equal('one');
				return resultPage.first();
			}).then(function(resultPage) {
				expect(resultPage.items[0].name).to.equal('one');
				return resultPage.current();
			}).then(function(resultPage) {
				expect(resultPage.items[0].name).to.equal('one');
				return resultPage.next();
			}).then(function(resultPage) {
				expect(resultPage.items[0].name).to.equal('two');
			})['catch'](function(err) {
				expect(false, 'Promise chain failed with error: ' + displayError(err));
			}).finally(function() {
				counter.assert();
				done();
			});
		});
	});
});
