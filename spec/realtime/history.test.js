"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('realtime/history', function (expect, counter) {
		var rest, exports = {},
			displayError = helper.displayError,
			utils = helper.Utils,
			preAttachMessages = utils.arrMap([1,2,3,4,5], function(i) {
				return { name: 'pre-attach-' + i,
					data: 'some data' }
			}),
			postAttachMessages = utils.arrMap([1,2,3,4,5], function(i) {
				return { name: 'post-attach-' + i,
					data: 'some data' }
			}),
			closeAndFinish = helper.closeAndFinish,
			monitorConnection = helper.monitorConnection;

		var parallelPublishMessages = function(done, channel, messages, callback) {
			var publishTasks = utils.arrMap(messages, function(event) {
				return function(publishCb) {
					channel.publish(event.name, event.data, publishCb);
				};
			});

			try {
				async.parallel(publishTasks, function(err) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}
					callback();
				});
			} catch(e) {
				console.log(e.stack);
			}
		};

		it('setup_realtime_history', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		it('history_until_attach', function(done) {
			counter.expect(4);
			var rest = helper.AblyRest();
			var realtime = helper.AblyRealtime();
			var restChannel = rest.channels.get('persisted:history_until_attach');

			/* first, send a number of events to this channel before attaching */
			parallelPublishMessages(done, restChannel, preAttachMessages, function(){

				/* second, connect and attach to the channel */
				try {
					realtime.connection.whenState('connected', function() {
						var rtChannel = realtime.channels.get('persisted:history_until_attach');
						rtChannel.attach(function(err) {
							if(err) {
								expect(false, 'Attach failed with error: ' + displayError(err));
								closeAndFinish(done, realtime);
								return;
							}

							/* third, send some more events post-attach (over rest, not using the
							* new realtime connection) */

							parallelPublishMessages(done, restChannel, postAttachMessages, function(){

								/* fourth, query history using the realtime connection with
								* untilAttach both true, false, and not present, checking that
								* the right messages are returned in each case */

								var tests = [
									function(callback) {
										rtChannel.history(function(err, resultPage) {
											if(err) { callback(err); }
											var expectedLength = preAttachMessages.length + postAttachMessages.length
											expect(resultPage.items.length).to.equal(expectedLength, 'Verify all messages returned when no params');
											callback();
										});
									},
									function(callback) {
										rtChannel.history({untilAttach: false}, function(err, resultPage) {
											if(err) { callback(err); }
											var expectedLength = preAttachMessages.length + postAttachMessages.length
											expect(resultPage.items.length).to.equal(expectedLength, 'Verify all messages returned when untilAttached is false');
											callback();
										});
									},
									function(callback) {
										rtChannel.history({untilAttach: true}, function(err, resultPage) {
											if(err) { callback(err); }

											/* verify only the pre-attached messages are received */
											var messages = resultPage.items;
											expect(messages.length).to.equal(preAttachMessages.length, 'Verify right number of messages returned when untilAttached is true');
											expect(utils.arrEvery(messages, function(message) {
												return message.name.substring(0,10) == "pre-attach";
											}), "Verify all returned messages were pre-attach ones")
											callback();
										});
									}
								]

								async.parallel(tests, function(err){
									if(err) {
										expect(false, displayError(err));
										closeAndFinish(done, realtime);
										return;
									}
									counter.assert();
									closeAndFinish(done, realtime);
								})
							});
						});
					});
					monitorConnection(done, expect, realtime);
				} catch(e) {
					expect(false, 'Channel attach failed with exception: ' + e.stack);
					closeAndFinish(done, realtime);
				}
			});
		});
	});
});
