"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
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

	exports.setup_history = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			rest = helper.AblyRest();
			test.ok(true, 'Setup REST library');
			test.done();
		});
	};

	restTestOnJsonMsgpack(exports, 'history_simple', function(test, rest, channelName) {
		test.expect(2);
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
					test.ok(false, displayError(err));
					test.done();
					return;
				}

				/* so now the messages are there; try querying the timeline */
				testchannel.history(function(err, resultPage) {
					//console.log(require('util').inspect(messages));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify all messages are received */
					var messages = resultPage.items;
					test.equal(messages.length, testMessages.length, 'Verify correct number of messages found');

					/* verify message ids are unique */
					var ids = {};
					utils.arrForEach(messages, function(msg) { ids[msg.id] = msg; });
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	});

	restTestOnJsonMsgpack(exports, 'history_multiple', function(test, rest, channelName) {
		test.expect(2);
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
					test.ok(false, displayError(err));
					test.done();
					return;
				}

				/* so now the messages are there; try querying the timeline */
				testchannel.history(function(err, resultPage) {
					//console.log(require('util').inspect(messages));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify all messages are received */
		  var messages = resultPage.items;
					test.equal(messages.length, testMessages.length, 'Verify correct number of messages found');

					/* verify message ids are unique */
					var ids = {};
					utils.arrForEach(messages, function(msg) { ids[msg.id] = msg; });
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	});

	restTestOnJsonMsgpack(exports, 'history_simple_paginated_b', function(test, rest, channelName) {
		var testchannel = rest.channels.get('persisted:' + channelName);

		/* first, send a number of events to this channel */
		test.expect(5 * testMessages.length - 1);
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
					test.ok(false, displayError(err));
					test.done();
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
						test.equal(resultPage.items.length, 1, 'Verify a single message received');
						var resultMessage = resultPage.items[0];
						ids[resultMessage.id] = resultMessage;

						/* verify expected message */
						test.equal(expectedMessage.name, resultMessage.name, 'Verify expected name value present');
						test.deepEqual(expectedMessage.data, resultMessage.data, 'Verify expected data value present');

						if(--totalMessagesExpected > 0) {
							test.ok(resultPage.hasNext(), 'Verify next link is present');
							test.ok(!resultPage.isLast(), 'Verify not last page');
							nextPage = resultPage.next;
						}
						cb();
					});
				}, function(err) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify message ids are unique */
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	});

	exports.history_simple_paginated_f = function(test) {
		var testchannel = rest.channels.get('persisted:history_simple_paginated_f');

		/* first, send a number of events to this channel */
		test.expect(4 * testMessages.length);
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
					test.ok(false, displayError(err));
					test.done();
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
						test.equal(resultPage.items.length, 1, 'Verify a single message received');
						var resultMessage = resultPage.items[0];
						ids[resultMessage.id] = resultMessage;

						/* verify expected message */
						test.equal(expectedMessage.name, resultMessage.name, 'Verify expected name value present');
						test.deepEqual(expectedMessage.data, resultMessage.data, 'Verify expected data value present');

						if(--totalMessagesExpected > 0) {
							test.ok(resultPage.hasNext(), 'Verify next link is present');
							nextPage = resultPage.next;
						}
						cb();
					});
				}, function(err) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify message ids are unique */
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	exports.history_multiple_paginated_b = function(test) {
		var testchannel = rest.channels.get('persisted:history_multiple_paginated_b');

		/* first, send a number of events to this channel */
		test.expect(4 * testMessages.length);
		var publishTasks = [function(publishCb) {
			testchannel.publish(testMessages, publishCb);
		}];

		publishTasks.push(function(waitCb) { setTimeout(function() {
			waitCb(null);
		}, 1000); });
		try {
			async.series(publishTasks, function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
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
						test.equal(resultPage.items.length, 1, 'Verify a single message received');
						var resultMessage = resultPage.items[0];
						ids[resultMessage.id] = resultMessage;

						/* verify expected message */
						test.equal(expectedMessage.name, resultMessage.name, 'Verify expected name value present');
						test.deepEqual(expectedMessage.data, resultMessage.data, 'Verify expected data value present');

						if(--totalMessagesExpected > 0) {
							test.ok(resultPage.hasNext(), 'Verify next link is present');
							nextPage = resultPage.next;
						}
						cb();
					});
				}, function(err) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify message ids are unique */
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	exports.history_multiple_paginated_f = function(test) {
		var testchannel = rest.channels.get('persisted:history_multiple_paginated_f');

		/* first, send a number of events to this channel */
		test.expect(4 * testMessages.length);
		var publishTasks = [function(publishCb) {
			testchannel.publish(testMessages, publishCb);
		}];

		publishTasks.push(function(waitCb) { setTimeout(function() {
			waitCb(null);
		}, 1000); });
		try {
			async.series(publishTasks, function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
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
						test.equal(resultPage.items.length, 1, 'Verify a single message received');
						var resultMessage = resultPage.items[0];
						ids[resultMessage.id] = resultMessage;

						/* verify expected message */
						test.equal(expectedMessage.name, resultMessage.name, 'Verify expected name value present');
						test.deepEqual(expectedMessage.data, resultMessage.data, 'Verify expected data value present');

						if(--totalMessagesExpected > 0) {
							test.ok(resultPage.hasNext(), 'Verify next link is present');
							nextPage = resultPage.next;
						}
						cb();
					});
				}, function(err) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					/* verify message ids are unique */
					test.equal(utils.keysArray(ids).length, testMessages.length, 'Verify correct number of distinct message ids found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	restTestOnJsonMsgpack(exports, 'history_encoding_errors', function(test, rest, channelName) {
		var testchannel = rest.channels.get('persisted:' + channelName);
		var badMessage = {name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{\"foo\":\"bar\"}'};
		test.expect(2);
		try {
			testchannel.publish(badMessage, function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				setTimeout(function(){
					testchannel.history(function(err, resultPage) {
						if(err) {
							test.ok(false, displayError(err));
							test.done();
							return;
						}
						/* verify all messages are received */
						var message = resultPage.items[0];
						test.equal(message.data, badMessage.data, 'Verify data preserved');
						test.equal(message.encoding, badMessage.encoding, 'Verify encoding preserved');
						test.done();
					});
				}, 1000);
			});
		} catch(e) {
			console.log(e.stack);
		}
	});

	return module.exports = helper.withTimeout(exports);
});
