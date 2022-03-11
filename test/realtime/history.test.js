'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  var expect = chai.expect;
  var utils = helper.Utils;
  var preAttachMessages = utils.arrMap([1, 2, 3, 4, 5], function (i) {
    return { name: 'pre-attach-' + i, data: 'some data' };
  });
  var postAttachMessages = utils.arrMap([1, 2, 3, 4, 5], function (i) {
    return { name: 'post-attach-' + i, data: 'some data' };
  });
  var closeAndFinish = helper.closeAndFinish;
  var monitorConnection = helper.monitorConnection;

  var parallelPublishMessages = function (done, channel, messages, callback) {
    var publishTasks = utils.arrMap(messages, function (event) {
      return function (publishCb) {
        channel.publish(event.name, event.data, publishCb);
      };
    });

    try {
      async.parallel(publishTasks, function (err) {
        if (err) {
          done(err);
          return;
        }
        callback();
      });
    } catch (err) {
      done(err);
    }
  };

  describe('realtime/history', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    it('history_until_attach', function (done) {
      var rest = helper.AblyRest();
      var realtime = helper.AblyRealtime();
      var restChannel = rest.channels.get('persisted:history_until_attach');

      /* first, send a number of events to this channel before attaching */
      parallelPublishMessages(done, restChannel, preAttachMessages, function () {
        /* second, connect and attach to the channel */
        try {
          realtime.connection.whenState('connected', function () {
            var rtChannel = realtime.channels.get('persisted:history_until_attach');
            rtChannel.attach(function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              /* third, send some more events post-attach (over rest, not using the
               * new realtime connection) */

              parallelPublishMessages(done, restChannel, postAttachMessages, function () {
                /* fourth, query history using the realtime connection with
                 * untilAttach both true, false, and not present, checking that
                 * the right messages are returned in each case */

                var tests = [
                  function (callback) {
                    rtChannel.history(function (err, resultPage) {
                      if (err) {
                        callback(err);
                      }
                      try {
                        var expectedLength = preAttachMessages.length + postAttachMessages.length;
                        expect(resultPage.items.length).to.equal(
                          expectedLength,
                          'Verify all messages returned when no params',
                        );
                        callback();
                      } catch (err) {
                        callback(err);
                      }
                    });
                  },
                  function (callback) {
                    rtChannel.history({ untilAttach: false }, function (err, resultPage) {
                      if (err) {
                        callback(err);
                      }
                      try {
                        var expectedLength = preAttachMessages.length + postAttachMessages.length;
                        expect(resultPage.items.length).to.equal(
                          expectedLength,
                          'Verify all messages returned when untilAttached is false',
                        );
                        callback();
                      } catch (err) {
                        callback(err);
                      }
                    });
                  },
                  function (callback) {
                    rtChannel.history({ untilAttach: true }, function (err, resultPage) {
                      if (err) {
                        callback(err);
                      }

                      try {
                        /* verify only the pre-attached messages are received */
                        var messages = resultPage.items;
                        expect(messages.length).to.equal(
                          preAttachMessages.length,
                          'Verify right number of messages returned when untilAttached is true',
                        );
                        expect(
                          utils.arrEvery(messages, function (message) {
                            return message.name.substring(0, 10) == 'pre-attach';
                          }),
                          'Verify all returned messages were pre-attach ones',
                        ).to.be.ok;
                        callback();
                      } catch (err) {
                        callback(err);
                      }
                    });
                  },
                ];

                async.parallel(tests, function (err) {
                  closeAndFinish(done, realtime, err);
                });
              });
            });
          });
          monitorConnection(done, realtime);
        } catch (err) {
          closeAndFinish(done, realtime, err);
        }
      });
    });
  });
});
