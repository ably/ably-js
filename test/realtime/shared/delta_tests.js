define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  function registerDeltaTests(describeLabel, config) {
    var expect = chai.expect;
    var displayError = helper.displayError;
    var closeAndFinish = helper.closeAndFinish;
    var monitorConnection = helper.monitorConnection;
    var whenPromiseSettles = helper.whenPromiseSettles;
    var testData = [
      { foo: 'bar', count: 1, status: 'active' },
      { foo: 'bar', count: 2, status: 'active' },
      { foo: 'bar', count: 2, status: 'inactive' },
      { foo: 'bar', count: 3, status: 'inactive' },
      { foo: 'bar', count: 3, status: 'active' },
    ];

    function equals(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    function getTestVcdiffDecoder(realtime) {
      if (!realtime._decodeVcdiff) {
        throw new Error('Expected client to expose vcdiff decoder via _decodeVcdiff property');
      }

      let numberOfCalls = 0;

      const originalDecodeVcdiff = realtime._decodeVcdiff;
      const testDecodeVcdiff = function (delta, base) {
        numberOfCalls++;
        return originalDecodeVcdiff(delta, base);
      };

      realtime._decodeVcdiff = testDecodeVcdiff;

      return {
        get numberOfCalls() {
          return numberOfCalls;
        },
        decode: testDecodeVcdiff,
      };
    }

    describe(describeLabel, function () {
      this.timeout(60 * 1000);

      before(function (done) {
        helper.setupApp(function (err) {
          if (err) {
            done(err);
          }
          done();
        });
      });

      if (config.createRealtimeWithDeltaPlugin) {
        it('deltaPlugin', function (done) {
          var testName = 'deltaPlugin';
          try {
            var realtime = config.createRealtimeWithDeltaPlugin(helper.ablyClientOptions());
            var testVcdiffDecoder = getTestVcdiffDecoder(realtime);
            var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

            whenPromiseSettles(channel.attach(), function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
              }

              channel.on('attaching', function (stateChange) {
                done(
                  new Error(
                    'Channel reattaching, presumably due to decode failure; reason =' + displayError(stateChange.reason)
                  )
                );
              });

              channel.subscribe(function (message) {
                try {
                  var index = Number(message.name);
                  expect(equals(testData[index], message.data), 'Check message.data').to.be.ok;

                  if (index === testData.length - 1) {
                    expect(testVcdiffDecoder.numberOfCalls).to.equal(
                      testData.length - 1,
                      'Check number of delta messages'
                    );
                    closeAndFinish(done, realtime);
                  }
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                }
              });

              async.timesSeries(testData.length, function (i, cb) {
                channel.publish(i.toString(), testData[i], cb);
              });
            });

            monitorConnection(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      }

      if (config.createRealtimeWithDeltaPlugin) {
        it('unusedPlugin', function (done) {
          var testName = 'unusedPlugin';
          try {
            var realtime = config.createRealtimeWithDeltaPlugin(helper.ablyClientOptions());
            var testVcdiffDecoder = getTestVcdiffDecoder(realtime);
            var channel = realtime.channels.get(testName);

            whenPromiseSettles(channel.attach(), function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
              }
              channel.subscribe(function (message) {
                try {
                  var index = Number(message.name);
                  expect(equals(testData[index], message.data), 'Check message.data').to.be.ok;

                  if (index === testData.length - 1) {
                    expect(testVcdiffDecoder.numberOfCalls).to.equal(0, 'Check number of delta messages');
                    closeAndFinish(done, realtime);
                  }
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                }
              });

              async.timesSeries(testData.length, function (i, cb) {
                channel.publish(i.toString(), testData[i], cb);
              });
            });

            monitorConnection(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      }

      if (config.createRealtimeWithDeltaPlugin) {
        it('lastMessageNotFoundRecovery', function (done) {
          var testName = 'lastMessageNotFoundRecovery';
          try {
            var realtime = config.createRealtimeWithDeltaPlugin(helper.ablyClientOptions());
            var testVcdiffDecoder = getTestVcdiffDecoder(realtime);
            var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

            whenPromiseSettles(channel.attach(), function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
              }
              channel.subscribe(function (message) {
                var index = Number(message.name);
                try {
                  expect(equals(testData[index], message.data), 'Check message.data').to.be.ok;
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                }

                if (index === 1) {
                  /* Simulate issue */
                  channel._lastPayload.messageId = null;
                  channel.once('attaching', function (stateChange) {
                    try {
                      expect(stateChange.reason.code).to.equal(40018, 'Check error code passed through per RTL18c');
                    } catch (err) {
                      closeAndFinish(done, realtime, err);
                      return;
                    }
                    channel.on('attaching', function (stateChange) {
                      closeAndFinish(
                        done,
                        realtime,
                        new Error('Check no further decode failures; reason =' + displayError(stateChange.reason))
                      );
                    });
                  });
                } else if (index === testData.length - 1) {
                  try {
                    expect(testVcdiffDecoder.numberOfCalls).to.equal(
                      testData.length - 2,
                      'Check number of delta messages'
                    );
                  } catch (err) {
                    closeAndFinish(done, realtime, err);
                    return;
                  }
                  closeAndFinish(done, realtime);
                }
              });

              async.timesSeries(testData.length, function (i, cb) {
                channel.publish(i.toString(), testData[i], cb);
              });
            });

            monitorConnection(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      }

      if (config.createRealtimeWithDeltaPlugin) {
        it('deltaDecodeFailureRecovery', function (done) {
          var testName = 'deltaDecodeFailureRecovery';
          try {
            var realtime = config.createRealtimeWithDeltaPlugin(helper.ablyClientOptions());

            realtime._decodeVcdiff = function (delta, base) {
              throw new Error('Failed to decode delta.');
            };

            var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

            whenPromiseSettles(channel.attach(), function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
              }
              channel.on('attaching', function (stateChange) {
                try {
                  expect(stateChange.reason.code).to.equal(40018, 'Check error code passed through per RTL18c');
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                }
              });
              channel.subscribe(function (message) {
                var index = Number(message.name);
                try {
                  expect(equals(testData[index], message.data), 'Check message.data').to.be.ok;
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                }

                if (index === testData.length - 1) {
                  closeAndFinish(done, realtime);
                }
              });

              async.timesSeries(testData.length, function (i, cb) {
                channel.publish(i.toString(), testData[i], cb);
              });
            });

            monitorConnection(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      }

      if (config.createRealtimeWithoutDeltaPlugin) {
        /* Check that channel becomes failed if we get deltas when we don't have a vcdiff plugin */
        it('noPlugin', function (done) {
          try {
            var realtime = config.createRealtimeWithoutDeltaPlugin(helper.ablyClientOptions());
            var channel = realtime.channels.get('noPlugin', { params: { delta: 'vcdiff' } });

            whenPromiseSettles(channel.attach(), function (err) {
              if (err) {
                closeAndFinish(done, realtime, err);
              }
              channel.once('failed', function (stateChange) {
                try {
                  expect(stateChange.reason.code).to.equal(40019, 'Check error code');
                } catch (err) {
                  closeAndFinish(done, realtime, err);
                  return;
                }
                closeAndFinish(done, realtime);
              });
              async.timesSeries(testData.length, function (i, cb) {
                channel.publish(i.toString(), testData[i], cb);
              });
            });

            monitorConnection(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      }
    });
  }

  return (module.exports = registerDeltaTests);
});
