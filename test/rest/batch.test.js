'use strict';

// NOTE: All of the Promise-related tests in this file are intentionally a copy of the callback versions. This will allow us to simply remove the callback versions when merging this functionality into the integration/v2 branch (https://github.com/ably/ably-js/issues/1411).

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
  var randomString = helper.randomString;

  describe('rest/batchPublish', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    describe('when invoked with an array of specs', function () {
      it('performs a batch publish and returns an array of results', function (done) {
        const testApp = helper.getTestApp();
        const rest = helper.AblyRest({
          key: testApp.keys[2].keyStr /* we use this key so that some publishes fail due to capabilities */,
        });
        const verificationRest = helper.AblyRest();

        const specs = [
          {
            channels: [
              'channel0' /* key allows publishing to this channel */,
              'channel3' /* key does not allow publishing to this channel */,
            ],
            messages: [{ data: 'message1' }, { data: 'message2' }],
          },
          {
            channels: [
              'channel4' /* key allows publishing to this channel */,
              'channel5' /* key does not allow publishing to this channel */,
            ],
            messages: [{ data: 'message3' }, { data: 'message4' }],
          },
        ];

        async.series(
          [
            // First, we perform the batch publish request...
            function (cb) {
              rest.batchPublish(specs, function (err, batchResults) {
                if (err) {
                  cb(err);
                  return;
                }

                try {
                  expect(batchResults).to.have.lengthOf(specs.length);

                  expect(batchResults[0].successCount).to.equal(1);
                  expect(batchResults[0].failureCount).to.equal(1);

                  // Check the results of first BatchPublishSpec

                  expect(batchResults[0].results).to.have.lengthOf(2);

                  expect(batchResults[0].results[0].channel).to.equal('channel0');
                  expect(batchResults[0].results[0].messageId).to.include(':0');
                  expect('error' in batchResults[0].results[0]).to.be.false;

                  expect(batchResults[0].results[1].channel).to.equal('channel3');
                  expect('messageId' in batchResults[0].results[1]).to.be.false;
                  expect(batchResults[0].results[1].error.statusCode).to.equal(401);

                  // Check the results of second BatchPublishSpec

                  expect(batchResults[1].results).to.have.lengthOf(2);

                  expect(batchResults[1].results[0].channel).to.equal('channel4');
                  expect(batchResults[1].results[0].messageId).to.include(':0');
                  expect('error' in batchResults[1].results[0]).to.be.false;

                  expect(batchResults[1].results[1].channel).to.equal('channel5');
                  expect('messageId' in batchResults[1].results[1]).to.be.false;
                  expect(batchResults[1].results[1].error.statusCode).to.equal(401);
                } catch (err) {
                  cb(err);
                  return;
                }

                cb();
              });
            },
            function (cb) {
              // ...and now we use channel history to check that the expected messages have been published.
              async.parallel(
                [
                  function (cb) {
                    const channel0 = verificationRest.channels.get('channel0');
                    channel0.history({ limit: 2 }, function (err, result) {
                      if (err) {
                        cb(err);
                        return;
                      }

                      const data = new Set([result.items[0].data, result.items[1].data]);

                      try {
                        expect(data).to.deep.equal(new Set(['message1', 'message2']));
                      } catch (err) {
                        cb(err);
                        return;
                      }

                      cb();
                    });
                  },
                  function (cb) {
                    const channel4 = verificationRest.channels.get('channel4');
                    channel4.history({ limit: 2 }, function (err, result) {
                      if (err) {
                        cb(err);
                        return;
                      }

                      const data = new Set([result.items[0].data, result.items[1].data]);
                      try {
                        expect(data).to.deep.equal(new Set(['message3', 'message4']));
                      } catch (err) {
                        cb(err);
                        return;
                      }

                      cb();
                    });
                  },
                ],
                cb
              );
            },
          ],
          done
        );
      });
    });

    describe('when invoked with a single spec', function () {
      it('performs a batch publish and returns a single result', function (done) {
        const testApp = helper.getTestApp();
        const rest = helper.AblyRest({
          key: testApp.keys[2].keyStr /* we use this key so that some publishes fail due to capabilities */,
        });
        const verificationRest = helper.AblyRest();

        const spec = {
          channels: [
            'channel0' /* key allows publishing to this channel */,
            'channel3' /* key does not allow publishing to this channel */,
          ],
          messages: [{ data: 'message1' }, { data: 'message2' }],
        };

        async.series(
          [
            // First, we perform the batch publish request...
            function (cb) {
              rest.batchPublish(spec, function (err, batchResult) {
                if (err) {
                  cb(err);
                  return;
                }

                try {
                  expect(batchResult.successCount).to.equal(1);
                  expect(batchResult.failureCount).to.equal(1);

                  expect(batchResult.results).to.have.lengthOf(2);

                  expect(batchResult.results[0].channel).to.equal('channel0');
                  expect(batchResult.results[0].messageId).to.include(':0');
                  expect('error' in batchResult.results[0]).to.be.false;

                  expect(batchResult.results[1].channel).to.equal('channel3');
                  expect('messageId' in batchResult.results[1]).to.be.false;
                  expect(batchResult.results[1].error.statusCode).to.equal(401);
                } catch (err) {
                  cb(err);
                  return;
                }

                cb();
              });
            },
            function (cb) {
              // ...and now we use channel history to check that the expected messages have been published.
              const channel0 = verificationRest.channels.get('channel0');
              channel0.history({ limit: 2 }, function (err, result) {
                if (err) {
                  cb(err);
                  return;
                }

                const data = new Set([result.items[0].data, result.items[1].data]);
                try {
                  expect(data).to.deep.equal(new Set(['message1', 'message2']));
                } catch (err) {
                  cb(err);
                  return;
                }

                cb();
              });
            },
          ],
          done
        );
      });
    });

    if (typeof Promise !== 'undefined') {
      describe('using promises', function () {
        describe('when invoked with an array of specs', function () {
          it('performs a batch publish and returns an array of results', async function () {
            const testApp = helper.getTestApp();
            const rest = helper.AblyRest({
              promises: true,
              key: testApp.keys[2].keyStr /* we use this key so that some publishes fail due to capabilities */,
            });

            const specs = [
              {
                channels: [
                  'channel0' /* key allows publishing to this channel */,
                  'channel3' /* key does not allow publishing to this channel */,
                ],
                messages: [{ data: 'message1' }, { data: 'message2' }],
              },
              {
                channels: [
                  'channel4' /* key allows publishing to this channel */,
                  'channel5' /* key does not allow publishing to this channel */,
                ],
                messages: [{ data: 'message3' }, { data: 'message4' }],
              },
            ];

            // First, we perform the batch publish request...
            const batchResults = await rest.batchPublish(specs);

            expect(batchResults).to.have.lengthOf(specs.length);

            expect(batchResults[0].successCount).to.equal(1);
            expect(batchResults[0].failureCount).to.equal(1);

            // Check the results of first BatchPublishSpec

            expect(batchResults[0].results).to.have.lengthOf(2);

            expect(batchResults[0].results[0].channel).to.equal('channel0');
            expect(batchResults[0].results[0].messageId).to.include(':0');
            expect('error' in batchResults[0].results[0]).to.be.false;

            expect(batchResults[0].results[1].channel).to.equal('channel3');
            expect('messageId' in batchResults[0].results[1]).to.be.false;
            expect(batchResults[0].results[1].error.statusCode).to.equal(401);

            // Check the results of second BatchPublishSpec

            expect(batchResults[1].results).to.have.lengthOf(2);

            expect(batchResults[1].results[0].channel).to.equal('channel4');
            expect(batchResults[1].results[0].messageId).to.include(':0');
            expect('error' in batchResults[1].results[0]).to.be.false;

            expect(batchResults[1].results[1].channel).to.equal('channel5');
            expect('messageId' in batchResults[1].results[1]).to.be.false;
            expect(batchResults[1].results[1].error.statusCode).to.equal(401);

            // ...and now we use channel history to check that the expected messages have been published.
            const verificationRest = helper.AblyRest({ promises: true });

            const channel0 = verificationRest.channels.get('channel0');
            const channel0HistoryPromise = channel0.history({ limit: 2 });

            const channel4 = verificationRest.channels.get('channel4');
            const channel4HistoryPromise = channel4.history({ limit: 2 });

            const [channel0History, channel4History] = await Promise.all([
              channel0HistoryPromise,
              channel4HistoryPromise,
            ]);

            const channel0HistoryData = new Set([channel0History.items[0].data, channel0History.items[1].data]);
            expect(channel0HistoryData).to.deep.equal(new Set(['message1', 'message2']));

            const channel4HistoryData = new Set([channel4History.items[0].data, channel4History.items[1].data]);
            expect(channel4HistoryData).to.deep.equal(new Set(['message3', 'message4']));
          });
        });

        describe('when invoked with a single spec', function () {
          it('performs a batch publish and returns a single result', async function () {
            const testApp = helper.getTestApp();
            const rest = helper.AblyRest({
              promises: true,
              key: testApp.keys[2].keyStr /* we use this key so that some publishes fail due to capabilities */,
            });

            const spec = {
              channels: [
                'channel0' /* key allows publishing to this channel */,
                'channel3' /* key does not allow publishing to this channel */,
              ],
              messages: [{ data: 'message1' }, { data: 'message2' }],
            };

            // First, we perform the batch publish request...
            const batchResult = await rest.batchPublish(spec);

            expect(batchResult.successCount).to.equal(1);
            expect(batchResult.failureCount).to.equal(1);

            expect(batchResult.results).to.have.lengthOf(2);

            expect(batchResult.results[0].channel).to.equal('channel0');
            expect(batchResult.results[0].messageId).to.include(':0');
            expect('error' in batchResult.results[0]).to.be.false;

            expect(batchResult.results[1].channel).to.equal('channel3');
            expect('messageId' in batchResult.results[1]).to.be.false;
            expect(batchResult.results[1].error.statusCode).to.equal(401);

            // ...and now we use channel history to check that the expected messages have been published.
            const verificationRest = helper.AblyRest({ promises: true });
            const channel0 = verificationRest.channels.get('channel0');
            const channel0History = await channel0.history({ limit: 2 });

            const channel0HistoryData = new Set([channel0History.items[0].data, channel0History.items[1].data]);
            expect(channel0HistoryData).to.deep.equal(new Set(['message1', 'message2']));
          });
        });
      });
    }
  });

  describe('rest/batchPresence', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('performs a batch presence fetch and returns a result', function (done) {
      const testApp = helper.getTestApp();
      const rest = helper.AblyRest({
        key: testApp.keys[2].keyStr /* we use this key so that some presence fetches fail due to capabilities */,
      });

      const presenceEnterRealtime = helper.AblyRealtime(
        {
          clientId: 'batchPresenceTest',
        } /* note that the key used here has no capability limitations, so that we can use this instance to enter presence below */
      );

      const channelNames = [
        'channel0' /* key does not allow presence on this channel */,
        'channel4' /* key allows presence on this channel */,
      ];

      async.series(
        [
          // First, we enter presence on two channels...
          function (cb) {
            presenceEnterRealtime.channels.get('channel0').presence.enter(cb);
          },
          function (cb) {
            presenceEnterRealtime.channels.get('channel4').presence.enter(cb);
          },
          // ...and now we perform the batch presence request.
          function (cb) {
            rest.batchPresence(channelNames, function (err, batchResult) {
              if (err) {
                cb(err);
              }

              try {
                expect(batchResult.successCount).to.equal(1);
                expect(batchResult.failureCount).to.equal(1);

                // Check that the channel0 presence fetch request fails (due to key’s capabilities, as mentioned above)

                expect(batchResult.results[0].channel).to.equal('channel0');
                expect('presence' in batchResult.results[0]).to.be.false;
                expect(batchResult.results[0].error.statusCode).to.equal(401);

                // Check that the channel4 presence fetch request reflects the presence enter performed above

                expect(batchResult.results[1].channel).to.equal('channel4');
                expect(batchResult.results[1].presence).to.have.lengthOf(1);
                expect(batchResult.results[1].presence[0].clientId).to.equal('batchPresenceTest');
                expect('error' in batchResult.results[1]).to.be.false;
              } catch (err) {
                cb(err);
                return;
              }

              cb();
            });
          },
          function (cb) {
            closeAndFinish(cb, presenceEnterRealtime);
          },
        ],
        done
      );
    });

    if (typeof Promise !== 'undefined') {
      describe('using promises', function () {
        it('performs a batch presence fetch and returns a result', async function () {
          const testApp = helper.getTestApp();
          const rest = helper.AblyRest({
            promises: true,
            key: testApp.keys[2].keyStr /* we use this key so that some presence fetches fail due to capabilities */,
          });

          const presenceEnterRealtime = helper.AblyRealtime({
            promises: true,
            clientId:
              'batchPresenceTest' /* note that the key used here has no capability limitations, so that we can use this instance to enter presence below */,
          });

          const channelNames = [
            'channel0' /* key does not allow presence on this channel */,
            'channel4' /* key allows presence on this channel */,
          ];

          // First, we enter presence on two channels...
          await presenceEnterRealtime.channels.get('channel0').presence.enter();
          await presenceEnterRealtime.channels.get('channel4').presence.enter();

          // ...and now we perform the batch presence request.
          const batchResult = await rest.batchPresence(channelNames);

          expect(batchResult.successCount).to.equal(1);
          expect(batchResult.failureCount).to.equal(1);

          // Check that the channel0 presence fetch request fails (due to key’s capabilities, as mentioned above)

          expect(batchResult.results[0].channel).to.equal('channel0');
          expect('presence' in batchResult.results[0]).to.be.false;
          expect(batchResult.results[0].error.statusCode).to.equal(401);

          // Check that the channel4 presence fetch request reflects the presence enter performed above

          expect(batchResult.results[1].channel).to.equal('channel4');
          expect(batchResult.results[1].presence).to.have.lengthOf(1);
          expect(batchResult.results[1].presence[0].clientId).to.equal('batchPresenceTest');
          expect('error' in batchResult.results[1]).to.be.false;

          await new Promise((resolve, reject) => {
            closeAndFinish((err) => {
              err ? reject(err) : resolve();
            }, presenceEnterRealtime);
          });
        });
      });
    }
  });

  describe('rest/revokeTokens', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('revokes tokens matching the given specifiers', function (done) {
      const testApp = helper.getTestApp();
      const rest = helper.AblyRest({
        key: testApp.keys[4].keyStr /* this key has revocableTokens enabled */,
      });

      const clientId1 = `clientId1-${randomString()}`;
      const clientId2 = `clientId2-${randomString()}`;

      let clientId1TokenDetails;
      let clientId2TokenDetails;

      let clientId1Realtime;
      let clientId2Realtime;

      // These (result, callback) pairings are a dance to simulate a Promise (specificially the fact that the order of the { resolve, then } operations doesn’t matter); see the promise-based version of this test
      let clientId1RealtimeDisconnectedStateChange;
      let onClientId1RealtimeDisconnected;
      let clientId2RealtimeDisconnectedStateChange;
      let onClientId2RealtimeDisconnected;

      async.series(
        [
          function (cb) {
            // First, we fetch tokens for a couple of different clientIds...
            async.parallel(
              [
                function (cb) {
                  rest.auth.requestToken({ clientId: clientId1 }, function (err, tokenDetails) {
                    if (err) {
                      cb(err);
                      return;
                    }

                    clientId1TokenDetails = tokenDetails;
                    cb();
                  });
                },
                function (cb) {
                  rest.auth.requestToken({ clientId: clientId2 }, function (err, tokenDetails) {
                    if (err) {
                      cb(err);
                      return;
                    }

                    clientId2TokenDetails = tokenDetails;
                    cb();
                  });
                },
              ],
              cb
            );
          },
          function (cb) {
            // ...then, we set up Realtime instances that use these tokens and wait for them to become CONNECTED...
            async.parallel(
              [
                function (cb) {
                  clientId1Realtime = helper.AblyRealtime({ token: clientId1TokenDetails });
                  clientId1Realtime.connection.once('connected', function () {
                    cb();
                  });
                },
                function (cb) {
                  clientId2Realtime = helper.AblyRealtime({ token: clientId2TokenDetails });
                  clientId2Realtime.connection.once('connected', function () {
                    cb();
                  });
                },
              ],
              cb
            );
          },
          function (cb) {
            // ...then, we set up listeners that will record the state change when these Realtime instances become DISCONNECTED (we need to set up these listeners here, before performing the revocation request, else we might miss the DISCONNECTED state changes that the token revocation provokes, and end up only seeing the subsequent RSA4a2-induced FAILED state change, which due to https://github.com/ably/ably-js/issues/1409 does not expose the 40141 "token revoked" error code)...
            //
            // Note:
            //
            // We use Realtime instances for verifying the side effects of a token revocation, as opposed to, say, trying to perform a REST request, because the nature of the Ably service is that token verification may take a small delay to become active, and so there's no guarantee that a REST request peformed immediately after a revocation request would fail. See discussion at https://ably-real-time.slack.com/archives/C030C5YLY/p1690322740850269?thread_ts=1690315022.372729&cid=C030C5YLY.

            clientId1Realtime.connection.once('disconnected', function (stateChange) {
              clientId1RealtimeDisconnectedStateChange = stateChange;
              if (onClientId1RealtimeDisconnected) {
                onClientId1RealtimeDisconnected();
              }
            });

            clientId2Realtime.connection.once('disconnected', function (stateChange) {
              clientId2RealtimeDisconnectedStateChange = stateChange;
              if (onClientId2RealtimeDisconnected) {
                onClientId2RealtimeDisconnected();
              }
            });

            cb();
          },
          function (cb) {
            // ...then, we revoke all tokens for these clientIds...

            const specifiers = [
              { type: 'clientId', value: clientId1 },
              { type: 'clientId', value: clientId2 },
              { type: 'invalidType', value: 'abc' }, // we include an invalid specifier type to provoke a non-zero failureCount
            ];

            rest.auth.revokeTokens(specifiers, function (err, result) {
              if (err) {
                cb(err);
                return;
              }

              try {
                // ...and check the response from the revocation request...
                expect(result.successCount).to.equal(2);
                expect(result.failureCount).to.equal(1);
                expect(result.results).to.have.lengthOf(3);

                expect(result.results[0].target).to.equal(`clientId:${clientId1}`);
                expect(typeof result.results[0].issuedBefore).to.equal('number');
                expect(typeof result.results[0].appliesAt).to.equal('number');
                expect('error' in result.results[0]).to.be.false;

                expect(result.results[1].target).to.equal(`clientId:${clientId2}`);
                expect(typeof result.results[1].issuedBefore).to.equal('number');
                expect(typeof result.results[1].appliesAt).to.equal('number');
                expect('error' in result.results[1]).to.be.false;

                expect(result.results[2].target).to.equal('invalidType:abc');
                expect(result.results[2].error.statusCode).to.equal(400);
              } catch (err) {
                cb(err);
                return;
              }

              cb();
            });
          },

          // ...and then, we check that the Realtime instances transition to the DISCONNECTED state due to a "token revoked" (40141) error.
          function (cb) {
            async.parallel(
              [
                function (cb) {
                  onClientId1RealtimeDisconnected = function () {
                    try {
                      expect(clientId1RealtimeDisconnectedStateChange.reason.code).to.equal(40141 /* token revoked */);
                    } catch (err) {
                      cb(err);
                      return;
                    }
                    cb();
                  };
                  if (clientId1RealtimeDisconnectedStateChange) {
                    onClientId1RealtimeDisconnected();
                  }
                },
                function (cb) {
                  onClientId2RealtimeDisconnected = function () {
                    try {
                      expect(clientId2RealtimeDisconnectedStateChange.reason.code).to.equal(40141 /* token revoked */);
                    } catch (err) {
                      cb(err);
                      return;
                    }
                    cb();
                  };
                  if (clientId2RealtimeDisconnectedStateChange) {
                    onClientId2RealtimeDisconnected();
                  }
                },
              ],
              cb
            );
          },
          function (cb) {
            async.parallel(
              [
                function (cb) {
                  closeAndFinish(cb, clientId1Realtime);
                },
                function (cb) {
                  closeAndFinish(cb, clientId2Realtime);
                },
              ],
              cb
            );
          },
        ],
        done
      );
    });

    it('accepts optional issuedBefore and allowReauthMargin parameters', function (done) {
      const testApp = helper.getTestApp();
      const rest = helper.AblyRest({
        key: testApp.keys[4].keyStr /* this key has revocableTokens enabled */,
      });

      const clientId = `clientId-${randomString()}`;

      let serverTimeAtStartOfTest;

      async.series(
        [
          function (cb) {
            rest.time(function (err, time) {
              if (err) {
                cb(err);
                return;
              }
              serverTimeAtStartOfTest = time;
              cb();
            });
          },
          function (cb) {
            const issuedBefore = serverTimeAtStartOfTest - 20 * 60 * 1000; // i.e. ~20 minutes ago (arbitrarily chosen)

            rest.auth.revokeTokens(
              [{ type: 'clientId', value: clientId }],
              { issuedBefore, allowReauthMargin: true },
              function (err, result) {
                if (err) {
                  cb(err);
                  return;
                }

                try {
                  expect(result.results[0].issuedBefore).to.equal(issuedBefore);

                  // Verify the expected side effect of allowReauthMargin, which is to delay the revocation by 30 seconds
                  const serverTimeThirtySecondsAfterStartOfTest = serverTimeAtStartOfTest + 30 * 1000;
                  expect(result.results[0].appliesAt).to.be.greaterThan(serverTimeThirtySecondsAfterStartOfTest);
                } catch (err) {
                  cb(err);
                  return;
                }

                cb();
              }
            );
          },
        ],
        done
      );
    });

    it('throws an error when using token auth', function () {
      const rest = helper.AblyRest({
        useTokenAuth: true,
      });

      let verifiedError = false;
      try {
        rest.auth.revokeTokens([{ type: 'clientId', value: 'clientId1' }], function () {});
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.code).to.equal(40162);
        verifiedError = true;
      }

      expect(verifiedError).to.be.true;
    });

    if (typeof Promise !== 'undefined') {
      describe('using promises', function () {
        it('revokes tokens matching the given specifiers', async function () {
          const testApp = helper.getTestApp();
          const rest = helper.AblyRest({
            promises: true,
            key: testApp.keys[4].keyStr /* this key has revocableTokens enabled */,
          });

          const clientId1 = `clientId1-${randomString()}`;
          const clientId2 = `clientId2-${randomString()}`;

          // First, we fetch tokens for a couple of different clientIds...
          const [clientId1TokenDetails, clientId2TokenDetails] = await Promise.all([
            rest.auth.requestToken({ clientId: clientId1 }),
            rest.auth.requestToken({ clientId: clientId2 }),
          ]);

          // ...then, we set up Realtime instances that use these tokens and wait for them to become CONNECTED...
          const clientId1Realtime = helper.AblyRealtime({
            promises: true,
            token: clientId1TokenDetails,
          });
          const clientId2Realtime = helper.AblyRealtime({
            promises: true,
            token: clientId2TokenDetails,
          });

          await Promise.all([
            clientId1Realtime.connection.once('connected'),
            clientId2Realtime.connection.once('connected'),
          ]);

          // ...then, we set up listeners that will record the state change when these Realtime instances become DISCONNECTED (we need to set up these listeners here, before performing the revocation request, else we might miss the DISCONNECTED state changes that the token revocation provokes, and end up only seeing the subsequent RSA4a2-induced FAILED state change, which due to https://github.com/ably/ably-js/issues/1409 does not expose the 40141 "token revoked" error code)...
          //
          // Note:
          //
          // We use Realtime instances for verifying the side effects of a token revocation, as opposed to, say, trying to perform a REST request, because the nature of the Ably service is that token revocation may take a small delay to become active, and so there's no guarantee that a REST request peformed immediately after a revocation request would fail. See discussion at https://ably-real-time.slack.com/archives/C030C5YLY/p1690322740850269?thread_ts=1690315022.372729&cid=C030C5YLY.
          const clientId1RealtimeDisconnectedStateChangePromise = clientId1Realtime.connection.once('disconnected');
          const clientId2RealtimeDisconnectedStateChangePromise = clientId2Realtime.connection.once('disconnected');

          // ...then, we revoke all tokens for these clientIds...

          const specifiers = [
            { type: 'clientId', value: clientId1 },
            { type: 'clientId', value: clientId2 },
            { type: 'invalidType', value: 'abc' }, // we include an invalid specifier type to provoke a non-zero failureCount
          ];

          const result = await rest.auth.revokeTokens(specifiers);

          // ...and check the response from the revocation request...
          expect(result.successCount).to.equal(2);
          expect(result.failureCount).to.equal(1);
          expect(result.results).to.have.lengthOf(3);

          expect(result.results[0].target).to.equal(`clientId:${clientId1}`);
          expect(typeof result.results[0].issuedBefore).to.equal('number');
          expect(typeof result.results[0].appliesAt).to.equal('number');
          expect('error' in result.results[0]).to.be.false;

          expect(result.results[1].target).to.equal(`clientId:${clientId2}`);
          expect(typeof result.results[1].issuedBefore).to.equal('number');
          expect(typeof result.results[1].appliesAt).to.equal('number');
          expect('error' in result.results[1]).to.be.false;

          expect(result.results[2].target).to.equal('invalidType:abc');
          expect(result.results[2].error.statusCode).to.equal(400);

          // ...and then, we check that the Realtime instances transition to the DISCONNECTED state due to a "token revoked" (40141) error.
          const [clientId1RealtimeDisconnectedStateChange, clientId2RealtimeDisconnectedStateChange] =
            await Promise.all([
              clientId1RealtimeDisconnectedStateChangePromise,
              clientId2RealtimeDisconnectedStateChangePromise,
            ]);

          expect(clientId1RealtimeDisconnectedStateChange.reason.code).to.equal(40141 /* token revoked */);
          expect(clientId2RealtimeDisconnectedStateChange.reason.code).to.equal(40141 /* token revoked */);

          await Promise.all(
            [clientId1Realtime, clientId2Realtime].map((realtime) => {
              new Promise((resolve, reject) => {
                closeAndFinish((err) => {
                  err ? reject(err) : resolve();
                }, realtime);
              });
            })
          );
        });

        it('accepts optional issuedBefore and allowReauthMargin parameters', async function () {
          const testApp = helper.getTestApp();
          const rest = helper.AblyRest({
            promises: true,
            key: testApp.keys[4].keyStr /* this key has revocableTokens enabled */,
          });

          const clientId = `clientId-${randomString()}`;

          const serverTimeAtStartOfTest = await rest.time();
          const issuedBefore = serverTimeAtStartOfTest - 20 * 60 * 1000; // i.e. ~20 minutes ago (arbitrarily chosen)

          const result = await rest.auth.revokeTokens([{ type: 'clientId', value: clientId }], {
            issuedBefore,
            allowReauthMargin: true,
          });

          expect(result.results[0].issuedBefore).to.equal(issuedBefore);

          // Verify the expected side effect of allowReauthMargin, which is to delay the revocation by 30 seconds
          const serverTimeThirtySecondsAfterStartOfTest = serverTimeAtStartOfTest + 30 * 1000;
          expect(result.results[0].appliesAt).to.be.greaterThan(serverTimeThirtySecondsAfterStartOfTest);
        });
      });
    }
  });
});
