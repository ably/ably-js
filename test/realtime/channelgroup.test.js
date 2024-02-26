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
      var realtime1 = helper.AblyRealtime(); // for publishing from tests
      // for the consumers
      var realtime2 = helper.AblyRealtime();
      var realtime3 = helper.AblyRealtime();
      realtime1.options.clientId = 'testclient';
      realtime2.options.clientId = 'consumer1';
      realtime3.options.clientId = 'consumer2';

      // connect
      Promise.all([
        new Promise(resolve => realtime1.connection.on('connected', resolve)),
        new Promise(resolve => realtime2.connection.on('connected', resolve)),
        new Promise(resolve => realtime3.connection.on('connected', resolve)),
      ]).then(async () => {

        // create 2 consumers in one group
        const consumers = [
          await realtime2.channelGroups.get('partition:.*', { consumerGroup: { name: 'testgroup' } }),
          await realtime3.channelGroups.get('partition:.*', { consumerGroup: { name: 'testgroup' } }),
        ];

        // create 5 channels
        const channels = [];
        const channelNames = Array.from({ length: 5 }, (_, i) => 'partition:' + i);
        for (const name of channelNames) {
          const channel = realtime1.channels.get(name);
          await channel.attach();
          channels.push(channel);
        }

        function assertResult(results) {
          // expect each consumer to have received at least 1 message
          for (const result of results) {
            expect(result.length).to.be.greaterThan(0);
          }
          // sort first on channel, then on message name
          const allResults = results.flat().sort((a, b) => {
            if (a.channel < b.channel) return -1;
            if (a.channel > b.channel) return 1;
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
          });
          // expect to have received 2 messages from each channel across all consumers
          for (let i = 0; i < channels.length; i += 2) {
            const baseIndex = i / 2;
            const data = `test data ${baseIndex}`;
            const channel = `partition:${baseIndex}`;

            const first = allResults[i];
            const second = allResults[i + 1];
        
            expect(first.channel).to.equal(channel);
            expect(second.channel).to.equal(channel);
            expect(first.name).to.equal('event0');
            expect(second.name).to.equal('event1');
            expect(first.data).to.equal(data);
            expect(second.data).to.equal(data);
          }
        }

        // subscribe each consumer and collect results
        const results = Array.from({ length: consumers.length }, () => []);
        for (let i = 0; i < consumers.length; i++) {
          consumers[i].subscribe((channel, msg) => {
            results[i].push({ channel, name: msg.name, data: msg.data });
            if (results.flat().length === 2 * channels.length) {
              assertResult(results);
              closeAndFinish(done, [realtime1, realtime2, realtime3]);
            }
          });
        }

        var testMsg = { active: channelNames };
        var activeChannel = realtime1.channels.get('active');

        try {
          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', testMsg);

          // wait for all consumers to appear in the group
          await new Promise(async (resolve, reject) => {
            const ch = realtime1.channels.get('testgroup');
            const interval = setInterval(async () => {
              try {
                const result = await ch.presence.get({ waitForSync: true });
                if (result.length === consumers.length) {
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

          // send 2 messages to each channel
          for (let i = 0; i < channels.length; i++) {
            channels[i].publish('event0', `test data ${i}`);
            channels[i].publish('event1', `test data ${i}`);
          }
        } catch (err) {
          closeAndFinish(done, [realtime1, realtime2, realtime3], err);
          return;
        }

        monitorConnection(done, realtime1);
        monitorConnection(done, realtime2);
        monitorConnection(done, realtime3);
      }).catch(err => {
        closeAndFinish(done, [realtime1, realtime2, realtime3], err);
      });
    });
  })
});
