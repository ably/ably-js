'use strict';

// NOTE: All of the Promise-related tests in this file are intentionally a copy of the callback versions. This will allow us to simply remove the callback versions when merging this functionality into the integration/v2 branch (https://github.com/ably/ably-js/issues/1411).

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;

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
});
