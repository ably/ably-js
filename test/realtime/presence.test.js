'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var utils = helper.Utils;
  var createPM = Ably.Realtime.ProtocolMessage.fromDeserialized;
  var closeAndFinish = helper.closeAndFinish;
  var monitorConnection = helper.monitorConnection;

  function extractClientIds(presenceSet) {
    return utils
      .arrMap(presenceSet, function (presmsg) {
        return presmsg.clientId;
      })
      .sort();
  }

  function extractMember(presenceSet, clientId) {
    return helper.arrFind(presenceSet, function (member) {
      return member.clientId === clientId;
    });
  }

  var rest, authToken, authToken2;
  var testClientId = 'testclient',
    testClientId2 = 'testclient2';

  var createListenerChannel = function (channelName, callback) {
    var channel, realtime;
    try {
      realtime = helper.AblyRealtime();
      realtime.connection.on('connected', function () {
        channel = realtime.channels.get(channelName);
        channel.attach(function (err) {
          callback(err, realtime, channel);
        });
      });
    } catch (err) {
      callback(err, realtime);
    }
  };

  var listenerFor = function (eventName, expectedClientId) {
    return function (channel, callback) {
      var presenceHandler = function (presmsg) {
        if (this.event === eventName) {
          if (expectedClientId !== undefined) {
            expect(presmsg.clientId).to.equal(expectedClientId, 'Verify correct clientId');
          }
          channel.presence.unsubscribe(presenceHandler);
          callback();
        }
      };
      channel.presence.subscribe(presenceHandler);
    };
  };

  var runTestWithEventListener = function (done, channel, eventListener, testRunner) {
    try {
      createListenerChannel(channel, function (err, listenerRealtime, presenceChannel) {
        if (err) {
          closeAndFinish(done, listenerRealtime, err);
          return;
        }

        async.parallel(
          [
            function (cb) {
              try {
                eventListener(presenceChannel, cb);
              } catch (err) {
                cb(err);
              }
            },
            testRunner,
          ],
          function (err, res) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            // testRunner might or might not call back with an open realtime
            var openConnections = res[1] && res[1].close ? [listenerRealtime, res[1]] : listenerRealtime;
            closeAndFinish(done, openConnections);
          }
        );
      });
    } catch (err) {
      done(err);
    }
  };

  describe('realtime/presence', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        // Create authTokens associated with specific clientIds
        try {
          rest = helper.AblyRest();
          rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
            if (err) {
              done(err);
              return;
            }
            authToken = tokenDetails;
            try {
              expect(tokenDetails.clientId).to.equal(testClientId, 'Verify client id');
            } catch (err) {
              done(err);
              return;
            }

            rest.auth.requestToken({ clientId: testClientId2 }, function (err, tokenDetails) {
              if (err) {
                done(err);
                return;
              }
              authToken2 = tokenDetails;
              try {
                expect(tokenDetails.clientId).to.equal(testClientId2, 'Verify client id (2)');
              } catch (err) {
                done(err);
                return;
              }
              done();
            });
          });
        } catch (err) {
          done(err);
        }
      });
    });

    /*
     * Attach to channel, enter presence channel with data and await entered event
     */
    it.skip('presenceAttachAndEnter', function (done) {
      var channelName = 'attachAndEnter';
      var attachAndEnter = function (cb) {
        /* set up authenticated connection */
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter('Test client data (enter0)', function (err) {
              cb(err, clientRealtime);
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), attachAndEnter);
    });

    /*
     * Enter presence channel without prior attach and await entered event
     */
    it('presenceEnterWithoutAttach', function (done) {
      var channelName = 'enterWithoutAttach';
      var enterWithoutAttach = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.presence.enter('Test client data (enterWithoutAttach)', function (err) {
            cb(err, clientRealtime);
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), enterWithoutAttach);
    });

    /*
     * Enter presence channel without prior connect and await entered event
     */
    it('presenceEnterWithoutConnect', function (done) {
      var channelName = 'enterWithoutConnect';
      var enterWithoutConnect = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        var clientChannel = clientRealtime.channels.get(channelName);
        clientChannel.presence.enter('Test client data (enterWithoutConnect)', function (err) {
          cb(err, clientRealtime);
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), enterWithoutConnect);
    });

    /*
     * Attach to channel, enter presence channel (without waiting for attach callback), detach
     * from channel immediately in 'attached' callback
     */
    it.skip('presenceEnterDetachRace', function (done) {
      // Can't use runTestWithEventListener helper as one of the successful
      // outcomes is an error in presence enter, in which case listenForEventOn
      // will not run its callback
      var channelName = 'enterDetachRace';
      var raceFinished = false;
      try {
        /* listen for the enter event, test is complete when received */

        createListenerChannel(channelName, function (err, listenerRealtime, presenceChannel) {
          if (err) {
            closeAndFinish(done, listenerRealtime, err);
            return;
          }

          var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });

          listenerFor('enter', testClientId)(presenceChannel, function () {
            if (!raceFinished) {
              raceFinished = true;
              closeAndFinish(done, [listenerRealtime, clientRealtime]);
            }
          });

          clientRealtime.connection.on('connected', function () {
            /* get channel, attach, and enter */
            var clientChannel = clientRealtime.channels.get(channelName);
            clientChannel.attach(function (err) {
              if (err) {
                closeAndFinish(done, [listenerRealtime, clientRealtime], err);
                return;
              }
              clientChannel.detach(function (err) {
                if (err) {
                  closeAndFinish(done, [listenerRealtime, clientRealtime], err);
                  return;
                }
              });
            });
            clientChannel.presence.enter('Test client data (enter3)', function (err) {
              // Note: either an error (pending messages failed to send due to detach)
              //   or a success (pending messages were pushed out before the detach)
              //   is an acceptable result. Throwing an uncaught exception (the behaviour
              //   that we're testing for) isn't.
              if (err && !raceFinished) {
                raceFinished = true;
                closeAndFinish(done, [listenerRealtime, clientRealtime]);
                return;
              }
              /* if presence event gets sent successfully, second and third assertions happen and test
               * finishes in the presence event handler */
            });
          });
          monitorConnection(done, clientRealtime);
        });
      } catch (err) {
        done(err);
      }
    });

    /*
     * Attach to channel, enter presence channel with a callback but no data and await entered event
     */
    it('presenceEnterWithCallback', function (done) {
      var channelName = 'enterWithCallback';
      var enterWithCallback = function (cb) {
        /* set up authenticated connection */
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter(function (err) {
              cb(err, clientRealtime);
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), enterWithCallback);
    });

    /*
     * Attach to channel, enter presence channel with neither callback nor data and await entered event
     */
    it('presenceEnterWithNothing', function (done) {
      var channelName = 'enterWithNothing';
      var enterWithNothing = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter();
            cb(null, clientRealtime);
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), enterWithNothing);
    });

    /*
     * Attach to channel, enter presence channel with data but no callback and await entered event
     */
    it('presenceEnterWithData', function (done) {
      var channelName = 'enterWithData';
      var enterWithData = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter('Test client data (enter6)');
            cb(null, clientRealtime);
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter'), enterWithData);
    });

    /*
     * Attach to channel, enter presence channel and ensure PresenceMessage
     * has valid action string
     */
    it('presenceMessageAction', function (done) {
      var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
      var channelName = 'presenceMessageAction';
      var clientChannel = clientRealtime.channels.get(channelName);
      var presence = clientChannel.presence;
      presence.subscribe(
        function (presenceMessage) {
          try {
            expect(presenceMessage.action).to.equal('enter', 'Action should contain string "enter"');
          } catch (err) {
            closeAndFinish(done, clientRealtime, err);
            return;
          }
          closeAndFinish(done, clientRealtime);
        },
        function onPresenceSubscribe(err) {
          if (err) {
            closeAndFinish(done, clientRealtime, err);
            return;
          }
          clientChannel.presence.enter();
        }
      );
      monitorConnection(done, clientRealtime);
    });

    /*
     * Enter presence channel (without attaching), detach, then enter again to reattach
     */
    it('presenceEnterDetachEnter', function (done) {
      var channelName = 'enterDetachEnter';
      var secondEventListener = function (channel, callback) {
        var presenceHandler = function (presenceMsg) {
          if (presenceMsg.data == 'second') {
            channel.presence.unsubscribe(presenceHandler);
            callback();
          }
        };
        channel.presence.subscribe(presenceHandler);
      };
      var enterDetachEnter = function (cb) {
        var clientRealtime = helper.AblyRealtime({
          clientId: testClientId,
          tokenDetails: authToken,
          transports: [helper.bestTransport],
        }); // NB remove besttransport in 1.1 spec, see attachdetach0
        var clientChannel = clientRealtime.channels.get(channelName);
        clientRealtime.connection.once('connected', function () {
          clientChannel.presence.enter('first', function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.detach(function (err) {
              if (err) {
                cb(err, clientRealtime);
                return;
              }
              clientChannel.presence.enter('second', function (err) {
                cb(err, clientRealtime);
              });
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, secondEventListener, enterDetachEnter);
    });

    /*
     * Enter invalid presence channel (without attaching), check callback was called with error
     */
    it('presenceEnterInvalid', function (done) {
      var clientRealtime;
      try {
        clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        var clientChannel = clientRealtime.channels.get('');
        clientRealtime.connection.once('connected', function () {
          clientChannel.presence.enter('clientId', function (err) {
            if (err) {
              try {
                expect(err.code).to.equal(40010, 'Correct error code');
              } catch (err) {
                closeAndFinish(done, clientRealtime, err);
                return;
              }
              closeAndFinish(done, clientRealtime);
              return;
            }
            closeAndFinish(done, clientRealtime);
          });
        });
        monitorConnection(done, clientRealtime);
      } catch (err) {
        closeAndFinish(done, clientRealtime, err);
      }
    });

    /*
     * Attach to channel, enter+leave presence channel and await leave event
     */
    it('presenceEnterAndLeave', function (done) {
      var channelName = 'enterAndLeave';
      var enterAndLeave = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter('Test client data (leave0)', function (err) {
              if (err) {
                cb(err, clientRealtime);
                return;
              }
            });
            clientChannel.presence.leave(function (err) {
              cb(err, clientRealtime);
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('leave'), enterAndLeave);
    });

    /*
     * Attach to channel, enter presence channel, update data, and await update event
     */
    it('presenceEnterUpdate', function (done) {
      var newData = 'New data';
      var channelName = 'enterUpdate';
      var eventListener = function (channel, callback) {
        var presenceHandler = function (presenceMsg) {
          if (this.event == 'update') {
            try {
              expect(presenceMsg.clientId).to.equal(testClientId, 'Check presence event has correct clientId');
              expect(presenceMsg.data).to.equal(newData, 'Check presence event has correct data');
            } catch (err) {
              callback(err);
              return;
            }
            channel.presence.unsubscribe(presenceHandler);
            callback();
          }
        };
        channel.presence.subscribe(presenceHandler);
      };
      var enterUpdate = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter('Original data', function (err) {
              if (err) {
                cb(err, clientRealtime);
                return;
              }
              clientChannel.presence.update(newData, function (err) {
                cb(err, clientRealtime);
              });
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, eventListener, enterUpdate);
    });

    /*
     * Attach to channel, enter presence channel and get presence
     */
    it('presenceEnterGet', function (done) {
      var channelName = 'enterGet';
      var testData = 'some data for presenceEnterGet';
      var eventListener = function (channel, callback) {
        var presenceHandler = function () {
          /* Should be ENTER, but may be PRESENT in a race */
          channel.presence.get(function (err, presenceMembers) {
            if (err) {
              callback(err);
              return;
            }
            try {
              expect(presenceMembers.length).to.equal(1, 'Expect test client to be the only member present');
              expect(presenceMembers[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
              expect(presenceMembers[0].data).to.equal(testData, 'Expected data to be correct');
              channel.presence.unsubscribe(presenceHandler);
              callback();
            } catch (err) {
              callback(err);
            }
          });
        };
        channel.presence.subscribe(presenceHandler);
      };
      var enterGet = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter(testData, function (err) {
              cb(err, clientRealtime);
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, eventListener, enterGet);
    });

    /*
     * Realtime presence subscribe on an unattached channel should implicitly attach
     */
    it('presenceSubscribeUnattached', function (done) {
      var channelName = 'subscribeUnattached';
      var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
      var clientRealtime2;
      clientRealtime.connection.on('connected', function () {
        var clientChannel = clientRealtime.channels.get(channelName);
        clientChannel.presence.subscribe(function (presMsg) {
          try {
            expect(presMsg.clientId).to.equal(testClientId2, 'verify clientId correct');
          } catch (err) {
            closeAndFinish(done, [clientRealtime, clientRealtime2], err);
            return;
          }
          closeAndFinish(done, [clientRealtime, clientRealtime2]);
        });
        /* Technically a race, but c2 connecting and attaching should take longer than c1 attaching */
        clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
        clientRealtime2.connection.on('connected', function () {
          var clientChannel2 = clientRealtime2.channels.get(channelName);
          clientChannel2.presence.enter('data');
        });
      });
      monitorConnection(done, clientRealtime);
    });

    /*
     * Realtime presence GET on an unattached channel should attach and wait for sync
     */
    it('presenceGetUnattached', function (done) {
      var channelName = 'getUnattached';
      var testData = 'some data';
      var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
      clientRealtime.connection.on('connected', function () {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get(channelName);
        clientChannel.presence.enter(testData, function (err) {
          if (err) {
            closeAndFinish(done, clientRealtime, err);
            return;
          }
          var clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
          clientRealtime2.connection.on('connected', function () {
            var clientChannel2 = clientRealtime2.channels.get(channelName);
            /* GET without attaching */
            clientChannel2.presence.get(function (err, presenceMembers) {
              if (err) {
                closeAndFinish(done, [clientRealtime, clientRealtime2], err);
                return;
              }
              try {
                expect(clientChannel2.state, 'attached', 'Verify channel attached').to.be.ok;
                expect(clientChannel2.presence.syncComplete, 'Verify sync complete').to.be.ok;
                expect(presenceMembers.length).to.equal(1, 'Expect test client to be present');
                expect(presenceMembers[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
              } catch (err) {
                closeAndFinish(done, [clientRealtime, clientRealtime2], err);
                return;
              }
              closeAndFinish(done, [clientRealtime, clientRealtime2]);
            });
          });
        });
      });
      monitorConnection(done, clientRealtime);
    });

    /*
     * Attach to channel, enter+leave presence channel and get presence
     */
    it('presenceEnterLeaveGet', function (done) {
      var channelName = 'enterLeaveGet';
      var eventListener = function (channel, callback) {
        var presenceHandler = function () {
          // Ignore the first (enter) event
          if (this.event == 'leave') {
            channel.presence.get(function (err, presenceMembers) {
              if (err) {
                callback(err);
                return;
              }
              try {
                expect(presenceMembers.length).to.equal(0, 'Expect presence set to be empty');
              } catch (err) {
                callback(err);
                return;
              }
              channel.presence.unsubscribe(presenceHandler);
              callback();
            });
          }
        };
        channel.presence.subscribe(presenceHandler);
      };
      var enterLeaveGet = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter('testClientData', function (err) {
              if (err) {
                cb(err, clientRealtime);
                return;
              }
              clientChannel.presence.leave(function (err) {
                cb(err, clientRealtime);
              });
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, eventListener, enterLeaveGet);
    });

    /*
     * Attach to channel, enter+leave presence, detatch again, and get presence history
     */
    it('presenceHistory', function (done) {
      var clientRealtime;
      var channelName = 'history';
      var testClientData = 'Test client data (history0)';
      var queryPresenceHistory = function (channel) {
        channel.presence.history(function (err, resultPage) {
          if (err) {
            closeAndFinish(done, clientRealtime, err);
            return;
          }

          var presenceMessages = resultPage.items;
          expect(presenceMessages.length).to.equal(2, 'Verify correct number of presence messages found');
          var actions = utils
            .arrMap(presenceMessages, function (msg) {
              return msg.action;
            })
            .sort();
          expect(actions).to.deep.equal(['enter', 'leave'], 'Verify presenceMessages have correct actions');
          expect(presenceMessages[0].data || presenceMessages[1].data).to.equal(
            testClientData,
            'Verify correct data (from whichever message was the "enter")'
          );
          closeAndFinish(done, clientRealtime);
        });
      };
      try {
        /* set up authenticated connection */
        clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, clientRealtime, err);
              return;
            }
            clientChannel.presence.enter(testClientData, function (err) {
              if (err) {
                closeAndFinish(done, clientRealtime, err);
                return;
              }
              clientChannel.presence.leave(function (err) {
                if (err) {
                  closeAndFinish(done, clientRealtime, err);
                  return;
                }
                clientChannel.detach(function (err) {
                  if (err) {
                    closeAndFinish(done, clientRealtime, err);
                    return;
                  }
                  try {
                    queryPresenceHistory(clientChannel);
                  } catch (err) {
                    closeAndFinish(done, clientRealtime, err);
                  }
                });
              });
            });
          });
        });
        monitorConnection(done, clientRealtime);
      } catch (err) {
        closeAndFinish(done, clientRealtime, err);
      }
    });

    /*
     * Attach to channel, enter presence channel, then initiate second
     * connection, seeing existing member in message subsequent to second attach response
     */
    it('presenceSecondConnection', function (done) {
      var clientRealtime1, clientRealtime2;
      var channelName = 'secondConnection';
      try {
        /* set up authenticated connection */
        clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime1.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel1 = clientRealtime1.channels.get(channelName);
          clientChannel1.attach(function (err) {
            if (err) {
              closeAndFinish(done, clientRealtime1, err);
              return;
            }
            clientChannel1.presence.enter('Test client data (attach0)', function (err) {
              if (err) {
                closeAndFinish(done, clientRealtime1, err);
                return;
              }
            });
            clientChannel1.presence.subscribe('enter', function () {
              clientChannel1.presence.get(function (err, presenceMembers1) {
                if (err) {
                  closeAndFinish(done, clientRealtime1, err);
                  return;
                }
                try {
                  expect(presenceMembers1.length).to.equal(1, 'Member present');
                } catch (err) {
                  closeAndFinish(done, clientRealtime1, err);
                  return;
                }
                /* now set up second connection and attach */
                /* set up authenticated connection */
                clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
                clientRealtime2.connection.on('connected', function () {
                  /* get channel, attach */
                  var clientChannel2 = clientRealtime2.channels.get(channelName);
                  clientChannel2.attach(function (err) {
                    if (err) {
                      closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
                      return;
                    }
                    clientChannel2.presence.subscribe('present', function () {
                      /* get the channel members and verify testclient is there */
                      clientChannel2.presence.get(function (err, presenceMembers2) {
                        if (err) {
                          closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
                          return;
                        }
                        try {
                          expect(presenceMembers1).to.deep.equal(
                            presenceMembers2,
                            'Verify member presence is indicated after attach'
                          );
                        } catch (err) {
                          closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
                          return;
                        }
                        closeAndFinish(done, [clientRealtime1, clientRealtime2]);
                      });
                    });
                  });
                });
                monitorConnection(done, clientRealtime2);
              });
            });
          });
        });
        monitorConnection(done, clientRealtime1);
      } catch (err) {
        closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
      }
    });

    /*
     * Attach and enter channel on two connections, seeing
     * both members in presence set
     * Use get to filter by clientId and connectionId
     */
    it('presenceTwoMembers', function (done) {
      var clientRealtime1, clientRealtime2, clientChannel1, clientChannel2;
      var channelName = 'twoMembers';
      try {
        /* set up authenticated connections */
        async.parallel(
          [
            function (cb1) {
              var data = 'Test client data (member0-1)';
              clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
              clientRealtime1.connection.on('connected', function () {
                /* get channel, attach, and enter */
                clientChannel1 = clientRealtime1.channels.get(channelName);
                clientChannel1.attach(function (err) {
                  if (err) {
                    cb1(err);
                    return;
                  }
                  clientChannel1.presence.enter(data, function (err) {
                    if (err) {
                      cb1(err);
                      return;
                    }
                    cb1();
                  });
                });
              });
              monitorConnection(done, clientRealtime1);
            },
            function (cb2) {
              var data = 'Test client data (member0-2)';
              clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, tokenDetails: authToken2 });
              clientRealtime2.connection.on('connected', function () {
                /* get channel, attach */
                clientChannel2 = clientRealtime2.channels.get(channelName);
                clientChannel2.attach(function (err) {
                  if (err) {
                    cb2(err);
                    return;
                  }
                  var enterPresence = function (onEnterCB) {
                    clientChannel2.presence.enter(data, function (err) {
                      if (err) {
                        cb2(err);
                        return;
                      }
                      onEnterCB();
                    });
                  };
                  // Wait for both enter events to be received on clientChannel2 before calling back
                  var waitForClient = function (clientId) {
                    return function (onEnterCb) {
                      var presenceHandler = function (presenceEvent) {
                        /* PrenceEvent from first connection might come through as an enter or a present */
                        if (
                          presenceEvent.clientId == clientId &&
                          (this.event === 'enter' || this.event === 'present')
                        ) {
                          clientChannel2.presence.unsubscribe(presenceHandler);
                          onEnterCb();
                        }
                      };
                      clientChannel2.presence.subscribe(presenceHandler);
                    };
                  };
                  async.parallel(
                    [waitForClient(testClientId), waitForClient(testClientId2), enterPresence],
                    function () {
                      cb2();
                    }
                  );
                });
              });
              monitorConnection(done, clientRealtime2);
            },
          ],
          function (err) {
            if (err) {
              closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
              return;
            }
            async.parallel(
              [
                /* First test: no filters */
                function (cb) {
                  clientChannel2.presence.get(function (err, members) {
                    if (err) {
                      return cb(err);
                    }
                    try {
                      expect(members.length).to.equal(2, 'Verify both members present');
                      expect(members[0].connectionId).to.not.equal(
                        members[1].connectionId,
                        'Verify members have distinct connectionIds'
                      );
                    } catch (err) {
                      cb(err);
                      return;
                    }
                    cb();
                  });
                },
                /* Second test: filter by clientId */
                function (cb) {
                  clientChannel2.presence.get({ clientId: testClientId }, function (err, members) {
                    if (err) {
                      return cb(err);
                    }
                    try {
                      expect(members.length).to.equal(1, 'Verify only one member present when filtered by clientId');
                      expect(members[0].clientId).to.equal(testClientId, 'Verify clientId filter works');
                    } catch (err) {
                      cb(err);
                      return;
                    }
                    cb();
                  });
                },
                /* Third test: filter by connectionId */
                function (cb) {
                  clientChannel2.presence.get({ connectionId: clientRealtime1.connection.id }, function (err, members) {
                    if (err) {
                      return cb(err);
                    }
                    try {
                      expect(members.length).to.equal(
                        1,
                        'Verify only one member present when filtered by connectionId'
                      );
                      expect(members[0].connectionId).to.equal(
                        clientRealtime1.connection.id,
                        'Verify connectionId filter works'
                      );
                    } catch (err) {
                      cb(err);
                      return;
                    }
                    cb();
                  });
                },
              ],
              function (err) {
                if (err) {
                  closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
                  return;
                }
                closeAndFinish(done, [clientRealtime1, clientRealtime2]);
              }
            );
          }
        );
      } catch (err) {
        closeAndFinish(done, [clientRealtime1, clientRealtime2], err);
      }
    });

    /*
     * Enter presence channel (without attaching), close the connection,
     * reconnect, then enter again to reattach
     */
    it('presenceEnterAfterClose', function (done) {
      var channelName = 'enterAfterClose';
      var secondEnterListener = function (channel, callback) {
        var presenceHandler = function (presenceMsg) {
          if (this.event == 'enter' && presenceMsg.data == 'second') {
            channel.presence.unsubscribe(presenceHandler);
            callback();
          }
        };
        channel.presence.subscribe(presenceHandler);
      };
      var enterAfterClose = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        var clientChannel = clientRealtime.channels.get(channelName);
        clientRealtime.connection.once('connected', function () {
          /* get channel and enter (should automatically attach) */
          clientChannel.presence.enter('first', function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientRealtime.close();
            clientRealtime.connection.whenState('closed', function () {
              clientRealtime.connection.once('connected', function () {
                //Should automatically reattach
                clientChannel.presence.enter('second', function (err) {
                  cb(err, clientRealtime);
                });
              });
              clientRealtime.connection.connect();
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, secondEnterListener, enterAfterClose);
    });

    /*
     * Try to enter presence channel on a closed connection and check error callback
     */
    it('presenceEnterClosed', function (done) {
      var clientRealtime;
      var channelName = 'enterClosed';
      try {
        clientRealtime = helper.AblyRealtime();
        var clientChannel = clientRealtime.channels.get(channelName);
        clientRealtime.connection.on('connected', function () {
          clientRealtime.close();
          clientChannel.presence.enterClient('clientId', function (err) {
            try {
              expect(err.code).to.equal(80017, 'presence enter failed with correct code');
              expect(err.statusCode).to.equal(400, 'presence enter failed with correct statusCode');
            } catch (err) {
              closeAndFinish(done, clientRealtime, err);
              return;
            }
            done();
          });
        });
        monitorConnection(done, clientRealtime);
      } catch (err) {
        closeAndFinish(done, clientRealtime, err);
      }
    });

    /*
     * Client ID is implicit in the connection so should not be sent for current client operations
     */
    it('presenceClientIdIsImplicit', function (done) {
      var clientId = 'implicitClient',
        client = helper.AblyRealtime({ clientId: clientId });

      var channel = client.channels.get('presenceClientIdIsImplicit'),
        presence = channel.presence;

      var originalSendPresence = channel.sendPresence;
      channel.sendPresence = function (presence, callback) {
        try {
          expect(!presence.clientId, 'Client ID should not be present as it is implicit').to.be.ok;
        } catch (err) {
          closeAndFinish(done, client, err);
          return;
        }
        originalSendPresence.apply(channel, arguments);
      };

      presence.enter(null, function (err) {
        if (err) {
          closeAndFinish(done, client, err);
          return;
        }
        presence.update(null, function (err) {
          if (err) {
            closeAndFinish(done, client, err);
            return;
          }
          presence.leave(null, function (err) {
            if (err) {
              closeAndFinish(done, client, err);
              return;
            }
            closeAndFinish(done, client);
          });
        });
      });
    });

    /*
     * Check that old deprecated on/off methods still work
     */
    it('presenceOn', function (done) {
      var channelName = 'enterOn';
      var testData = 'some data';
      var eventListener = function (channel, callback) {
        var presenceHandler = function () {
          callback();
        };
        channel.presence.on(presenceHandler);
      };
      var enterOn = function (cb) {
        var clientRealtime = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
        clientRealtime.connection.on('connected', function () {
          /* get channel, attach, and enter */
          var clientChannel = clientRealtime.channels.get(channelName);
          clientChannel.attach(function (err) {
            if (err) {
              cb(err, clientRealtime);
              return;
            }
            clientChannel.presence.enter(testData, function (err) {
              cb(err, clientRealtime);
            });
          });
        });
        monitorConnection(done, clientRealtime);
      };

      runTestWithEventListener(done, channelName, eventListener, enterOn);
    });

    /*
     * Check that encodable presence messages are encoded correctly
     */
    it('presenceEncoding', function (done) {
      var data = { foo: 'bar' },
        encodedData = JSON.stringify(data),
        options = {
          clientId: testClientId,
          tokenDetails: authToken,
          autoConnect: false,
          transports: [helper.bestTransport],
        };

      var realtimeBin = helper.AblyRealtime(utils.mixin(options, { useBinaryProtocol: true }));
      var realtimeJson = helper.AblyRealtime(utils.mixin(options, { useBinaryProtocol: false }));

      var runTest = function (realtime, callback) {
        realtime.connection.connectionManager.once('transport.active', function (transport) {
          var originalSend = transport.send;

          transport.send = function (message) {
            if (message.action === 14) {
              /* Message is formatted for Ably by the toJSON method, so need to
               * stringify and parse to see what actually gets sent */
              var presence = JSON.parse(JSON.stringify(message.presence[0]));
              try {
                expect(presence.action).to.equal(2, 'Enter action');
                expect(presence.data).to.equal(encodedData, 'Correctly encoded data');
                expect(presence.encoding).to.equal('json', 'Correct encoding');
              } catch (err) {
                callback(err);
                return;
              }
              transport.send = originalSend;
              callback();
            }
            originalSend.apply(transport, arguments);
          };

          var channel = realtime.channels.get(
            'presence-' + (realtime.options.useBinaryProtocol ? 'bin' : 'json') + '-encoding'
          );
          channel.presence.enter(data);
        });
        realtime.connect();
      };

      async.series(
        [
          function (callback) {
            runTest(realtimeBin, callback);
          },
          function (callback) {
            runTest(realtimeJson, callback);
          },
        ],
        function (err) {
          closeAndFinish(done, [realtimeBin, realtimeJson], err);
        }
      );
    });

    /*
     * Request a token using clientId, then initialize a connection without one,
     * and check that can enter presence with the clientId inherited from tokenDetails
     */
    it('presence_enter_inherited_clientid', function (done) {
      var channelName = 'enter_inherited_clientid';

      var authCallback = function (tokenParams, callback) {
        rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
          if (err) {
            done(err);
            return;
          }
          callback(null, tokenDetails);
        });
      };

      var enterInheritedClientId = function (cb) {
        var realtime = helper.AblyRealtime({ authCallback: authCallback });
        var channel = realtime.channels.get(channelName);
        realtime.connection.on('connected', function () {
          try {
            expect(realtime.auth.clientId).to.equal(testClientId);
          } catch (err) {
            cb(err);
            return;
          }
          channel.presence.enter('test data', function (err) {
            cb(err, realtime);
          });
        });
        monitorConnection(done, realtime);
      };

      runTestWithEventListener(done, channelName, listenerFor('enter', testClientId), enterInheritedClientId);
    });

    /*
     * Request a token using clientId, then initialize a connection without one,
     * and check that can enter presence with the clientId inherited from tokenDetails
     * before we're connected, so before we know our clientId
     */
    it('presence_enter_before_know_clientid', function (done) {
      var channelName = 'enter_before_know_clientid';

      var enterInheritedClientId = function (cb) {
        rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
          if (err) {
            done(err);
            return;
          }
          var realtime = helper.AblyRealtime({ token: tokenDetails.token, autoConnect: false });
          var channel = realtime.channels.get(channelName);
          try {
            expect(realtime.auth.clientId).to.equal(undefined, 'no clientId when entering');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          channel.presence.enter('test data', function (err) {
            try {
              expect(realtime.auth.clientId).to.equal(testClientId, 'clientId has been set by the time we entered');
            } catch (err) {
              cb(err, realtime);
              return;
            }
            cb(err, realtime);
          });
          realtime.connect();
          monitorConnection(done, realtime);
        });
      };

      runTestWithEventListener(done, channelName, listenerFor('enter', testClientId), enterInheritedClientId);
    });

    /*
     * Check that, on a reattach when presence map has changed since last attach,
     * all members are emitted and map is in the correct state
     */
    it('presence_refresh_on_detach', function (done) {
      var channelName = 'presence_refresh_on_detach';
      var realtime = helper.AblyRealtime();
      var observer = helper.AblyRealtime();
      var realtimeChannel = realtime.channels.get(channelName);
      var observerChannel = observer.channels.get(channelName);

      function waitForBothConnect(cb) {
        async.parallel(
          [
            function (connectCb) {
              realtime.connection.on('connected', connectCb);
            },
            function (connectCb) {
              observer.connection.on('connected', connectCb);
            },
          ],
          function () {
            cb();
          }
        );
      }

      function enterOneAndTwo(cb) {
        async.parallel(
          [
            function (enterCb) {
              realtimeChannel.presence.enterClient('one', enterCb);
            },
            function (enterCb) {
              realtimeChannel.presence.enterClient('two', enterCb);
            },
          ],
          cb
        );
      }

      function checkPresence(first, second, cb) {
        observerChannel.presence.get(function (err, presenceMembers) {
          var clientIds = utils
            .arrMap(presenceMembers, function (msg) {
              return msg.clientId;
            })
            .sort();
          try {
            expect(clientIds.length).to.equal(2, 'Two members present');
            expect(clientIds[0]).to.equal(first, 'Member ' + first + ' present');
            expect(clientIds[1]).to.equal(second, 'Member ' + second + ' present');
          } catch (err) {
            cb(err);
            return;
          }
          cb(err);
        });
      }

      function swapTwoForThree(cb) {
        async.parallel(
          [
            function (innerCb) {
              realtimeChannel.presence.leaveClient('two', innerCb);
            },
            function (innerCb) {
              realtimeChannel.presence.enterClient('three', innerCb);
            },
          ],
          cb
        );
      }

      function attachAndListen(cb) {
        var here = [];
        observerChannel.presence.subscribe(function (pm) {
          here.push(pm.clientId);
          if (here.length == 2) {
            try {
              expect(here.sort()).to.deep.equal(['one', 'three']);
            } catch (err) {
              cb(err);
            }
            cb();
          }
        });
        observerChannel.attach();
      }

      async.series(
        [
          waitForBothConnect,
          function (cb) {
            realtimeChannel.attach(cb);
          },
          enterOneAndTwo,
          function (cb) {
            observerChannel.attach(cb);
          },
          function (cb) {
            checkPresence('one', 'two', cb);
          },
          function (cb) {
            observerChannel.detach(cb);
          },
          swapTwoForThree,
          attachAndListen,
          function (cb) {
            checkPresence('one', 'three', cb);
          },
        ],
        function (err) {
          closeAndFinish(done, [realtime, observer], err);
        }
      );
    });

    it('presence_detach_during_sync', function (done) {
      var channelName = 'presence_detach_during_sync';
      var enterer = helper.AblyRealtime({ clientId: testClientId, tokenDetails: authToken });
      var detacher = helper.AblyRealtime();
      var entererChannel = enterer.channels.get(channelName);
      var detacherChannel = detacher.channels.get(channelName);

      function waitForBothConnect(cb) {
        async.parallel(
          [
            function (connectCb) {
              enterer.connection.on('connected', connectCb);
            },
            function (connectCb) {
              detacher.connection.on('connected', connectCb);
            },
          ],
          function () {
            cb();
          }
        );
      }

      async.series(
        [
          waitForBothConnect,
          function (cb) {
            entererChannel.presence.enter(cb);
          },
          function (cb) {
            detacherChannel.attach(cb);
          },
          function (cb) {
            detacherChannel.detach(cb);
          },
          function (cb) {
            try {
              expect(detacherChannel.state).to.equal('detached', 'Check detacher properly detached');
            } catch (err) {
              cb(err);
              return;
            }
            cb();
          },
        ],
        function (err) {
          closeAndFinish(done, [enterer, detacher], err);
        }
      );
    });

    /* RTP5c2, RTP17
     * Test the auto-re-enter functionality by injecting a member into the
     * private _myMembers set while suspended. Expect on re-attach and sync that
     * member to be sent to realtime and, with luck, make its way into the normal
     * presence set */
    it('presence_auto_reenter', function (done) {
      var channelName = 'presence_auto_reenter';
      var realtime = helper.AblyRealtime();
      var channel = realtime.channels.get(channelName);

      async.series(
        [
          function (cb) {
            realtime.connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach(cb);
          },
          function (cb) {
            if (!channel.presence.syncComplete) {
              channel.presence.members.waitSync(cb);
            } else {
              cb();
            }
          },
          function (cb) {
            channel.presence.enterClient('one', 'onedata');
            channel.presence.subscribe('enter', function () {
              channel.presence.unsubscribe('enter');
              cb();
            });
          },
          function (cb) {
            /* inject an additional member into the myMember set, then force a suspended state */
            var connId = realtime.connection.connectionManager.connectionId;
            channel.presence._myMembers.put({
              action: 'enter',
              clientId: 'two',
              connectionId: connId,
              id: connId + ':0:0',
              data: 'twodata',
            });
            helper.becomeSuspended(realtime, cb);
          },
          function (cb) {
            try {
              expect(channel.state).to.equal('suspended', 'sanity-check channel state');
            } catch (err) {
              cb(err);
              return;
            }
            /* Reconnect */
            realtime.connection.connect();
            channel.once('attached', function () {
              cb();
            });
          },
          function (cb) {
            /* Since we haven't been gone for two minutes, we don't know for sure
             * that realtime will feel it necessary to do a sync - if it doesn't,
             * we request one */
            if (channel.presence.syncComplete) {
              channel.sync();
            }
            channel.presence.members.waitSync(cb);
          },
          function (cb) {
            /* Now just wait for an enter! */
            channel.presence.subscribe('enter', function (presmsg) {
              try {
                expect(presmsg.clientId).to.equal('two', 'Check expected clientId');
              } catch (err) {
                cb(err);
                return;
              }
              channel.presence.unsubscribe('enter');
              cb();
            });
          },
          function (cb) {
            channel.presence.get(function (err, results) {
              if (err) {
                cb(err);
                return;
              }
              try {
                expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
                expect(results.length).to.equal(2, 'Check correct number of results');
                expect(extractClientIds(results)).deep.to.equal(['one', 'two'], 'check correct members');
                expect(extractMember(results, 'one').data).to.equal('onedata', 'check correct data on one');
                expect(extractMember(results, 'two').data).to.equal('twodata', 'check correct data on two');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /* RTP17e
     * Test failed presence auto-re-entering */
    it.skip('presence_failed_auto_reenter', function (done) {
      var channelName = 'presence_failed_auto_reenter',
        realtime,
        channel,
        token;

      async.series(
        [
          function (cb) {
            /* Request a token without the capabilities to be in the presence set */
            var tokenParams = { clientId: 'me', capability: {} };
            tokenParams.capability[channelName] = ['publish', 'subscribe'];
            rest.auth.requestToken(tokenParams, function (err, tokenDetails) {
              token = tokenDetails;
              cb(err);
            });
          },
          function (cb) {
            realtime = helper.AblyRealtime({ tokenDetails: token });
            channel = realtime.channels.get(channelName);
            realtime.connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach(cb);
          },
          function (cb) {
            if (!channel.presence.syncComplete) {
              channel.presence.members.waitSync(cb);
            } else {
              cb();
            }
          },
          function (cb) {
            channel.presence.get(function (err, members) {
              try {
                expect(members.length).to.equal(0, 'Check no-one in presence set');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
          function (cb) {
            /* inject an additional member into the myMember set, then force a suspended state */
            var connId = realtime.connection.connectionManager.connectionId;
            channel.presence._myMembers.put({
              action: 'enter',
              clientId: 'me',
              connectionId: connId,
              id: connId + ':0:0',
            });
            helper.becomeSuspended(realtime, cb);
          },
          function (cb) {
            realtime.connection.connect();
            channel.once('attached', function () {
              cb();
            });
          },
          function (cb) {
            /* The channel will now try to auto-re-enter the me client, which will result in... */
            channel.once(function (channelStateChange) {
              try {
                expect(this.event).to.equal('update', 'Check get an update event');
                expect(channelStateChange.current).to.equal('attached', 'Check still attached');
                expect(channelStateChange.reason && channelStateChange.reason.code).to.equal(91004, 'Check error code');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
          function (cb) {
            channel.presence.get(function (err, members) {
              try {
                expect(members.length).to.equal(0, 'Check no-one in presence set');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /* Enter ten clients while attaching, finish the attach, check they were all entered correctly */
    it('multiple_pending', function (done) {
      /* single transport to avoid upgrade stalling due to the stubbed attachImpl */
      var realtime = helper.AblyRealtime({ transports: [helper.bestTransport] }),
        channel = realtime.channels.get('multiple_pending'),
        originalAttachImpl = channel.attachImpl;

      async.series(
        [
          function (cb) {
            realtime.connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            /* stub out attachimpl */
            channel.attachImpl = function () {};
            channel.attach();

            for (var i = 0; i < 10; i++) {
              channel.presence.enterClient('client_' + i.toString(), i.toString());
            }

            channel.attachImpl = originalAttachImpl;
            channel.checkPendingState();

            /* Now just wait for an enter. One enter implies all, they'll all be
             * sent in one protocol message */
            channel.presence.subscribe('enter', function () {
              channel.presence.unsubscribe('enter');
              Ably.Realtime.Platform.Config.nextTick(cb);
            });
          },
          function (cb) {
            channel.presence.get(function (err, results) {
              try {
                expect(results.length).to.equal(10, 'Check all ten clients are there');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /* RTP19
     * Check that a LEAVE message is published for anyone in the local presence
     * set but missing from a sync */
    it('leave_published_for_member_missing_from_sync', function (done) {
      var realtime = helper.AblyRealtime({ transports: helper.availableTransports }),
        continuousClientId = 'continuous',
        goneClientId = 'gone',
        continuousRealtime = helper.AblyRealtime({ clientId: continuousClientId }),
        channelName = 'leave_published_for_member_missing_from_sync',
        channel = realtime.channels.get(channelName),
        continuousChannel = continuousRealtime.channels.get(channelName);
      monitorConnection(done, realtime);
      monitorConnection(done, continuousRealtime);

      async.series(
        [
          function (cb) {
            continuousRealtime.connection.whenState('connected', function () {
              cb();
            });
          },
          function (cb) {
            continuousChannel.attach(cb);
          },
          function (cb) {
            continuousChannel.presence.enter(cb);
          },
          function (cb) {
            realtime.connection.whenState('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach(cb);
          },
          function (cb) {
            channel.presence.get({ waitForSync: true }, function (err, members) {
              try {
                expect(members && members.length).to.equal(1, 'Check one member present');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
          function (cb) {
            /* Inject an additional member locally */
            channel.onMessage({
              action: 14,
              id: 'messageid:0',
              connectionId: 'connid',
              timestamp: utils.now(),
              presence: [
                {
                  clientId: goneClientId,
                  action: 'enter',
                },
              ],
            });
            channel.presence.get(function (err, members) {
              try {
                expect(members && members.length).to.equal(2, 'Check two members present');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
          function (cb) {
            channel.presence.subscribe(function (presmsg) {
              channel.presence.unsubscribe();
              try {
                expect(presmsg.action).to.equal('leave', 'Check action was leave');
                expect(presmsg.clientId).to.equal(goneClientId, 'Check goneClient has left');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
            channel.sync();
          },
          function (cb) {
            channel.presence.get({ waitForSync: true }, function (err, members) {
              try {
                expect(members && members.length).to.equal(1, 'Check back to one member present');
                expect(members && members[0] && members[0].clientId).to.equal(
                  continuousClientId,
                  'check cont still present'
                );
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
        ],
        function (err) {
          closeAndFinish(done, [realtime, continuousRealtime], err);
        }
      );
    });

    /* RTP19a
     * Check that a LEAVE message is published for anyone in the local presence
     * set if get an ATTACHED with no HAS_PRESENCE */
    it('leave_published_for_members_on_presenceless_attached', function (done) {
      var realtime = helper.AblyRealtime(),
        channelName = 'leave_published_for_members_on_presenceless_attached',
        channel = realtime.channels.get(channelName),
        fakeClientId = 'faker';
      monitorConnection(done, realtime);

      async.series(
        [
          function (cb) {
            realtime.connection.whenState('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach(cb);
          },
          function (cb) {
            /* Inject a member locally */
            channel.onMessage({
              action: 14,
              id: 'messageid:0',
              connectionId: 'connid',
              timestamp: utils.now(),
              presence: [
                {
                  clientId: fakeClientId,
                  action: 'enter',
                },
              ],
            });
            channel.presence.get(function (err, members) {
              try {
                expect(members && members.length).to.equal(1, 'Check one member present');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
          function (cb) {
            channel.presence.subscribe(function (presmsg) {
              try {
                expect(presmsg.action).to.equal('leave', 'Check action was leave');
                expect(presmsg.clientId).to.equal(fakeClientId, 'Check fake client has left');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
            /* Inject an ATTACHED with RESUMED and HAS_PRESENCE both false */
            channel.onMessage(
              createPM({
                action: 11,
                channelSerial: channel.properties.attachSerial,
                flags: 0,
              })
            );
          },
          function (cb) {
            channel.presence.get(function (err, members) {
              try {
                expect(members && members.length).to.equal(0, 'Check no members present');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /* RTP5f; RTP11d
     * Check that on ATTACHED -> SUSPENDED -> ATTACHED, members map is preserved
     * and only members that changed between ATTACHED states should result in
     * presence events */
    it('suspended_preserves_presence', function (done) {
      var mainRealtime = helper.AblyRealtime({ clientId: 'main', log: { level: 4 } }),
        continuousRealtime = helper.AblyRealtime({ clientId: 'continuous', log: { level: 4 } }),
        leavesRealtime = helper.AblyRealtime({ clientId: 'leaves', log: { level: 4 } }),
        channelName = 'suspended_preserves_presence',
        mainChannel = mainRealtime.channels.get(channelName);

      monitorConnection(done, continuousRealtime);
      monitorConnection(done, leavesRealtime);
      var enter = function (rt) {
        return function (outerCb) {
          var channel = rt.channels.get(channelName);
          async.series(
            [
              function (cb) {
                rt.connection.whenState('connected', function () {
                  cb();
                });
              },
              function (cb) {
                channel.attach(cb);
              },
              function (cb) {
                channel.presence.enter(cb);
              },
            ],
            outerCb
          );
        };
      };
      var waitFor = function (expectedClientId) {
        return function (cb) {
          var presenceHandler = function (presmsg) {
            if (expectedClientId == presmsg.clientId) {
              mainChannel.presence.unsubscribe(presenceHandler);
              cb();
            }
          };
          mainChannel.presence.subscribe(presenceHandler);
        };
      };

      async.series(
        [
          enter(mainRealtime),
          function (cb) {
            async.parallel([waitFor('continuous'), enter(continuousRealtime)], cb);
          },
          function (cb) {
            async.parallel([waitFor('leaves'), enter(leavesRealtime)], cb);
          },
          function (cb) {
            mainChannel.presence.get(function (err, members) {
              try {
                expect(members.length).to.equal(3, 'Check all three expected members here');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
          function (cb) {
            helper.becomeSuspended(mainRealtime, cb);
          },
          function (cb) {
            mainChannel.presence.get(function (err) {
              /* Check RTP11d: get() returns an error by default */
              try {
                expect(err, 'Check error returned by get() while suspended').to.be.ok;
                expect(err && err.code).to.equal(91005, 'Check error code for get() while suspended');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
          function (cb) {
            mainChannel.presence.get({ waitForSync: false }, function (err, members) {
              /* Check RTP11d: get() works while suspended if waitForSync: false */
              try {
                expect(!err, 'Check no error returned by get() while suspended if waitForSync: false').to.be.ok;
                expect(members && members.length).to.equal(3, 'Check all three expected members here');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
          function (cb) {
            leavesRealtime.connection.whenState('closed', function () {
              cb();
            });
            leavesRealtime.close();
          },
          function (cb) {
            mainChannel.presence.subscribe(function (presmsg) {
              try {
                expect(presmsg.clientId).to.equal('leaves', 'Check the only presmsg we get is a leave from leaves');
                expect(presmsg.action).to.equal('leave', 'Check the only presmsg we get is a leave from leaves');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
            /* Don't need to reattach explicitly; should be done automatically on connected */
            mainRealtime.connect();
          },
          function (cb) {
            /* Wait a bit to make sure we don't receive any other presence messages */
            setTimeout(cb, 1000);
          },
          function (cb) {
            mainChannel.presence.get(function (err, members) {
              try {
                expect(members && members.length).to.equal(2, 'Check two expected members here');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
        ],
        function (err) {
          closeAndFinish(done, [mainRealtime, continuousRealtime, leavesRealtime], err);
        }
      );
    });

    /*
     * Send >10 presence updates, check they were all broadcast. Point of this is
     * to check for a bug in the original 0.8 spec re presence membersmap
     * comparisons.
     */
    it('presence_many_updates', function (done) {
      var client = helper.AblyRealtime({ clientId: testClientId });

      var channel = client.channels.get('presence_many_updates'),
        presence = channel.presence,
        numUpdates = 0;

      channel.attach(function (err) {
        if (err) {
          closeAndFinish(done, client, err);
        }
        presence.subscribe(function (presMsg) {
          numUpdates++;
        });

        async.timesSeries(
          15,
          function (i, cb) {
            presence.update(i.toString(), cb);
          },
          function (err) {
            if (err) {
              done(err);
              return;
            }
            // Wait to make sure everything has been received
            setTimeout(function () {
              try {
                expect(numUpdates).to.equal(15, 'Check got all the results');
              } catch (err) {
                closeAndFinish(done, client, err);
                return;
              }
              closeAndFinish(done, client);
            }, 1000);
          }
        );
      });
    });

    if (typeof Promise !== 'undefined') {
      describe('presence_promise', function () {
        var options = { clientId: testClientId, promises: true };

        it('enter_get', function (done) {
          var client = helper.AblyRealtime(options);
          var channel = client.channels.get('presence_promise_get');
          var testData = 'test_presence_data';

          channel.presence
            .subscribe(function () {
              channel.presence
                .get()
                .then(function (members) {
                  expect(members.length).to.equal(1, 'Expect test client to be the only member present');
                  expect(members[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
                  expect(members[0].data).to.equal(testData, 'Expected data to be correct');
                  closeAndFinish(done, client);
                })
                ['catch'](function (err) {
                  closeAndFinish(done, client, err);
                });
            })
            .then(function () {
              channel.presence.enter(testData)['catch'](function (err) {
                closeAndFinish(done, client, err);
              });
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });

        it('update', function (done) {
          var client = helper.AblyRealtime(options);
          var channel = client.channels.get('presence_promise_update');
          var testData1 = 'test_presence_data1';
          var testData2 = 'test_presence_data2';
          var idx = 0;

          channel.presence
            .subscribe(function () {
              if (idx === 0) {
                idx++;
                channel.presence
                  .get()
                  .then(function (members) {
                    expect(members.length).to.equal(1, 'Expect test client to be the only member present');
                    expect(members[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
                    expect(members[0].data).to.equal(testData1, 'Expected data to be correct');
                    channel.presence.update(testData2)['catch'](function (err) {
                      // If idx == 2 this means the update was succesful but the connection was closed before it was ACKed
                      if (idx !== 2) {
                        closeAndFinish(done, client, err);
                      }
                    });
                  })
                  ['catch'](function (err) {
                    closeAndFinish(done, client, err);
                  });
              } else {
                idx++;
                channel.presence
                  .get()
                  .then(function (members) {
                    expect(members.length).to.equal(1, 'Expect test client to be the only member present');
                    expect(members[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
                    expect(members[0].data).to.equal(testData2, 'Expected data to be correct');
                    closeAndFinish(done, client);
                  })
                  ['catch'](function (err) {
                    closeAndFinish(done, client, err);
                  });
              }
            })
            .then(function () {
              channel.presence.enter(testData1)['catch'](function (err) {
                closeAndFinish(done, client, err);
              });
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });

        it('enterClient_leaveClient', function (done) {
          var client = helper.AblyRealtime(options);
          var channel = client.channels.get('presence_promise_leaveClient');
          var idx = 0;

          channel.presence
            .subscribe(function () {
              if (idx === 0) {
                idx++;
                channel.presence
                  .get()
                  .then(function (members) {
                    expect(members.length).to.equal(1, 'Expect test client to be the only member present');
                    expect(members[0].clientId).to.equal(testClientId, 'Expected test clientId to be correct');
                    channel.presence.leaveClient(testClientId)['catch'](function (err) {
                      // If idx == 2 this means the leave was succesful but the connection was closed before it was ACKed
                      if (idx !== 2) {
                        closeAndFinish(done, client, err);
                      }
                    });
                  })
                  ['catch'](function (err) {
                    closeAndFinish(done, client, err);
                  });
              } else {
                idx++;
                channel.presence
                  .get()
                  .then(function (members) {
                    expect(members.length).to.equal(0, 'Expect test client to no longer be present');
                    closeAndFinish(done, client);
                  })
                  ['catch'](function (err) {
                    closeAndFinish(done, client, err);
                  });
              }
            })
            .then(function () {
              channel.presence
                .enterClient(testClientId)
                .then(function () {})
                ['catch'](function (err) {
                  closeAndFinish(done, client, err);
                });
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });

        it('history', function (done) {
          var client = helper.AblyRealtime(options);
          var channel = client.channels.get('presence_promise_history');
          channel.presence
            .history()
            .then(function (page) {
              // Tests for promisified PaginatedResource exist elsewhere in the repo so are omitted here
              closeAndFinish(done, client);
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });

        it('subscribe', function (done) {
          var client = helper.AblyRealtime(options);
          var channel = client.channels.get('presence_promise_subscribe');
          channel.presence
            .subscribe(function () {})
            .then(function () {
              expect(channel.state).to.equal('attached');
              closeAndFinish(done, client);
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });
      });
    }
  });
});
