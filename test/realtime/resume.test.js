'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
  var simulateDroppedConnection = helper.simulateDroppedConnection;
  var testOnAllTransports = helper.testOnAllTransports;
  var bestTransport = helper.bestTransport;

  describe('realtime/resume', function () {
    this.timeout(120 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    function mixin(target, src) {
      for (var prop in src) target[prop] = src[prop];
      return target;
    }

    function sendAndAwait(message, sendingChannel, receivingChannel, callback) {
      var event = String(Math.random());
      receivingChannel.subscribe(event, function (msg) {
        receivingChannel.unsubscribe(event);
        callback();
      });
      sendingChannel.publish(event, message, function (err) {
        if (err) callback(err);
      });
    }

    /**
     * Empty resume case
     * Send 5 messages; disconnect; reconnect; send 5 messages
     */
    function resume_inactive(done, channelName, txOpts, rxOpts) {
      var count = 5;

      var txRest = helper.AblyRest(mixin(txOpts));
      var rxRealtime = helper.AblyRealtime(mixin(rxOpts));

      var rxChannel = rxRealtime.channels.get(channelName);
      var txChannel = txRest.channels.get(channelName);
      var rxCount = 0;

      function phase0(callback) {
        rxChannel.attach(callback);
      }

      function phase1(callback) {
        function ph1TxOnce() {
          sendAndAwait('phase 1, message ' + rxCount, txChannel, rxChannel, function (err) {
            if (err) callback(err);
            if (++rxCount == count) {
              callback(null);
              return;
            }
            setTimeout(ph1TxOnce, 800);
          });
        }
        ph1TxOnce();
      }

      function phase2(callback) {
        simulateDroppedConnection(rxRealtime);
        /* continue in 5 seconds */
        setTimeout(callback, 5000);
      }

      function phase3(callback) {
        /* re-open the connection, verify resume mode */
        rxRealtime.connection.connect();
        var connectionManager = rxRealtime.connection.connectionManager;
        connectionManager.once('transport.active', function (transport) {
          try {
            expect(transport.params.mode).to.equal('resume', 'Verify reconnect is resume mode');
          } catch (err) {
            callback(err);
            return;
          }
          callback(null);
        });
      }

      function phase4(callback) {
        rxCount = 0;
        function ph4TxOnce() {
          sendAndAwait('phase 4, message ' + rxCount, txChannel, rxChannel, function (err) {
            if (err) callback(err);
            if (++rxCount == count) {
              callback(null);
              return;
            }
            setTimeout(ph4TxOnce, 800);
          });
        }
        ph4TxOnce();
      }

      phase0(function (err) {
        if (err) {
          closeAndFinish(done, rxRealtime, err);
          return;
        }
        phase1(function (err) {
          if (err) {
            closeAndFinish(done, rxRealtime, err);
            return;
          }
          phase2(function (err) {
            if (err) {
              closeAndFinish(done, rxRealtime, err);
              return;
            }
            phase3(function (err) {
              if (err) {
                closeAndFinish(done, rxRealtime, err);
                return;
              }
              phase4(function (err) {
                if (err) {
                  closeAndFinish(done, rxRealtime, err);
                  return;
                }
                closeAndFinish(done, rxRealtime);
              });
            });
          });
        });
      });
    }

    testOnAllTransports(
      'resume_inactive',
      function (realtimeOpts) {
        return function (done) {
          resume_inactive(done, 'resume_inactive' + String(Math.random()), {}, realtimeOpts);
        };
      },
      /* excludeUpgrade: */ true
    );

    /**
     * Simple resume case
     * Send 5 messages; disconnect; send 5 messages; reconnect
     */
    function resume_active(done, channelName, txOpts, rxOpts) {
      var count = 5;

      var txRest = helper.AblyRest(mixin(txOpts));
      var rxRealtime = helper.AblyRealtime(mixin(rxOpts));

      var rxChannel = rxRealtime.channels.get(channelName);
      var txChannel = txRest.channels.get(channelName);
      var rxCount = 0;

      function phase0(callback) {
        rxChannel.attach(callback);
      }

      function phase1(callback) {
        function ph1TxOnce() {
          sendAndAwait('phase 1, message ' + rxCount, txChannel, rxChannel, function (err) {
            if (err) callback(err);
            if (++rxCount == count) {
              callback(null);
              return;
            }
            setTimeout(ph1TxOnce, 800);
          });
        }
        ph1TxOnce();
      }

      function phase2(callback) {
        /* disconnect the transport and send 5 more messages
         * NOTE: this uses knowledge of the internal operation
         * of the client library to simulate a dropped connection
         * without explicitly closing the connection */
        simulateDroppedConnection(rxRealtime);
        var txCount = 0;

        function ph2TxOnce() {
          txChannel.publish('sentWhileDisconnected', 'phase 2, message ' + txCount, function (err) {
            if (err) callback(err);
          });
          if (++txCount == count) {
            /* sent all messages */
            setTimeout(function () {
              callback(null);
            }, 1000);
            return;
          }
          setTimeout(ph2TxOnce, 1000);
        }

        setTimeout(ph2TxOnce, 800);
      }

      function phase3(callback) {
        /* subscribe, re-open the connection, verify resume mode */
        rxChannel.subscribe('sentWhileDisconnected', function (msg) {
          ++rxCount;
        });
        rxCount = 0;
        rxRealtime.connection.connect();
        var connectionManager = rxRealtime.connection.connectionManager;
        connectionManager.on('transport.active', function (transport) {
          try {
            expect(transport.params.mode).to.equal('resume', 'Verify reconnect is resume mode');
          } catch (err) {
            callback(err);
            return;
          }
          setTimeout(function () {
            try {
              expect(rxCount).to.equal(count, 'Verify Phase 3 messages all received');
            } catch (err) {
              callback(err);
              return;
            }
            callback(null);
          }, 2000);
        });
      }

      phase0(function (err) {
        if (err) {
          closeAndFinish(done, rxRealtime, err);
          return;
        }
        phase1(function (err) {
          if (err) {
            closeAndFinish(done, rxRealtime, err);
            return;
          }
          phase2(function (err) {
            if (err) {
              closeAndFinish(done, rxRealtime, err);
              return;
            }
            phase3(function (err) {
              if (err) {
                closeAndFinish(done, rxRealtime, err);
                return;
              }
              closeAndFinish(done, rxRealtime);
            });
          });
        });
      });
    }

    testOnAllTransports(
      'resume_active',
      function (realtimeOpts) {
        return function (done) {
          resume_active(done, 'resume_active' + String(Math.random()), {}, realtimeOpts);
        };
      },
      /* excludeUpgrade: */ true
    );

    /* RTN15c3
     * Resume with loss of continuity
     */
    testOnAllTransports(
      'resume_lost_continuity',
      function (realtimeOpts) {
        return function (done) {
          var realtime = helper.AblyRealtime(realtimeOpts),
            connection = realtime.connection,
            attachedChannelName = 'resume_lost_continuity_attached',
            suspendedChannelName = 'resume_lost_continuity_suspended',
            attachedChannel = realtime.channels.get(attachedChannelName),
            suspendedChannel = realtime.channels.get(suspendedChannelName);

          async.series(
            [
              function (cb) {
                connection.once('connected', function () {
                  cb();
                });
              },
              function (cb) {
                suspendedChannel.state = 'suspended';
                attachedChannel.attach(cb);
              },
              function (cb) {
                /* Sabotage the resume */
                (connection.connectionManager.connectionKey = '_____!ablyjs_test_fake-key____'),
                  (connection.connectionManager.connectionId = 'ablyjs_tes');
                connection.connectionManager.msgSerial = 15;
                connection.once('disconnected', function () {
                  cb();
                });
                connection.connectionManager.disconnectAllTransports();
              },
              function (cb) {
                connection.once('connected', function (stateChange) {
                  try {
                    expect(stateChange.reason && stateChange.reason.code).to.equal(
                      80018,
                      'Unable to recover connection correctly set in the stateChange'
                    );
                    expect(attachedChannel.state).to.equal('attaching', 'Attached channel went into attaching');
                    expect(suspendedChannel.state).to.equal('attaching', 'Suspended channel went into attaching');
                    expect(connection.connectionManager.msgSerial).to.equal(0, 'Check msgSerial is reset to 0');
                    expect(
                      connection.connectionManager.connectionId !== 'ablyjs_tes',
                      'Check connectionId is set by the new CONNECTED'
                    ).to.be.ok;
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
        };
      },
      true /* Use a fixed transport as attaches are resent when the transport changes */
    );

    /* RTN15c5
     * Resume with token error
     */
    testOnAllTransports(
      'resume_token_error',
      function (realtimeOpts) {
        return function (done) {
          var realtime = helper.AblyRealtime(mixin(realtimeOpts, { useTokenAuth: true })),
            badtoken,
            connection = realtime.connection;

          async.series(
            [
              function (cb) {
                connection.once('connected', function () {
                  cb();
                });
              },
              function (cb) {
                realtime.auth.requestToken({ ttl: 1 }, null, function (err, token) {
                  badtoken = token;
                  cb(err);
                });
              },
              function (cb) {
                /* Sabotage the resume - use a valid but now-expired token */
                realtime.auth.tokenDetails.token = badtoken.token;
                connection.once(function (stateChange) {
                  try {
                    expect(stateChange.current, 'disconnected', 'check connection disconnects first').to.be.ok;
                  } catch (err) {
                    cb(err);
                    return;
                  }
                  cb();
                });
                connection.connectionManager.disconnectAllTransports();
              },
              function (cb) {
                connection.once('connected', function (stateChange) {
                  cb();
                });
              },
            ],
            function (err) {
              closeAndFinish(done, realtime, err);
            }
          );
        };
      },
      true
    );

    /* RTN15c4
     * Resume with fatal error
     */
    testOnAllTransports(
      'resume_fatal_error',
      function (realtimeOpts) {
        return function (done) {
          var realtime = helper.AblyRealtime(realtimeOpts),
            connection = realtime.connection;

          async.series(
            [
              function (cb) {
                connection.once('connected', function () {
                  cb();
                });
              },
              function (cb) {
                var keyName = realtime.auth.key.split(':')[0];
                realtime.auth.key = keyName + ':wrong';
                connection.once(function (stateChange) {
                  try {
                    expect(stateChange.current, 'disconnected', 'check connection disconnects first').to.be.ok;
                  } catch (err) {
                    cb(err);
                    return;
                  }
                  cb();
                });
                connection.connectionManager.disconnectAllTransports();
              },
              function (cb) {
                connection.once('failed', function (stateChange) {
                  try {
                    expect(stateChange.reason.code).to.equal(40101, 'check correct code propogated');
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
        };
      },
      true
    );

    /* RTL2f
     * Check channel resumed flag
     * TODO: enable once realtime supports this
     */
    it('channel_resumed_flag', function (done) {
      var realtime = helper.AblyRealtime(),
        realtimeTwo,
        recoveryKey,
        connection = realtime.connection,
        channelName = 'channel_resumed_flag',
        channel = realtime.channels.get(channelName);

      async.series(
        [
          function (cb) {
            connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            channel.attach();
            channel.once('attached', function (stateChange) {
              try {
                expect(stateChange.resumed).to.equal(false, 'Check channel not resumed when first attached');
              } catch (err) {
                cb(err);
                return;
              }
              recoveryKey = connection.getRecoveryKey();
              cb();
            });
          },
          function (cb) {
            helper.becomeSuspended(realtime, cb);
          },
          function (cb) {
            realtimeTwo = helper.AblyRealtime({ recover: recoveryKey });
            realtimeTwo.connection.once('connected', function (stateChange) {
              if (stateChange.reason) {
                cb(stateChange.reason);
                return;
              }
              cb();
            });
          },
          function (cb) {
            var channelTwo = realtimeTwo.channels.get(channelName);
            channelTwo.attach();
            channelTwo.once('attached', function (stateChange) {
              try {
                expect(stateChange.resumed).to.equal(true, 'Check resumed flag is true');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            });
          },
        ],
        function (err) {
          closeAndFinish(done, [realtime, realtimeTwo], err);
        }
      );
    });

    /*
     * Check the library doesn't try to resume once the connectionStateTtl has expired
     */
    it('no_resume_once_suspended', function (done) {
      var realtime = helper.AblyRealtime(),
        connection = realtime.connection,
        channelName = 'no_resume_once_suspended';

      async.series(
        [
          function (cb) {
            connection.once('connected', function () {
              cb();
            });
          },
          function (cb) {
            helper.becomeSuspended(realtime, cb);
          },
          function (cb) {
            realtime.connection.connectionManager.tryATransport = function (transportParams) {
              try {
                expect(transportParams.mode).to.equal('clean', 'Check library didn’t try to resume');
              } catch (err) {
                cb(err);
                return;
              }
              cb();
            };
            connection.connect();
          },
        ],
        function (err) {
          closeAndFinish(done, realtime, err);
        }
      );
    });

    /*
     * Check the library doesn't try to resume if the last known activity on the
     * connection was > connectionStateTtl ago
     */
    it('no_resume_last_activity', function (done) {
      /* Specify a best transport so that upgrade activity doesn't reset the last activity timer */
      var realtime = helper.AblyRealtime({ transports: [bestTransport] }),
        connection = realtime.connection,
        connectionManager = connection.connectionManager;

      connection.once('connected', function () {
        connectionManager.lastActivity = helper.Utils.now() - 10000000;
        /* noop-out onProtocolMessage so that a DISCONNECTED message doesn't
         * reset the last activity timer */
        connectionManager.activeProtocol.getTransport().onProtocolMessage = function () {};
        connectionManager.tryATransport = function (transportParams) {
          try {
            expect(transportParams.mode).to.equal('clean', 'Check library didn’t try to resume');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          closeAndFinish(done, realtime);
        };
        connectionManager.disconnectAllTransports();
      });
    });

    it('resume_rewind_1', function (done) {
      var testName = 'resume_rewind_1';
      var testMessage = { foo: 'bar', count: 1, status: 'active' };
      try {
        var sender_realtime = helper.AblyRealtime();
        var sender_channel = sender_realtime.channels.get(testName);

        sender_channel.subscribe(function (message) {
          var receiver_realtime = helper.AblyRealtime();
          var receiver_channel = receiver_realtime.channels.get(testName, { params: { rewind: 1 } });

          receiver_channel.subscribe(function (message) {
            try {
              expect(
                JSON.stringify(testMessage) === JSON.stringify(message.data),
                'Check rewound message.data'
              ).to.be.ok;
            } catch (err) {
              closeAndFinish(done, [sender_realtime, receiver_realtime], err);
              return;
            }

            var resumed_receiver_realtime = helper.AblyRealtime();
            var connectionManager = resumed_receiver_realtime.connection.connectionManager;

            var sendOrig = connectionManager.send;
            connectionManager.send = function (msg, queueEvent, callback) {
              msg.setFlag('ATTACH_RESUME');
              sendOrig.call(connectionManager, msg, queueEvent, callback);
            };

            var resumed_receiver_channel = resumed_receiver_realtime.channels.get(testName, { params: { rewind: 1 } });

            resumed_receiver_channel.subscribe(function (message) {
              clearTimeout(success);
              closeAndFinish(
                done,
                [sender_realtime, receiver_realtime, resumed_receiver_realtime],
                new Error('Rewound message arrived on attach resume')
              );
            });

            var success = setTimeout(function () {
              closeAndFinish(done, [sender_realtime, receiver_realtime, resumed_receiver_realtime]);
            }, 7000);
          });
        });

        sender_realtime.connection.on('connected', function () {
          sender_channel.publish('0', testMessage);
        });
      } catch (err) {
        closeAndFinish(done, [sender_realtime, receiver_realtime, resumed_receiver_realtime], err);
      }
    });

    it('recover multiple channels', async function () {
      const NUM_MSGS = 5;

      const txRest = helper.AblyRest();
      const rxRealtime = helper.AblyRealtime({ transports: [helper.bestTransport] }, true);

      const channelNames = Array(5)
        .fill()
        .map(() => String(Math.random()));
      const rxChannels = channelNames.map((name) => rxRealtime.channels.get(name));

      await Promise.all(rxChannels.map((channel) => channel.attach()));

      // Do a few publishes on each channel so the channelSerial is set.
      await Promise.all(
        channelNames.map(async (name) => {
          const tx = txRest.channels.get(name);
          const rx = rxRealtime.channels.get(name);
          await rx.attach();

          for (let i = 0; i < NUM_MSGS; i++) {
            const pSubscribe = rx.subscriptions.once();
            await tx.publish(null, null);
            await pSubscribe;
          }
        })
      );

      // Get the recovery key before becoming suspended as it will be reset.
      const recoveryKey = rxRealtime.connection.getRecoveryKey();

      await new Promise((resolve) => helper.becomeSuspended(rxRealtime, resolve));

      // Send some messages after we've detached that should be recovered.
      for (const name of channelNames) {
        const tx = txRest.channels.get(name);
        for (let i = 0; i < NUM_MSGS; i++) {
          await tx.publish('sentWhileDisconnected', null);
        }
      }

      const rxRealtimeRecover = helper.AblyRealtime({ recover: recoveryKey });
      const rxRecoverChannels = channelNames.map((name) => rxRealtimeRecover.channels.get(name));

      // Attach recovered channels and check we receive the expected messages.
      await Promise.all(
        rxRecoverChannels.map(async (channel) => {
          await channel.attach();

          await new Promise((resolve) => {
            let recoveredCount = 0;
            channel.subscribe((msg) => {
              // Check we don't receive unexpected messages.
              expect(msg.name).to.equal('sentWhileDisconnected');

              recoveredCount++;
              if (recoveredCount === NUM_MSGS) {
                resolve();
              }
            });
          });
        })
      );

      await rxRealtime.close();
      await rxRealtimeRecover.close();
    });
  });
});
