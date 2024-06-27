'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, Helper, async, chai) {
  var expect = chai.expect;
  var createPM = Ably.protocolMessageFromDeserialized;

  describe('realtime/sync', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      const helper = Helper.forHook(this);
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    function extractClientIds(presenceSet) {
      return presenceSet
        .map(function (presmsg) {
          return presmsg.clientId;
        })
        .sort();
    }

    function extractMember(presenceSet, clientId) {
      return presenceSet.find(function (member) {
        return member.clientId === clientId;
      });
    }

    /*
     * Sync with an existing presence set - should discard any member who wasn't
     * included in the sync.
     * Note: doesn't use a real connection as everything's being done with
     * simulated protocol messages. Start with a fake-attached channel with no
     * sync in progress, then do one sync, then a second with a slightly
     * different presence set
     */
    it('sync_existing_set', async function () {
      var helper = this.test.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        channelName = 'syncexistingset',
        channel = realtime.channels.get(channelName);

      await channel.processMessage(
        createPM({
          action: 11,
          channel: channelName,
          flags: 1,
        }),
      );

      await new Promise(function (resolve, reject) {
        var done = function (err) {
          err ? reject(err) : resolve();
        };

        async.series(
          [
            function (cb) {
              channel
                .processMessage({
                  action: 16,
                  channel: channelName,
                  presence: [
                    {
                      action: 'present',
                      clientId: 'one',
                      connectionId: 'one_connid',
                      id: 'one_connid:0:0',
                      timestamp: 1e12,
                    },
                    {
                      action: 'present',
                      clientId: 'two',
                      connectionId: 'two_connid',
                      id: 'two_connid:0:0',
                      timestamp: 1e12,
                    },
                  ],
                })
                .then(function () {
                  cb();
                })
                .catch(function (err) {
                  cb(err);
                });
            },
            function (cb) {
              Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
                try {
                  expect(results.length).to.equal(2, 'Check correct number of results');
                  expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
                  expect(extractClientIds(results)).to.deep.equal(['one', 'two'], 'check correct members');
                } catch (err) {
                  cb(err);
                  return;
                }
                cb(err);
              });
            },
            function (cb) {
              /* Trigger another sync. Two has gone without so much as a `leave` message! */
              channel
                .processMessage({
                  action: 16,
                  channel: channelName,
                  presence: [
                    {
                      action: 'present',
                      clientId: 'one',
                      connectionId: 'one_connid',
                      id: 'one_connid:0:0',
                      timestamp: 1e12,
                    },
                    {
                      action: 'present',
                      clientId: 'three',
                      connectionId: 'three_connid',
                      id: 'three_connid:0:0',
                      timestamp: 1e12,
                    },
                  ],
                })
                .then(function () {
                  cb();
                })
                .catch(function (err) {
                  cb(err);
                });
            },
            function (cb) {
              Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
                try {
                  expect(results.length).to.equal(2, 'Check correct number of results');
                  expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
                  expect(extractClientIds(results)).to.deep.equal(
                    ['one', 'three'],
                    'check two has gone and three is there',
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
            helper.closeAndFinish(done, realtime, err);
          },
        );
      });
    });

    /*
     * Sync with an existing presence set and a presence member added in the
     * middle of the sync should should discard the former, but not the latter
     * */
    it('sync_member_arrives_in_middle', async function () {
      var helper = this.test.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        channelName = 'sync_member_arrives_in_middle',
        channel = realtime.channels.get(channelName);

      await channel.processMessage(
        createPM({
          action: 11,
          channel: channelName,
          flags: 1,
        }),
      );

      /* First sync */
      await channel.processMessage({
        action: 16,
        channel: channelName,
        presence: [
          {
            action: 'present',
            clientId: 'one',
            connectionId: 'one_connid',
            id: 'one_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      /* A second sync, this time in multiple parts, with a presence message in the middle */
      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:cursor',
        presence: [
          {
            action: 'present',
            clientId: 'two',
            connectionId: 'two_connid',
            id: 'two_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 14,
        channel: channelName,
        presence: [
          {
            action: 'enter',
            clientId: 'three',
            connectionId: 'three_connid',
            id: 'three_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:',
        presence: [
          {
            action: 'present',
            clientId: 'four',
            connectionId: 'four_connid',
            id: 'four_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await new Promise(function (resolve, reject) {
        var done = function (err) {
          err ? reject(err) : resolve();
        };

        Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
          if (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          try {
            expect(results.length).to.equal(3, 'Check correct number of results');
            expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
            expect(extractClientIds(results)).to.deep.equal(
              ['four', 'three', 'two'],
              'check expected presence members',
            );
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          helper.closeAndFinish(done, realtime);
        });
      });
    });

    /*
     * Presence message that was in the sync arrives again as a normal message, after it's come in the sync
     */
    it('sync_member_arrives_normally_after_came_in_sync', async function () {
      var helper = this.test.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        channelName = 'sync_member_arrives_normally_after_came_in_sync',
        channel = realtime.channels.get(channelName);

      await channel.processMessage(
        createPM({
          action: 11,
          channel: channelName,
          flags: 1,
        }),
      );

      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:cursor',
        presence: [
          {
            action: 'present',
            clientId: 'one',
            connectionId: 'one_connid',
            id: 'one_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 14,
        channel: channelName,
        presence: [
          {
            action: 'enter',
            clientId: 'one',
            connectionId: 'one_connid',
            id: 'one_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:',
        presence: [
          {
            action: 'present',
            clientId: 'two',
            connectionId: 'two_connid',
            id: 'two_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await new Promise(function (resolve, reject) {
        var done = function (err) {
          err ? reject(err) : resolve();
        };

        Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
          if (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          try {
            expect(results.length).to.equal(2, 'Check correct number of results');
            expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
            expect(extractClientIds(results)).to.deep.equal(['one', 'two'], 'check expected presence members');
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          helper.closeAndFinish(done, realtime);
        });
      });
    });

    /*
     * Presence message that will be in the sync arrives as a normal message, before it comes in the sync
     */
    it('sync_member_arrives_normally_before_comes_in_sync', async function () {
      var helper = this.test.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        channelName = 'sync_member_arrives_normally_before_comes_in_sync',
        channel = realtime.channels.get(channelName);

      await channel.processMessage(
        createPM({
          action: 11,
          channel: channelName,
          flags: 1,
        }),
      );

      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:cursor',
        presence: [
          {
            action: 'present',
            clientId: 'one',
            connectionId: 'one_connid',
            id: 'one_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 14,
        channel: channelName,
        presence: [
          {
            action: 'enter',
            clientId: 'two',
            connectionId: 'two_connid',
            id: 'two_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await channel.processMessage({
        action: 16,
        channel: channelName,
        channelSerial: 'serial:',
        presence: [
          {
            action: 'present',
            clientId: 'two',
            connectionId: 'two_connid',
            id: 'two_connid:0:0',
            timestamp: 1e12,
          },
        ],
      });

      await new Promise(function (resolve, reject) {
        var done = function (err) {
          err ? reject(err) : resolve();
        };

        Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
          if (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          try {
            expect(results.length).to.equal(2, 'Check correct number of results');
            expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
            expect(extractClientIds(results)).to.deep.equal(['one', 'two'], 'check expected presence members');
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          helper.closeAndFinish(done, realtime);
        });
      });
    });

    /*
     * Get several presence messages with various combinations of msgserial,
     * index, and synthesized leaves, check that the end result is correct
     */
    it('presence_ordering', async function () {
      var helper = this.test.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        channelName = 'sync_ordering',
        channel = realtime.channels.get(channelName);

      await channel.processMessage(
        createPM({
          action: 11,
          channel: channelName,
        }),
      );

      /* One enters */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        id: 'one_connid:1',
        connectionId: 'one_connid',
        timestamp: 1e12,
        presence: [
          {
            action: 'enter',
            clientId: 'one',
          },
        ],
      });

      /* An earlier leave from one (should be ignored) */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'one_connid',
        id: 'one_connid:0',
        timestamp: 1e12,
        presence: [
          {
            action: 'leave',
            clientId: 'one',
          },
        ],
      });

      /* One adds some data in a newer msgSerial */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'one_connid',
        id: 'one_connid:2',
        timestamp: 1e12,
        presence: [
          {
            action: 'update',
            clientId: 'one',
            data: 'onedata',
          },
        ],
      });

      /* Two enters */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'two_connid',
        id: 'two_connid:0',
        timestamp: 1e12,
        presence: [
          {
            action: 'enter',
            clientId: 'two',
          },
        ],
      });

      /* Two updates twice in the same message */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'two_connid',
        id: 'two_connid:0',
        timestamp: 1e12,
        presence: [
          {
            action: 'update',
            clientId: 'two',
            data: 'twowrongdata',
          },
          {
            action: 'update',
            clientId: 'two',
            data: 'twodata',
          },
        ],
      });

      /* Three enters */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'three_connid',
        id: 'three_connid:99',
        timestamp: 1e12,
        presence: [
          {
            action: 'enter',
            clientId: 'three',
          },
        ],
      });

      /* Synthesized leave for three (with earlier msgSerial, incompatible id,
       * and later timestamp) */
      await channel.processMessage({
        action: 14,
        channel: channelName,
        connectionId: 'synthesized',
        id: 'synthesized:0',
        timestamp: 1e12 + 1,
        presence: [
          {
            action: 'leave',
            clientId: 'three',
            connectionId: 'three_connid',
          },
        ],
      });

      await new Promise(function (resolve, reject) {
        var done = function (err) {
          err ? reject(err) : resolve();
        };
        Helper.whenPromiseSettles(channel.presence.get(), function (err, results) {
          if (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          try {
            expect(results.length).to.equal(2, 'Check correct number of results');
            expect(channel.presence.syncComplete, 'Check in sync').to.be.ok;
            expect(extractClientIds(results)).to.deep.equal(['one', 'two'], 'check expected presence members');
            expect(extractMember(results, 'one').data).to.equal('onedata', 'check correct data on one');
            expect(extractMember(results, 'two').data).to.equal('twodata', 'check correct data on two');
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
            return;
          }
          helper.closeAndFinish(done, realtime);
        });
      });
    });

    /*
     * Do a 110-member sync, so split into two sync messages. Inject a normal
     * presence enter between the syncs. Check everything was entered correctly
     */
    it('presence_sync_interruptus', function (done) {
      const helper = this.test.helper;
      var channelName = 'presence_sync_interruptus';
      var interrupterClientId = 'dark_horse';
      var enterer = helper.AblyRealtime();
      var syncer = helper.AblyRealtime();
      var entererChannel = enterer.channels.get(channelName);
      var syncerChannel = syncer.channels.get(channelName);

      function waitForBothConnect(cb) {
        async.parallel(
          [
            function (connectCb) {
              enterer.connection.on('connected', connectCb);
            },
            function (connectCb) {
              syncer.connection.on('connected', connectCb);
            },
          ],
          function () {
            cb();
          },
        );
      }

      async.series(
        [
          waitForBothConnect,
          function (cb) {
            Helper.whenPromiseSettles(entererChannel.attach(), cb);
          },
          function (cb) {
            async.times(
              110,
              function (i, presCb) {
                Helper.whenPromiseSettles(entererChannel.presence.enterClient(i.toString(), null), presCb);
              },
              cb,
            );
          },
          function (cb) {
            var originalProcessMessage = syncerChannel.processMessage;
            syncerChannel.processMessage = async function (message) {
              await originalProcessMessage.apply(this, arguments);
              /* Inject an additional presence message after the first sync */
              if (message.action === 16) {
                syncerChannel.processMessage = originalProcessMessage;
                await syncerChannel.processMessage({
                  action: 14,
                  id: 'messageid:0',
                  connectionId: 'connid',
                  timestamp: 2000000000000,
                  presence: [
                    {
                      clientId: interrupterClientId,
                      action: 'enter',
                    },
                  ],
                });
              }
            };
            Helper.whenPromiseSettles(syncerChannel.attach(), cb);
          },
          function (cb) {
            Helper.whenPromiseSettles(syncerChannel.presence.get(), function (err, presenceSet) {
              try {
                expect(presenceSet && presenceSet.length).to.equal(111, 'Check everyone’s in presence set');
              } catch (err) {
                cb(err);
                return;
              }
              cb(err);
            });
          },
        ],
        function (err) {
          helper.closeAndFinish(done, [enterer, syncer], err);
        },
      );
    });
  });
});
