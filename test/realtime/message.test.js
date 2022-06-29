'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var displayError = helper.displayError;
  var utils = helper.Utils;
  let config = Ably.Realtime.Platform.Config;
  var closeAndFinish = helper.closeAndFinish;
  var createPM = Ably.Realtime.ProtocolMessage.fromDeserialized;
  var monitorConnection = helper.monitorConnection;
  var testOnAllTransports = helper.testOnAllTransports;

  var publishIntervalHelper = function (currentMessageNum, channel, dataFn, onPublish) {
    return function () {
      channel.publish('event0', dataFn(), function () {
        onPublish();
      });
    };
  };

  var publishAtIntervals = function (numMessages, channel, dataFn, onPublish) {
    for (var i = numMessages; i > 0; i--) {
      setTimeout(publishIntervalHelper(i, channel, dataFn, onPublish), 20 * i);
    }
  };

  describe('realtime/message', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('publishonce', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        var rest = helper.AblyRest();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          var testMsg = 'Hello world';
          var rtChannel = realtime.channels.get('publishonce');
          rtChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            /* subscribe to event */
            rtChannel.subscribe('event0', function (msg) {
              try {
                expect(msg.data).to.equal(testMsg, 'Unexpected msg text received');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }
              closeAndFinish(done, realtime);
            });

            /* publish event */
            var restChannel = rest.channels.get('publishonce');
            restChannel.publish('event0', testMsg);
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    /*
     * Test publishes in quick succession (on successive ticks of the event loop)
     */
    testOnAllTransports('publishfast', function (realtimeOpts) {
      return function (done) {
        try {
          var realtime = helper.AblyRealtime(realtimeOpts);
          realtime.connection.once('connected', function () {
            var channel = realtime.channels.get('publishfast_' + String(Math.random()).substr(2));
            channel.attach(function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              async.parallel(
                [
                  function (cb) {
                    channel.subscribe('event', function (msg) {
                      if (msg.data === '49') {
                        cb();
                      }
                    });
                  },
                  function (cb) {
                    var ackd = 0;
                    var publish = function (i) {
                      channel.publish('event', i.toString(), function (err) {
                        try {
                          expect(
                            !err,
                            'successfully published ' + i + (err ? ' err was ' + displayError(err) : '')
                          ).to.be.ok;
                        } catch (err) {
                          cb(err);
                          return;
                        }
                        ackd++;
                        if (ackd === 50) cb();
                      });
                      if (i < 49) {
                        setTimeout(function () {
                          publish(i + 1);
                        }, 0);
                      }
                    };
                    publish(0);
                  },
                ],
                function (err) {
                  closeAndFinish(done, realtime, err);
                }
              );
            });
          });
          monitorConnection(done, realtime);
        } catch (err) {
          closeAndFinish(done, realtime, err);
        }
      };
    });

    /*
     * Test queuing: publishing a series of messages that start before the lib is connected
     * Also checks they arrive in the right order
     */
    testOnAllTransports('publishQueued', function (realtimeOpts) {
      return function (done) {
        var txRealtime, rxRealtime;
        try {
          txRealtime = helper.AblyRealtime(utils.mixin(realtimeOpts, { autoConnect: false }));
          rxRealtime = helper.AblyRealtime();
          var txChannel = txRealtime.channels.get('publishQueued_' + String(Math.random()).substr(2));
          var rxChannel = rxRealtime.channels.get(txChannel.name);

          async.series(
            [
              function (cb) {
                rxRealtime.connection.once('connected', function () {
                  cb();
                });
              },
              function (cb) {
                rxChannel.attach(function (err) {
                  cb(err);
                });
              },
              function (cb) {
                async.parallel(
                  [
                    function (parCb) {
                      var expectedMsgNum = 0;
                      rxChannel.subscribe('event', function (msg) {
                        var num = msg.data.num;
                        try {
                          expect(expectedMsgNum).to.equal(num, 'Event ' + num + ' was in the right order');
                        } catch (err) {
                          parCb(err);
                          return;
                        }
                        expectedMsgNum++;
                        if (num === 49) parCb();
                      });
                    },
                    function (parCb) {
                      var ackd = 0;
                      var publish = function (i) {
                        txChannel.publish('event', { num: i }, function (err) {
                          try {
                            expect(
                              !err,
                              'successfully published ' + i + (err ? ' err was ' + displayError(err) : '')
                            ).to.be.ok;
                          } catch (err) {
                            parCb(err);
                            return;
                          }
                          ackd++;
                          if (ackd === 50) parCb();
                        });
                        if (i < 49) {
                          setTimeout(function () {
                            publish(i + 1);
                          }, 20);
                        }
                      };
                      publish(0);
                    },
                    function (parCb) {
                      txRealtime.connection.once('connected', function () {
                        parCb();
                      });
                      txRealtime.connection.connect();
                    },
                  ],
                  cb
                );
              },
            ],
            function (err) {
              closeAndFinish(done, [rxRealtime, txRealtime], err);
            }
          );
        } catch (err) {
          closeAndFinish(done, [rxRealtime, txRealtime], err);
        }
      };
    });

    /*
     * Test that a message is not sent back to the same realtime client
     * when echoMessages is false (RTC1a and RTL7f)
     *
     * Test that a message is sent back to the same realtime client
     * when echoMessages is true (RTC1a and RTL7f)
     */
    it('publishEcho', function (done) {
      // set up two realtimes
      var rtNoEcho = helper.AblyRealtime({ echoMessages: false }),
        rtEcho = helper.AblyRealtime({ echoMessages: true }),
        rtNoEchoChannel = rtNoEcho.channels.get('publishecho'),
        rtEchoChannel = rtEcho.channels.get('publishecho'),
        testMsg1 = 'Hello',
        testMsg2 = 'World!';

      // We expect to see testMsg2 on rtNoEcho and testMsg1 on both rtNoEcho and rtEcho
      var receivedMessagesNoEcho = [],
        receivedMessagesEcho = [];

      var finishTest = function () {
        if (receivedMessagesNoEcho.length + receivedMessagesEcho.length == 3) {
          try {
            expect(receivedMessagesNoEcho.length).to.equal(1, 'Received exactly one message on rtNoEcho');
            expect(receivedMessagesEcho.length).to.equal(2, 'Received exactly two messages on rtEcho');
            expect(receivedMessagesNoEcho[0]).to.equal(testMsg2, 'Received testMsg2 on rtNoEcho');
            expect(receivedMessagesEcho[0]).to.equal(testMsg1, 'Received testMsg1 on rtEcho first');
            expect(receivedMessagesEcho[1]).to.equal(testMsg2, 'Received testMsg2 on rtEcho second');
          } catch (err) {
            closeAndFinish(done, [rtNoEcho, rtEcho], err);
            return;
          }
          closeAndFinish(done, [rtNoEcho, rtEcho]);
        }
      };

      // attach rtNoEchoChannel
      rtNoEchoChannel.attach(function (err) {
        try {
          expect(!err, 'Attached to rtNoEchoChannel with no error').to.be.ok;
        } catch (err) {
          closeAndFinish(done, [rtNoEcho, rtEcho], err);
          return;
        }
        monitorConnection(done, rtNoEcho);

        // once rtNoEchoChannel attached, subscribe to event0
        rtNoEchoChannel.subscribe('event0', function (msg) {
          receivedMessagesNoEcho.push(msg.data);
          finishTest();
        });

        // attach rtEchoChannel
        rtEchoChannel.attach(function (err) {
          try {
            expect(!err, 'Attached to rtEchoChannel with no error').to.be.ok;
          } catch (err) {
            closeAndFinish(done, [rtNoEcho, rtEcho], err);
            return;
          }
          monitorConnection(done, rtEcho);

          // once rtEchoChannel attached, subscribe to event0
          rtEchoChannel.subscribe('event0', function (msg) {
            receivedMessagesEcho.push(msg.data);
            finishTest();
          });

          // publish testMsg1 via rtNoEcho
          rtNoEchoChannel.publish('event0', testMsg1, function () {
            // publish testMsg2 via rtEcho
            rtEchoChannel.publish('event0', testMsg2);
          });
        });
      });
    });

    it('publishVariations', function (done) {
      var testData = 'Some data';
      var testArguments = [
        [{ name: 'objectWithName' }],
        [{ name: 'objectWithNameAndNullData', data: null }],
        [{ name: 'objectWithNameAndUndefinedData', data: undefined }],
        [{ name: 'objectWithNameAndEmptyStringData', data: '' }],
        ['nameAndNullData', null],
        ['nameAndUndefinedData', undefined],
        ['nameAndEmptyStringData', ''],
        ['nameAndData', testData],
        [{ name: 'objectWithNameAndData', data: testData }],
        // 5 messages with null name,
        [null, testData],
        [{ name: null, data: testData }],
        [null, null],
        [{ name: null }],
        [{ name: null, data: null }],
      ];
      var realtime;

      try {
        /* set up realtime */
        realtime = helper.AblyRealtime();
        var rest = helper.AblyRest();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          var rtChannel = realtime.channels.get('publishVariations');
          rtChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            /* subscribe to different message types */
            var messagesReceived = 0;
            rtChannel.subscribe(function (msg) {
              ++messagesReceived;
              try {
                switch (msg.name) {
                  case 'objectWithName':
                  case 'objectWithNameAndCallback':
                  case 'objectWithNameAndNullData':
                  case 'objectWithNameAndUndefinedData':
                  case 'nameAndNullData':
                  case 'nameAndUndefinedData':
                    expect(typeof msg.data).to.equal('undefined', 'Msg data was received where none expected');
                    break;
                  case 'nameAndEmptyStringData':
                  case 'objectWithNameAndEmptyStringData':
                    expect(msg.data).to.equal(
                      '',
                      'Msg data received was a ' + typeof msg.data + ' when should have been an empty string'
                    );
                    break;
                  case 'objectWithNameAndFalseData':
                  case 'nameAndFalseData':
                    expect(msg.data).to.equal(
                      false,
                      'Msg data received was a ' + typeof msg.data + ' when should have been a bool false'
                    );
                    break;
                  case 'nameAndData':
                  case 'nameAndDataAndCallback':
                  case 'objectWithNameAndData':
                  case 'objectWithNameAndDataAndCallback':
                    expect(msg.data).to.equal(testData, 'Msg data ' + msg.data + 'Unexpected message data received');
                    break;
                  case undefined:
                    if (msg.data) {
                      // 3 messages: null name and data, null name and data and callback, object with null name and data
                      expect(msg.data).to.equal(testData, 'Msg data ' + msg.data + 'Unexpected message data received');
                    } else {
                      // 3 messages: null name and null data, object with null name and no data, object with null name and null data
                      expect(typeof msg.data).to.equal('undefined', 'Msg data was received where none expected');
                    }
                    break;
                  default:
                    closeAndFinish(done, realtime, new Error('Unexpected message ' + msg.name + 'received'));
                    return;
                }
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              if (messagesReceived == testArguments.length) {
                setTimeout(function () {
                  closeAndFinish(done, realtime);
                }, 2000);
              }
            });

            /* publish events */
            var restChannel = rest.channels.get('publishVariations');
            async.eachSeries(
              testArguments,
              function iterator(args, callback) {
                args.push(callback);
                restChannel.publish.apply(restChannel, args);
              },
              function (err) {
                if (err) {
                  closeAndFinish(done, realtime, err);
                  return;
                }
              }
            );
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('publishDisallowed', function (done) {
      var testArguments = [
        [{ name: 'objectAndBoolData', data: false }],
        ['nameAndBoolData', false],
        [{ name: 'objectAndNumericData', data: 0 }],
        ['nameAndNumericData', 0],
        [{ name: 'objectAndOtherObjectData', data: new Date() }],
        ['nameAndOtherObjectData', new Date()],
      ];

      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        var rest = helper.AblyRest();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          var rtChannel = realtime.channels.get('publishDisallowed');
          rtChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            /* publish events */
            var restChannel = rest.channels.get('publishDisallowed');
            for (var i = 0; i < testArguments.length; i++) {
              try {
                restChannel.publish.apply(restChannel, testArguments[i]);
                closeAndFinish(done, realtime, new Error('Exception was not raised'));
              } catch (err) {
                try {
                  expect(err.code).to.equal(40013, 'Invalid data type exception raised');
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                  return;
                }
              }
            }
            closeAndFinish(done, realtime);
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('publishEncodings', function (done) {
      var testData = 'testData';
      var testArguments = [
        // valid
        [{ name: 'justJson', encoding: 'json', data: '{"foo":"bar"}' }],
        // invalid -- encoding ending in utf-8 implies data is binary
        [{ name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{"foo":"bar"}' }],
        // valid
        [{ name: 'utf8base64', encoding: 'utf-8/base64', data: 'dGVzdERhdGE=' }],
        // invalid -- nonsense/corrupt encoding
        [{ name: 'nonsense', encoding: 'choahofhpxf', data: testData }],
      ];

      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        var rest = helper.AblyRest();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          var rtChannel = realtime.channels.get('publishEncodings');
          rtChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            var subscribefn = function (cb) {
              var messagesReceived = 0;
              rtChannel.subscribe(function (msg) {
                ++messagesReceived;
                try {
                  switch (msg.name) {
                    case 'justJson':
                      expect(msg.data).to.deep.equal({ foo: 'bar' }, 'justJson: correct decoded data');
                      expect(msg.encoding).to.deep.equal(null, 'justJson: encoding stripped on decoding');
                      break;
                    case 'jsonUtf8string':
                      expect(msg.data).to.equal('{"foo":"bar"}', 'justJsonUTF8string: data should be untouched');
                      expect(msg.encoding).to.equal('json/utf-8', 'justJsonUTF8string: encoding should be untouched');
                      break;
                    case 'utf8base64':
                      expect(msg.data).to.equal('testData', 'utf8base64: correct decoded data');
                      expect(msg.encoding).to.equal(null, 'utf8base64: encoding stripped on decoding');
                      break;
                    case 'nonsense':
                      expect(msg.data).to.deep.equal(testData, 'nonsense: data untouched');
                      expect(msg.encoding).to.equal('choahofhpxf', 'nonsense: encoding untouched');
                      break;
                    default:
                      cb(new Error('Unexpected message ' + msg.name + ' received'));
                  }
                  if (messagesReceived == testArguments.length) {
                    cb();
                  }
                } catch (err) {
                  cb(err);
                }
              });
            };

            /* publish events */
            var publishfn = function (cb) {
              var restChannel = rest.channels.get('publishEncodings');
              async.eachSeries(
                testArguments,
                function iterator(item, callback) {
                  try {
                    restChannel.publish(item, function (err) {
                      try {
                        expect(!err, 'Successfully published').to.be.ok;
                      } catch (err) {
                        callback(err);
                      }
                      callback();
                    });
                  } catch (err) {
                    callback(err);
                  }
                },
                cb
              );
            };

            async.parallel([subscribefn, publishfn], function (err) {
              closeAndFinish(done, realtime, err);
            });
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('restpublish', function (done) {
      var count = 10;
      var rest = helper.AblyRest();
      var realtime = helper.AblyRealtime();
      var messagesSent = [];
      var sendchannel = rest.channels.get('restpublish');
      var recvchannel = realtime.channels.get('restpublish');
      /* subscribe to event */
      recvchannel.subscribe('event0', function (msg) {
        try {
          expect(-1).to.not.equal(utils.arrIndexOf(messagesSent, msg.data), 'Received unexpected message text');
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        if (!--count) {
          clearInterval(timer);
          closeAndFinish(done, realtime);
        }
      });
      var timer = setInterval(function () {
        // console.log('sending: ' + count);
        var msgText = 'Hello world at: ' + new Date();
        messagesSent.push(msgText);
        sendchannel.publish('event0', msgText);
      }, 500);
    });

    testOnAllTransports('publish', function (realtimeOpts) {
      return function (done) {
        var count = 10;
        var cbCount = 10;
        var checkFinish = function () {
          if (count <= 0 && cbCount <= 0) {
            closeAndFinish(done, realtime);
          }
        };
        var onPublish = function () {
          --cbCount;
          checkFinish();
        };
        var realtime = helper.AblyRealtime(realtimeOpts);
        var channel = realtime.channels.get('publish ' + JSON.stringify(realtimeOpts));
        /* subscribe to event */
        channel.subscribe(
          'event0',
          function () {
            --count;
            checkFinish();
          },
          function () {
            var dataFn = function () {
              return 'Hello world at: ' + new Date();
            };
            publishAtIntervals(count, channel, dataFn, onPublish);
          }
        );
      };
    });

    it('duplicateMsgId', function (done) {
      var realtime = helper.AblyRealtime({ log: { level: 4 } }),
        channel = realtime.channels.get('duplicateMsgId'),
        received = 0;

      channel.subscribe(function (_msg) {
        received++;
      });
      channel.once('attached', function () {
        realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 15,
            channel: channel.name,
            id: 'foo:0',
            connectionSerial: 0,
            messages: [{ name: null, data: null }],
          })
        );

        /* add some nonmessage channel message inbetween */
        realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 11,
            channel: channel.name,
          })
        );

        realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 15,
            channel: channel.name,
            id: 'foo:0',
            connectionSerial: 1,
            messages: [{ name: null, data: null }],
          })
        );

        try {
          expect(received).to.equal(1);
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        closeAndFinish(done, realtime);
      });
    });

    it('duplicateConnectionId', function (done) {
      var realtime = helper.AblyRealtime({ log: { level: 4 } }),
        channel = realtime.channels.get('duplicateConnectionId'),
        received = 0;

      channel.subscribe(function (_msg) {
        received++;
      });
      channel.once('attached', function () {
        realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 15,
            channel: channel.name,
            id: 'foo:0',
            connectionSerial: 0,
            messages: [{ name: null, data: null }],
          })
        );

        realtime.connection.connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 15,
            channel: channel.name,
            id: 'bar:0',
            connectionSerial: 0,
            messages: [{ name: null, data: null }],
          })
        );

        try {
          expect(received).to.equal(1);
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        closeAndFinish(done, realtime);
      });
    });

    /* Authenticate with a clientId and ensure that the clientId is not sent in the Message
	   and is implicitly added when published */
    it('implicit_client_id_0', function (done) {
      var clientId = 'implicit_client_id_0',
        realtime = helper.AblyRealtime({ clientId: clientId });

      realtime.connection.once('connected', function () {
        var transport = realtime.connection.connectionManager.activeProtocol.transport,
          originalSend = transport.send;

        transport.send = function (message) {
          try {
            if (message.action === 15) {
              expect(message.messages[0].name === 'event0', 'Outgoing message interecepted').to.be.ok;
              expect(!message.messages[0].clientId, 'client ID is not added by the client library as it is implicit').to
                .be.ok;
            }
            originalSend.apply(transport, arguments);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        };

        var channel = realtime.channels.get('implicit_client_id_0');
        /* subscribe to event */
        channel.subscribe('event0', function (message) {
          try {
            expect(message.clientId == clientId, 'Client ID was added implicitly').to.be.ok;
          } catch (err) {
            closeAndFinish(done, realtime, err);
            returnl;
          }
          closeAndFinish(done, realtime);
        });
        channel.publish('event0', null);
      });
    });

    /* Authenticate with a clientId and explicitly provide the same clientId in the Message
	   and ensure it is published */
    it('explicit_client_id_0', function (done) {
      var clientId = 'explicit_client_id_0',
        /* Use a fixed transport as intercepting transport.send */
        realtime = helper.AblyRealtime({ clientId: clientId, transports: [helper.bestTransport] });

      realtime.connection.once('connected', function () {
        var transport = realtime.connection.connectionManager.activeProtocol.transport,
          originalSend = transport.send;

        transport.send = function (message) {
          try {
            if (message.action === 15) {
              expect(message.messages[0].name === 'event0', 'Outgoing message interecepted').to.be.ok;
              expect(message.messages[0].clientId === clientId, 'client ID is present when published to Ably').to.be.ok;
            }
            originalSend.apply(transport, arguments);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        };

        var channel = realtime.channels.get('explicit_client_id_0');
        /* subscribe to event */
        channel.attach(function (err) {
          if (err) {
            try {
              expect(!err, err && helper.displayError(err)).to.be.ok;
            } catch (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            closeAndFinish(done, realtime);
          }
          async.parallel(
            [
              function (cb) {
                channel.subscribe('event0', function (message) {
                  try {
                    expect(message.clientId == clientId, 'Client ID was added implicitly').to.be.ok;
                  } catch (err) {
                    cb(err);
                    return;
                  }
                  cb();
                });
              },
              function (cb) {
                channel.publish({ name: 'event0', clientId: clientId }, function (err) {
                  cb(err);
                });
              },
            ],
            function (err) {
              closeAndFinish(done, realtime, err);
            }
          );
        });
      });
    });

    /* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
	   and expect it to not be published and be rejected */
    it('explicit_client_id_1', function (done) {
      var clientId = 'explicit_client_id_1',
        invalidClientId = 'invalid',
        rest = helper.AblyRest();

      rest.auth.requestToken({ clientId: clientId }, function (err, token) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(token.clientId === clientId, 'client ID is present in the Token').to.be.ok;
        } catch (err) {
          done(err);
          return;
        }

        /* Use a fixed transport as intercepting transport.send */
        var realtime = helper.AblyRealtime({ token: token.token, transports: [helper.bestTransport] }),
          channel = realtime.channels.get('explicit_client_id_1');

        // Publish before authentication to ensure the client library does not reject the message as the clientId is not known
        channel.publish({ name: 'event0', clientId: invalidClientId }, function (err) {
          try {
            expect(err, 'Message was not published').to.be.ok;
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
          setTimeout(function () {
            closeAndFinish(done, realtime);
          }, 500); // ensure that the message is not published
        });

        realtime.connection.connectionManager.on('transport.pending', function (transport) {
          var originalSend = transport.send;

          transport.send = function (message) {
            try {
              if (message.action === 15) {
                expect(message.messages[0].name === 'event0', 'Outgoing message interecepted').to.be.ok;
                expect(message.messages[0].clientId === invalidClientId, 'client ID is present when published to Ably')
                  .to.be.ok;
              }
              originalSend.apply(transport, arguments);
            } catch (err) {
              closeAndFinish(done, realtime, err);
            }
          };

          /* subscribe to event */
          channel.subscribe('event0', function (message) {
            closeAndFinish(done, realtime, new Error('Message should never have been received'));
          });
        });
      });
    });

    it('subscribe_with_event_array', function (done) {
      var realtime = helper.AblyRealtime(),
        channel = realtime.channels.get('subscribe_with_event_array');

      async.series(
        [
          function (cb) {
            realtime.connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach(function (err) {
              cb(err);
            });
          },
          function (outercb) {
            async.parallel(
              [
                function (innercb) {
                  var received = 0;
                  channel.subscribe(['a', 'b'], function (message) {
                    try {
                      expect(message.name === 'a' || message.name === 'b', 'Correct messages received').to.be.ok;
                    } catch (err) {
                      innercb(err);
                      return;
                    }
                    ++received;
                    if (received === 2) {
                      /* wait a tick to make sure no more messages come in */
                      config.nextTick(function () {
                        innercb();
                      });
                    }
                  });
                },
                function (innercb) {
                  channel.publish([{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }], function (err) {
                    innercb(err);
                  });
                },
              ],
              outercb
            );
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    it('subscribe_with_filter_object', function (done) {
      const realtime = helper.AblyRealtime();
      const channel = realtime.channels.get('subscribe_with_filter_object');

      function send(cb) {
        channel.publish(
          [
            {
              name: 'correct',
              extras: {
                ref: {
                  type: 'com.ably.test',
                  timeserial: '0123456789',
                },
              },
            },
            {
              name: 'incorrect-noref',
            },
            {
              name: 'incorrect-badtype',
              extras: {
                ref: {
                  type: 'com.ably.incorrect',
                  timeserial: '0123456789',
                },
              },
            },
            {
              name: 'incorrect-badid',
              extras: {
                ref: {
                  type: 'com.ably.test',
                  timeserial: '000000000000',
                },
              },
            },
          ],
          cb
        );
      }

      function subscribe(cb) {
        channel.subscribe(
          {
            refType: 'com.ably.test',
            refTimeserial: '0123456789',
          },
          (m) => {
            try {
              expect(m.name).to.be.equal('correct', 'Correct message received');
            } catch (e) {
              return cb(e);
            }
            // Wait for any errant messages to arrive before continuing
            config.nextTick(cb);
          }
        );
      }

      async.series(
        [
          (cb) => realtime.connection.once('connected', () => cb()),
          (cb) => channel.attach(cb),
          (cb) => async.parallel([subscribe, send], cb),
        ],
        (err) => closeAndFinish(done, realtime, err)
      );
    });

    it('unsubscribe_with_filter_object', function (done) {
      const realtime = helper.AblyRealtime();
      const channel = realtime.channels.get('unsubscribe_with_filter_object');

      function send(cb) {
        channel.publish(
          [
            {
              name: 'incorrect',
              extras: {
                ref: {
                  type: 'com.ably.test',
                  id: '0123456789',
                },
              },
            },
          ],
          cb
        );
      }

      function unsubscribe(cb) {
        try {
          const listener = () => expect.fail('Listener should not fire');
          channel.subscribe({ refType: 'com.ably.test', refTimeserial: '0123456789' }, listener);
          expect(channel.filteredSubscriptions.has(listener), 'Listener should initially be present').to.be.true;
          channel.unsubscribe(listener);
          expect(
            channel.filteredSubscriptions.has(listener),
            'Listener should no longer be present after unsubscribing'
          ).to.be.false;
          config.nextTick(cb);
        } catch (e) {
          cb(e);
        }
      }

      async.series(
        [(cb) => realtime.connection.once('connected', () => cb()), (cb) => channel.attach(cb), unsubscribe, send],
        (err) => closeAndFinish(done, realtime, err)
      );
    });

    it('extras_field', function (done) {
      var realtime = helper.AblyRealtime(),
        channel = realtime.channels.get('extras_field'),
        extras = { headers: { some: 'metadata' } };

      async.series(
        [
          function (cb) {
            realtime.connection.once('connected', function () {
              cb();
            });
          },
          channel.attach.bind(channel),
          function (outercb) {
            async.parallel(
              [
                function (innercb) {
                  var received = 0;
                  channel.subscribe(function (message) {
                    try {
                      expect(message.extras).to.deep.equal(extras, 'Check extras is present');
                    } catch (err) {
                      innercb(err);
                      return;
                    }
                    innercb();
                  });
                },
                function (innercb) {
                  channel.publish([{ name: 'a', extras: extras }], innercb);
                },
              ],
              outercb
            );
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /* TO3l8; CD2C; RSL1i */
    it('maxMessageSize', function (done) {
      var realtime = helper.AblyRealtime(),
        connectionManager = realtime.connection.connectionManager,
        channel = realtime.channels.get('maxMessageSize');

      realtime.connection.once('connected', function () {
        connectionManager.once('connectiondetails', function (details) {
          channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', function (err) {
            try {
              expect(err, 'Check publish refused').to.be.ok;
              expect(err.code).to.equal(40009);
            } catch (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            closeAndFinish(done, realtime);
          });
        });
        var connectionDetails = connectionManager.connectionDetails;
        connectionDetails.maxMessageSize = 64;
        connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 4,
            connectionDetails: connectionDetails,
          })
        );
      });
    });

    /* RTL6d: publish a series of messages that exercise various bundling
     * constraints, check they're satisfied */
    it.skip('bundling', function (done) {
      var realtime = helper.AblyRealtime({ maxMessageSize: 256, autoConnect: false }),
        channelOne = realtime.channels.get('bundlingOne'),
        channelTwo = realtime.channels.get('bundlingTwo');

      /* RTL6d3; RTL6d5 */
      channelTwo.publish('2a', { expectedBundle: 0 });
      channelOne.publish('a', { expectedBundle: 1 });
      channelOne.publish([
        { name: 'b', data: { expectedBundle: 1 } },
        { name: 'c', data: { expectedBundle: 1 } },
      ]);
      channelOne.publish('d', { expectedBundle: 1 });
      channelTwo.publish('2b', { expectedBundle: 2 });
      channelOne.publish('e', { expectedBundle: 3 });
      channelOne.publish({ name: 'f', data: { expectedBundle: 3 } });
      /* RTL6d2 */
      channelOne.publish({ name: 'g', data: { expectedBundle: 4 }, clientId: 'foo' });
      channelOne.publish({ name: 'h', data: { expectedBundle: 4 }, clientId: 'foo' });
      channelOne.publish({ name: 'i', data: { expectedBundle: 5 }, clientId: 'bar' });
      channelOne.publish('j', { expectedBundle: 6 });
      /* RTL6d1 */
      channelOne.publish('k', {
        expectedBundle: 7,
        moreData:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });
      channelOne.publish('l', { expectedBundle: 8 });
      /* RTL6d7 */
      channelOne.publish({ name: 'm', id: 'bundle_m', data: { expectedBundle: 9 } });
      channelOne.publish('z_last', { expectedBundle: 10 });

      var queue = realtime.connection.connectionManager.queuedMessages;
      var messages;
      try {
        for (var i = 0; i <= 10; i++) {
          messages = queue.messages[i].message.messages || queue.messages[i].message.presence;
          for (var j = 0; j < messages.length; j++) {
            expect(JSON.parse(messages[j].data).expectedBundle).to.equal(i);
          }
        }
      } catch (err) {
        closeAndFinish(done, realtime, err);
        return;
      }

      /* RTL6d6 */
      var currentName = '';
      channelOne.subscribe(function (msg) {
        try {
          expect(currentName < msg.name, 'Check final ordering preserved').to.be.ok;
        } catch (err) {
          closeAndFinish(done, realtime, err);
        }
        currentName = msg.name;
        if (currentName === 'z_last') {
          closeAndFinish(done, realtime);
        }
      });
      realtime.connect();
    });

    it('idempotentRealtimePublishing', function (done) {
      var realtime = helper.AblyRealtime(),
        channel = realtime.channels.get('idempotentRealtimePublishing');

      channel.attach(function (err) {
        if (err) {
          closeAndFinish(done, realtime, err);
          return;
        }

        /* subscribe to event */
        var event0Msgs = [];
        channel.subscribe('event0', function (msg) {
          event0Msgs.push(msg);
        });

        channel.subscribe('end', function (msg) {
          try {
            expect(event0Msgs.length).to.equal(1, 'Expect only one event0 message to be received');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          closeAndFinish(done, realtime);
        });

        /* publish event */
        channel.publish({ name: 'event0', id: 'some_msg_id' });
        channel.publish({ name: 'event0', id: 'some_msg_id' });
        channel.publish({ name: 'event0', id: 'some_msg_id' });
        channel.publish('end', null);
      });
    });

    if (typeof Promise !== 'undefined') {
      it('publishpromise', function (done) {
        var realtime = helper.AblyRealtime({ promises: true });
        var channel = realtime.channels.get('publishpromise');

        var publishPromise = realtime.connection
          .once('connected')
          .then(function (connectionStateChange) {
            expect(connectionStateChange.current).to.equal(
              'connected',
              'Check promise is resolved with a connectionStateChange'
            );
            return channel.attach();
          })
          .then(function () {
            return channel.publish('name', 'data');
          })
          ['catch'](function (err) {
            closeAndFinish(done, realtime, err);
          });

        var subscribePromise;
        var messagePromise = new Promise(function (msgResolve) {
          subscribePromise = channel.subscribe('name', function (msg) {
            msgResolve();
          });
        });

        var channelFailedPromise = realtime.channels
          .get(':invalid')
          .attach()
          ['catch'](function (err) {
            expect(err.code).to.equal(40010, 'Check err passed through correctly');
          });

        Promise.all([publishPromise, subscribePromise, messagePromise, channelFailedPromise])
          .then(function () {
            closeAndFinish(done, realtime);
          })
          ['catch'](function (err) {
            closeAndFinish(done, realtime, err);
          });
      });
    }
  });
});
