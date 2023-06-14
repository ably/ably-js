'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
  var createPM = Ably.Realtime.ProtocolMessage.fromDeserialized;
  var displayError = helper.displayError;
  var monitorConnection = helper.monitorConnection;
  var ptcb = helper.promiseToCallback;

  describe('realtime/connection', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('connectionPing', function (done) {
      var realtime;
      try {
        realtime = helper.AblyRealtimePromise();
        realtime.connection.on('connected', function () {
          try {
            realtime.connection.ping();
            closeAndFinish(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('connectionPingWithCallback', function (done) {
      var realtime;
      try {
        realtime = helper.AblyRealtimePromise();
        realtime.connection.on('connected', function () {
          ptcb(realtime.connection.ping(), function (err, responseTime) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            try {
              expect(typeof responseTime).to.equal('number', 'check that a responseTime returned');
              expect(responseTime > 0, 'check that responseTime was +ve').to.be.ok;
              closeAndFinish(done, realtime);
            } catch (err) {
              closeAndFinish(done, realtime, err);
            }
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('connectionAttributes', function (done) {
      var realtime;
      try {
        realtime = helper.AblyRealtimePromise({ logLevel: 4 });
        realtime.connection.on('connected', function () {
          try {
            const recoveryContext = JSON.parse(realtime.connection.recoveryKey);
            expect(recoveryContext.connectionKey).to.equal(realtime.connection.key);
            expect(recoveryContext.msgSerial).to.equal(realtime.connection.connectionManager.msgSerial);
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }

          var channel = realtime.channels.get('connectionattributes');
          ptcb(channel.attach(), function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            async.parallel(
              [
                function (cb) {
                  channel.subscribe(function () {
                    setTimeout(function () {
                      const recoveryContext = JSON.parse(realtime.connection.recoveryKey);
                      expect(recoveryContext.connectionKey).to.equal(realtime.connection.key);
                      expect(recoveryContext.msgSerial).to.equal(realtime.connection.connectionManager.msgSerial);
                      cb();
                    }, 0);
                  });
                },
                function (cb) {
                  ptcb(channel.publish('name', 'data'), cb);
                },
              ],
              function (err) {
                if (err) {
                  closeAndFinish(done, realtime, err);
                  return;
                }
                realtime.connection.close();
                realtime.connection.whenState('closed', function () {
                  try {
                    expect(realtime.connection.recoveryKey).to.equal(null, 'verify recovery key null after close');
                    closeAndFinish(done, realtime);
                  } catch (err) {
                    closeAndFinish(done, realtime, err);
                  }
                });
              }
            );
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('unrecoverableConnection', function (done) {
      var realtime;
      const fakeRecoveryKey = JSON.stringify({
        connectionKey: '_____!ablyjs_test_fake-key____',
        msgSerial: 3,
        channelSerials: {},
      });
      try {
        realtime = helper.AblyRealtimePromise({ recover: fakeRecoveryKey });
        realtime.connection.on('connected', function (stateChange) {
          try {
            expect(stateChange.reason.code).to.equal(
              80018,
              'verify unrecoverable-connection error set in stateChange.reason'
            );
            expect(realtime.connection.errorReason.code).to.equal(
              80018,
              'verify unrecoverable-connection error set in connection.errorReason'
            );
            expect(realtime.connection.connectionManager.msgSerial).to.equal(
              0,
              'verify msgSerial is 0 (new connection), not 3'
            );
            expect(realtime.connection.key.indexOf('ablyjs_test_fake')).to.equal(
              -1,
              'verify connection using a new connectionkey'
            );
            closeAndFinish(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    /*
     * Check that a message published on one transport that has not yet been
     * acked will be republished with the same msgSerial on a new transport (eg
     * after a resume or an upgrade), before any new messages are send (and
     * without being merged with new messages)
     */
    it('connectionQueuing', function (done) {
      var realtime = helper.AblyRealtimePromise({ transports: [helper.bestTransport] }),
        channel = realtime.channels.get('connectionQueuing'),
        connectionManager = realtime.connection.connectionManager;

      realtime.connection.once('connected', function () {
        var transport = connectionManager.activeProtocol.transport;
        ptcb(channel.attach(), function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          /* Sabotage sending the message */
          transport.send = function (msg) {
            if (msg.action == 15) {
              expect(msg.msgSerial).to.equal(0, 'Expect msgSerial to be 0');
            }
          };

          async.parallel(
            [
              function (cb) {
                /* Sabotaged publish */
                ptcb(channel.publish('first', null), function (err) {
                  try {
                    expect(!err, 'Check publish happened (eventually) without err').to.be.ok;
                  } catch (err) {
                    cb(err);
                    return;
                  }
                  cb();
                });
              },
              function (cb) {
                /* After the disconnect, on reconnect, spy on transport.send again */
                connectionManager.once('transport.pending', function (transport) {
                  var oldSend = transport.send;

                  transport.send = function (msg, msgCb) {
                    if (msg.action === 15) {
                      if (msg.messages[0].name === 'first') {
                        try {
                          expect(msg.msgSerial).to.equal(0, 'Expect msgSerial of original message to still be 0');
                          expect(msg.messages.length).to.equal(
                            1,
                            'Expect second message to not have been merged with the attempted message'
                          );
                        } catch (err) {
                          cb(err);
                          return;
                        }
                      } else if (msg.messages[0].name === 'second') {
                        try {
                          expect(msg.msgSerial).to.equal(1, 'Expect msgSerial of new message to be 1');
                        } catch (err) {
                          cb(err);
                          return;
                        }
                        cb();
                      }
                    }
                    oldSend.call(transport, msg, msgCb);
                  };
                  channel.publish('second', null);
                });

                /* Disconnect the transport (will automatically reconnect and resume) () */
                connectionManager.disconnectAllTransports();
              },
            ],
            function (err) {
              closeAndFinish(done, realtime, err);
            }
          );
        });
      });
    });

    /*
     * Inject a new CONNECTED with different connectionDetails; check they're used
     */
    it('connectionDetails', function (done) {
      var realtime = helper.AblyRealtimePromise(),
        connectionManager = realtime.connection.connectionManager;
      realtime.connection.once('connected', function () {
        connectionManager.once('connectiondetails', function (details) {
          try {
            expect(details.connectionStateTtl).to.equal(12345, 'Check connectionStateTtl in event');
            expect(connectionManager.connectionStateTtl).to.equal(
              12345,
              'Check connectionStateTtl set in connectionManager'
            );
            expect(details.clientId).to.equal('foo', 'Check clientId in event');
            expect(realtime.auth.clientId).to.equal('foo', 'Check clientId set in auth');
            expect(realtime.options.maxMessageSize).to.equal(98765, 'Check maxMessageSize set');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          closeAndFinish(done, realtime);
        });
        connectionManager.activeProtocol.getTransport().onProtocolMessage(
          createPM({
            action: 4,
            connectionId: 'a',
            connectionKey: 'ab',
            connectionSerial: -1,
            connectionDetails: {
              clientId: 'foo',
              maxMessageSize: 98765,
              connectionStateTtl: 12345,
            },
          })
        );
      });
      monitorConnection(done, realtime);
    });

    if (typeof Promise !== 'undefined') {
      describe('connection_promise', function () {
        it('ping', function (done) {
          var client = helper.AblyRealtimePromise({ internal: { promises: true } });

          client.connection
            .once('connected')
            .then(function () {
              client.connection
                .ping()
                .then(function (responseTime) {
                  expect(typeof responseTime).to.equal('number', 'check that a responseTime returned');
                  expect(responseTime > 0, 'check that responseTime was positive').to.be.ok;
                  closeAndFinish(done, client);
                })
                ['catch'](function (err) {
                  closeAndFinish(done, client, err);
                });
            })
            ['catch'](function (err) {
              closeAndFinish(done, client, err);
            });
        });
      });
    }
  });
});
