'use strict';

define(['shared_helper', 'vcdiff-decoder', 'async', 'chai'], function (helper, vcdiffDecoder, async, chai) {
  var expect = chai.expect;
  var displayError = helper.displayError;
  var closeAndFinish = helper.closeAndFinish;
  var monitorConnection = helper.monitorConnection;
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

  function getTestVcdiffDecoder() {
    return {
      numberOfCalls: 0,
      decode: function (delta, base) {
        this.numberOfCalls++;
        return vcdiffDecoder.decode(delta, base);
      },
    };
  }

  describe('realtime/delta', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('deltaPlugin', function (done) {
      var testName = 'deltaPlugin';
      try {
        var testVcdiffDecoder = getTestVcdiffDecoder();
        var realtime = helper.AblyRealtime({
          plugins: {
            vcdiff: testVcdiffDecoder,
          },
        });
        var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

        channel.attach(function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
          }

          channel.on('attaching', function (stateChange) {
            done(
              new Error(
                'Channel reattaching, presumably due to decode failure; reason =' + displayError(stateChange.reason),
              ),
            );
          });

          channel.subscribe(function (message) {
            try {
              var index = Number(message.name);
              expect(equals(testData[index], message.data), 'Check message.data').to.be.ok;

              if (index === testData.length - 1) {
                expect(testVcdiffDecoder.numberOfCalls).to.equal(testData.length - 1, 'Check number of delta messages');
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

    it('unusedPlugin', function (done) {
      var testName = 'unusedPlugin';
      try {
        var testVcdiffDecoder = getTestVcdiffDecoder();
        var realtime = helper.AblyRealtime({
          plugins: {
            vcdiff: testVcdiffDecoder,
          },
        });
        var channel = realtime.channels.get(testName);

        channel.attach(function (err) {
          if (err) {
            closeAndFinish(doner, realtime, err);
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

    it('lastMessageNotFoundRecovery', function (done) {
      var testName = 'lastMessageNotFoundRecovery';
      try {
        var testVcdiffDecoder = getTestVcdiffDecoder();
        var realtime = helper.AblyRealtime({
          plugins: {
            vcdiff: testVcdiffDecoder,
          },
        });
        var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

        channel.attach(function (err) {
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
                    new Error('Check no further decode failures; reason =' + displayError(stateChange.reason)),
                  );
                });
              });
            } else if (index === testData.length - 1) {
              try {
                expect(testVcdiffDecoder.numberOfCalls).to.equal(testData.length - 2, 'Check number of delta messages');
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

    it('deltaDecodeFailureRecovery', function (done) {
      var testName = 'deltaDecodeFailureRecovery';
      try {
        var failingTestVcdiffDecoder = {
          decode: function (delta, base) {
            throw new Error('Failed to decode delta.');
          },
        };

        var realtime = helper.AblyRealtime({
          plugins: {
            vcdiff: failingTestVcdiffDecoder,
          },
        });
        var channel = realtime.channels.get(testName, { params: { delta: 'vcdiff' } });

        channel.attach(function (err) {
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

    /* Check that channel becomes failed if we get deltas when we don't have a vcdiff plugin */
    it('noPlugin', function (done) {
      try {
        var realtime = helper.AblyRealtime();
        var channel = realtime.channels.get('noPlugin', { params: { delta: 'vcdiff' } });

        channel.attach(function (err) {
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
  });
});
