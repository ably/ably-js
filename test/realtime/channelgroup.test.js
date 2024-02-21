'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
  var monitorConnection = helper.monitorConnection;

  describe('realtime/channelgroup', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('subscribes to active', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = await realtime.channelGroups.get('.*');

          var testMsg = { active: ['channel1', 'channel2', 'channel3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('channel1');
          var dataChannel2 = realtime.channels.get('channel2');
          try {
            await activeChannel.attach();
            var events = 1;

            /* subscribe to channel group */
            channelGroup.subscribe((channel, msg) => {
              try {
                expect(msg.data).to.equal('test data ' + events, 'Unexpected msg text received');
                expect(channel).to.equal('channel' + events, 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              if (events == 1) {
                dataChannel2.publish('event0', 'test data 2');
                events++;
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            dataChannel1.publish('event0', 'test data 1');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('ignores channels not matched on filter', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = await realtime.channelGroups.get('include:.*');

          var testMsg = { active: ['include:channel1', 'stream3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('include:channel1');
          var streamChannel3 = realtime.channels.get('stream3');

          try {
            await activeChannel.attach();
            /* subscribe to channel group */
            channelGroup.subscribe((channel, msg) => {
              try {
                expect(msg.data).to.equal('test data 1', 'Unexpected msg text received');
                expect(channel).to.equal('include:channel1', 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            streamChannel3.publish('event0', 'should not be subscribed to this message');
            dataChannel1.publish('event0', 'test data 1');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('reacts to changing active channels', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = await realtime.channelGroups.get('group:.*');

          var testMsg = { active: ['group:channel1', 'group:channel2', 'group:channel3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('group:channel1');
          var dataChannel2 = realtime.channels.get('group:channel2');
          var dataChannel4 = realtime.channels.get('group:channel4');
          var dataChannel5 = realtime.channels.get('group:channel5');

          try {
            await activeChannel.attach();
            var events = 1;

            /* subscribe to channel group */
            channelGroup.subscribe(async (channel, msg) => {
              try {
                expect(msg.data).to.equal('test data ' + events, 'Unexpected msg text received');
                expect(channel).to.equal('group:channel' + events, 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              if (events == 1) {
                activeChannel.publish('event0', { active: ['group:channel4', 'group:channel5'] });
                dataChannel4.publish('event0', 'test data 4');
                events = 4;
                return;
              }

              if (events == 4) {
                await dataChannel2.publish('event 0', 'should be ignored test dat');
                await dataChannel5.publish('event0', 'test data 5');
                events++;
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            dataChannel1.publish('event0', 'test data 1');
          } catch (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('partitions over consumer group', function (done) {
      try {
        /* set up realtime */
        var realtime1 = helper.AblyRealtime();
        var realtime2 = helper.AblyRealtime();
        realtime2.options.clientId = 'xz';
        realtime1.options.clientId = '93';

        /* connect and attach */
        realtime1.connection.on('connected', async function () {
          const channelGroup1 = await realtime1.channelGroups.get('part.*', { consumerGroup: { name: 'testgroup' } });
          const channelGroup2 = await realtime2.channelGroups.get('part.*', { consumerGroup: { name: 'testgroup' } });
          const part1 = realtime2.channels.get('part1');
          const part2 = realtime2.channels.get('part:2');

          channelGroup2.subscribe((channel, msg) => {
            try {
              expect(channel).to.equal('part:2', 'Unexpected channel name in group participant realtime1');
              expect(msg.data).to.equal(
                'partition 2 test data',
                'Unexpected message data in group participant realtime1'
              );
            } catch (err) {
              closeAndFinish(done, [realtime1, realtime2], err);
              return;
            }

            // Publish a final message to partition2, to end the test
            part1.publish('done', 'partition 1 test data');
          });

          channelGroup1.subscribe((channel, msg) => {
            try {
              expect(channel).to.equal('part1', 'Unexpected channel name in group participant realtime2');
              expect(msg.data).to.equal(
                'partition 1 test data',
                'Unexpected message data in group participant realtime2'
              );
            } catch (err) {
              closeAndFinish(done, [realtime1, realtime2], err);
              return;
            }

            if (msg.name === 'done') {
              closeAndFinish(done, [realtime1, realtime2]);
            }
          });

          var testMsg = { active: ['part1', 'part:2'] };
          var activeChannel = await realtime1.channels.get('active');

          try {
            await activeChannel.attach();
            /* publish active channels */
            activeChannel.publish('event0', testMsg);

            // Wait for both consumers to appear in the group
            await new Promise(async (resolve, reject) => {
              const ch = await realtime1.channels.get('testgroup');
              const interval = setInterval(async () => {
                try {
                  const result = await ch.presence.get({ waitForSync: true });
                  if (result.length == 2) {
                    resolve();
                    ch.presence.unsubscribe();
                    clearInterval(interval);
                  }
                } catch (err) {
                  reject(err);
                  ch.presence.unsubscribe();
                  clearInterval(interval);
                }
              }, 100);
            });

            // Publish a message to each of the partitions
            part1.publish('event0', 'partition 1 test data');
            part2.publish('event0', 'partition 2 test data');
          } catch (err) {
            closeAndFinish(done, [realtime1, realtime2], err);
            return;
          }
        });
        monitorConnection(done, realtime1);
      } catch (err) {
        closeAndFinish(done, [realtime1, realtime2], err);
      }
    });
  });
});
