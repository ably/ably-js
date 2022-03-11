'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  var rest;
  var expect = chai.expect;
  var exports = {};
  var restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;
  var utils = helper.Utils;
  var testMessages = [
    { name: 'event0', data: 'some data' },
    { name: 'event1', data: 'some more data' },
    { name: 'event2', data: 'and more' },
    { name: 'event3', data: 'and more' },
    { name: 'event4', data: [1, 2, 3] },
    { name: 'event5', data: { one: 1, two: 2, three: 3 } },
    { name: 'event6', data: { foo: 'bar' } },
  ];

  describe('rest/history', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRest();
        done();
      });
    });

    restTestOnJsonMsgpack('history_simple', function (done, rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */

      var publishTasks = utils.arrMap(testMessages, function (event) {
        return function (publishCb) {
          testchannel.publish(event.name, event.data, publishCb);
        };
      });

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.parallel(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline */
          testchannel.history(function (err, resultPage) {
            if (err) {
              done(err);
              return;
            }
            /* verify all messages are received */
            var messages = resultPage.items;
            expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

            /* verify message ids are unique */
            var ids = {};
            utils.arrForEach(messages, function (msg) {
              ids[msg.id] = msg;
            });
            expect(utils.keysArray(ids).length).to.equal(
              testMessages.length,
              'Verify correct number of distinct message ids found'
            );
            done();
          });
        });
      } catch (err) {
        done(err);
      }
    });

    restTestOnJsonMsgpack('history_multiple', function (done, rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */
      var publishTasks = [
        function (publishCb) {
          testchannel.publish(testMessages, publishCb);
        },
      ];

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.parallel(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline */
          testchannel.history(function (err, resultPage) {
            if (err) {
              done(err);
              return;
            }
            /* verify all messages are received */
            var messages = resultPage.items;
            expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

            /* verify message ids are unique */
            var ids = {};
            utils.arrForEach(messages, function (msg) {
              ids[msg.id] = msg;
            });
            expect(utils.keysArray(ids).length).to.equal(
              testMessages.length,
              'Verify correct number of distinct message ids found'
            );
            done();
          });
        });
      } catch (err) {
        done(err);
      }
    });

    restTestOnJsonMsgpack('history_simple_paginated_b', function (done, rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */
      var publishTasks = utils.arrMap(testMessages, function (event) {
        return function (publishCb) {
          testchannel.publish(event.name, event.data, publishCb);
        };
      });

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.series(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline to get messages one at a time */
          var ids = {},
            totalMessagesExpected = testMessages.length,
            nextPage = function (cb) {
              testchannel.history({ limit: 1, direction: 'backwards' }, cb);
            };

          testMessages.reverse();
          async.mapSeries(
            testMessages,
            function (expectedMessage, cb) {
              nextPage(function (err, resultPage) {
                if (err) {
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

                if (--totalMessagesExpected > 0) {
                  expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
                  expect(!resultPage.isLast(), 'Verify not last page').to.be.ok;
                  nextPage = resultPage.next;
                }
                cb();
              });
            },
            function (err) {
              if (err) {
                done(err);
                return;
              }
              /* verify message ids are unique */
              expect(utils.keysArray(ids).length).to.equal(
                testMessages.length,
                'Verify correct number of distinct message ids found'
              );
              done();
            }
          );
        });
      } catch (err) {
        done(err);
      }
    });

    it('history_simple_paginated_f', function (done) {
      var testchannel = rest.channels.get('persisted:history_simple_paginated_f');

      /* first, send a number of events to this channel */
      var publishTasks = utils.arrMap(testMessages, function (event) {
        return function (publishCb) {
          testchannel.publish(event.name, event.data, publishCb);
        };
      });

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.series(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline to get messages one at a time */
          var ids = {},
            totalMessagesExpected = testMessages.length,
            nextPage = function (cb) {
              testchannel.history({ limit: 1, direction: 'forwards' }, cb);
            };

          async.mapSeries(
            testMessages,
            function (expectedMessage, cb) {
              nextPage(function (err, resultPage) {
                if (err) {
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

                if (--totalMessagesExpected > 0) {
                  expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
                  nextPage = resultPage.next;
                }
                cb();
              });
            },
            function (err) {
              if (err) {
                done(err);
                return;
              }
              /* verify message ids are unique */
              expect(utils.keysArray(ids).length).to.equal(
                testMessages.length,
                'Verify correct number of distinct message ids found'
              );
              done();
            }
          );
        });
      } catch (err) {
        done(err);
      }
    });

    it('history_multiple_paginated_b', function (done) {
      var testchannel = rest.channels.get('persisted:history_multiple_paginated_b');

      /* first, send a number of events to this channel */
      var publishTasks = [
        function (publishCb) {
          testchannel.publish(testMessages, publishCb);
        },
      ];

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.series(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline to get messages one at a time */
          var ids = {},
            totalMessagesExpected = testMessages.length,
            nextPage = function (cb) {
              testchannel.history({ limit: 1, direction: 'backwards' }, cb);
            };

          testMessages.reverse();
          async.mapSeries(
            testMessages,
            function (expectedMessage, cb) {
              nextPage(function (err, resultPage) {
                if (err) {
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

                if (--totalMessagesExpected > 0) {
                  expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
                  nextPage = resultPage.next;
                }
                cb();
              });
            },
            function (err) {
              if (err) {
                done(err);
                return;
              }
              /* verify message ids are unique */
              expect(utils.keysArray(ids).length).to.equal(
                testMessages.length,
                'Verify correct number of distinct message ids found'
              );
              done();
            }
          );
        });
      } catch (err) {
        done(err);
      }
    });

    it('history_multiple_paginated_f', function (done) {
      var testchannel = rest.channels.get('persisted:history_multiple_paginated_f');

      /* first, send a number of events to this channel */
      var publishTasks = [
        function (publishCb) {
          testchannel.publish(testMessages, publishCb);
        },
      ];

      publishTasks.push(function (waitCb) {
        setTimeout(function () {
          waitCb(null);
        }, 1000);
      });
      try {
        async.series(publishTasks, function (err) {
          if (err) {
            done(err);
            return;
          }

          /* so now the messages are there; try querying the timeline to get messages one at a time */
          var ids = {},
            totalMessagesExpected = testMessages.length,
            nextPage = function (cb) {
              testchannel.history({ limit: 1, direction: 'forwards' }, cb);
            };

          async.mapSeries(
            testMessages,
            function (expectedMessage, cb) {
              nextPage(function (err, resultPage) {
                if (err) {
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

                if (--totalMessagesExpected > 0) {
                  expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
                  nextPage = resultPage.next;
                }
                cb();
              });
            },
            function (err) {
              if (err) {
                done(err);
                return;
              }
              /* verify message ids are unique */
              expect(utils.keysArray(ids).length).to.equal(
                testMessages.length,
                'Verify correct number of distinct message ids found'
              );
              done();
            }
          );
        });
      } catch (err) {
        done(err);
      }
    });

    restTestOnJsonMsgpack('history_encoding_errors', function (done, rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);
      var badMessage = { name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{"foo":"bar"}' };
      try {
        testchannel.publish(badMessage, function (err) {
          if (err) {
            done(err);
            return;
          }
          setTimeout(function () {
            testchannel.history(function (err, resultPage) {
              if (err) {
                done(err);
                return;
              }
              /* verify all messages are received */
              var message = resultPage.items[0];
              expect(message.data).to.equal(badMessage.data, 'Verify data preserved');
              expect(message.encoding).to.equal(badMessage.encoding, 'Verify encoding preserved');
              done();
            });
          }, 1000);
        });
      } catch (err) {
        done(err);
      }
    });

    if (typeof Promise !== 'undefined') {
      it('historyPromise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        var testchannel = rest.channels.get('persisted:history_promise');

        testchannel
          .publish('one', null)
          .then(function () {
            return testchannel.publish('two', null);
          })
          .then(function () {
            return testchannel.history({ limit: 1, direction: 'forwards' });
          })
          .then(function (resultPage) {
            expect(resultPage.items.length).to.equal(1);
            expect(resultPage.items[0].name).to.equal('one');
            return resultPage.first();
          })
          .then(function (resultPage) {
            expect(resultPage.items[0].name).to.equal('one');
            return resultPage.current();
          })
          .then(function (resultPage) {
            expect(resultPage.items[0].name).to.equal('one');
            return resultPage.next();
          })
          .then(function (resultPage) {
            expect(resultPage.items[0].name).to.equal('two');
            done();
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }
  });
});
