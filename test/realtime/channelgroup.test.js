'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  let expect = chai.expect;
  let closeAndFinish = helper.closeAndFinish;
  let monitorConnection = helper.monitorConnection;
  let utils = helper.Utils;

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
        let realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = realtime.channelGroups.get('.*', { activeChannel: 'active' });

          let testMsg = { active: ['channel1', 'channel2', 'channel3'] };
          let activeChannel = realtime.channels.get('active');
          let dataChannel1 = realtime.channels.get('channel1');
          let dataChannel2 = realtime.channels.get('channel2');
          try {
            await activeChannel.attach();
            let events = 1;

            /* subscribe to channel group */
            await channelGroup.subscribe((channel, msg) => {
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
        let realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = realtime.channelGroups.get('include:.*', { activeChannel: 'active' });

          let testMsg = { active: ['include:channel1', 'stream3'] };
          let activeChannel = realtime.channels.get('active');
          let dataChannel1 = realtime.channels.get('include:channel1');
          let streamChannel3 = realtime.channels.get('stream3');

          try {
            await activeChannel.attach();
            /* subscribe to channel group */
            await channelGroup.subscribe((channel, msg) => {
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
        let realtime = helper.AblyRealtime();
        realtime.options.clientId = 'testclient';

        /* connect and attach */
        realtime.connection.on('connected', async function () {
          const channelGroup = realtime.channelGroups.get('group:.*', { activeChannel: 'active' });

          let testMsg = { active: ['group:channel1', 'group:channel2', 'group:channel3'] };
          let activeChannel = realtime.channels.get('active');
          let dataChannel1 = realtime.channels.get('group:channel1');
          let dataChannel2 = realtime.channels.get('group:channel2');
          let dataChannel4 = realtime.channels.get('group:channel4');
          let dataChannel5 = realtime.channels.get('group:channel5');

          try {
            await activeChannel.attach();
            let events = 1;

            /* subscribe to channel group */
            await channelGroup.subscribe(async (channel, msg) => {
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
                dataChannel2.publish('event 0', 'should be ignored test dat');
                dataChannel5.publish('event0', 'test data 5');
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

    // wait for n consumers to appear in the given channel's presence set
    function waitForConsumers(channel, n) {
      return new Promise(async (resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const result = await channel.presence.get({ waitForSync: true });
            if (result.length === n) {
              resolve();
              channel.presence.unsubscribe();
              clearInterval(interval);
            }
          } catch (err) {
            reject(err);
            channel.presence.unsubscribe();
            clearInterval(interval);
          }
        }, 100);
      });
    }

    function assertResults(results, numChannels, channelPrefix, allowDuplicates) {
      // expect each consumer to have received at least 1 message
      for (let i = 0; i < results.length; i++) {
        expect(results[i].length).to.be.greaterThan(0, `consumer ${i} received no messages`);
      }
      // sort first on channel, then on message name
      let allResults = results.flat().sort((a, b) => {
        if (a.channel < b.channel) return -1;
        if (a.channel > b.channel) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      console.log(allResults);
      // is duplicates allowed, make unique
      if (allowDuplicates) {
        allResults = utils.arrUniqueBy(allResults, (elem) => `${elem.channel}:${elem.name}`);
      }
      // expect to have received 2 messages from each channel across all consumers
      for (let i = 0; i < numChannels; i += 2) {
        const baseIndex = i / 2;
        const data = `test data ${baseIndex}`;
        const channel = `${channelPrefix}:${baseIndex}`;

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

    it('partitions over consumer group', function (done) {
      const prefix = utils.cheapRandStr();
      let realtime1 = helper.AblyRealtime(); // for publishing from tests
      // for the consumers
      let realtime2 = helper.AblyRealtime();
      let realtime3 = helper.AblyRealtime();
      realtime1.options.clientId = 'testclient';
      realtime2.options.clientId = 'consumer1';
      realtime3.options.clientId = 'consumer2';

      // connect
      Promise.all([
        new Promise((resolve) => realtime1.connection.on('connected', resolve)),
        new Promise((resolve) => realtime2.connection.on('connected', resolve)),
        new Promise((resolve) => realtime3.connection.on('connected', resolve)),
      ])
        .then(async () => {
          // create 2 consumers in one group
          const consumers = [
            realtime2.channelGroups.get(`${prefix}:.*`, {
              activeChannel: 'active',
              consumerGroup: { name: 'testgroup' },
            }),
            realtime3.channelGroups.get(`${prefix}:.*`, {
              activeChannel: 'active',
              consumerGroup: { name: 'testgroup' },
            }),
          ];

          // create 5 channels
          const channels = [];
          const channelNames = Array.from({ length: 5 }, (_, i) => `${prefix}:` + i);
          for (const name of channelNames) {
            const channel = realtime1.channels.get(name);
            await channel.attach();
            channels.push(channel);
          }

          // subscribe each consumer and collect results
          const results = Array.from({ length: consumers.length }, () => []);
          for (let i = 0; i < consumers.length; i++) {
            await consumers[i].subscribe((channel, msg) => {
              results[i].push({ channel, name: msg.name, data: msg.data });
              if (results.flat().length === 2 * channels.length) {
                assertResults(results, channels.length, prefix, false);
                closeAndFinish(done, [realtime1, realtime2, realtime3]);
              }
            });
          }

          let testMsg = { active: channelNames };
          let activeChannel = realtime1.channels.get('active');

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', testMsg);

          // wait for all consumers to appear in the group
          await waitForConsumers(realtime1.channels.get('testgroup'), consumers.length);

          // send 2 messages to each channel
          for (let i = 0; i < channels.length; i++) {
            channels[i].publish('event0', `test data ${i}`);
            channels[i].publish('event1', `test data ${i}`);
          }

          monitorConnection(done, realtime1);
          monitorConnection(done, realtime2);
          monitorConnection(done, realtime3);
        })
        .catch((err) => {
          closeAndFinish(done, [realtime1, realtime2, realtime3], err);
        });
    });

    it('dynamically rebalances the consumer group', function (done) {
      const prefix = utils.cheapRandStr();
      let realtime1 = helper.AblyRealtime(); // for publishing from tests
      // for the consumers
      let realtime2 = helper.AblyRealtime();
      let realtime3 = helper.AblyRealtime();
      realtime1.options.clientId = 'testclient';
      realtime2.options.clientId = 'consumer1';
      realtime3.options.clientId = 'consumer2';

      // connect
      Promise.all([
        new Promise((resolve) => realtime1.connection.on('connected', resolve)),
        new Promise((resolve) => realtime2.connection.on('connected', resolve)),
        new Promise((resolve) => realtime3.connection.on('connected', resolve)),
      ])
        .then(async () => {
          // create 2 consumers in one group
          const consumers = [
            realtime2.channelGroups.get(`${prefix}:.*`, {
              activeChannel: 'active',
              consumerGroup: { name: 'testgroup' },
            }),
            realtime3.channelGroups.get(`${prefix}:.*`, {
              activeChannel: 'active',
              consumerGroup: { name: 'testgroup' },
            }),
          ];

          // create 5 channels
          const channels = [];
          const channelNames = Array.from({ length: 5 }, (_, i) => `${prefix}:` + i);
          for (const name of channelNames) {
            const channel = realtime1.channels.get(name);
            await channel.attach();
            channels.push(channel);
          }

          // subscribe the first consumer and collect results
          const results = Array.from({ length: consumers.length }, () => []);
          await consumers[0].subscribe((channel, msg) => {
            console.log(0, channel, msg.data);
            results[0].push({ channel, name: msg.name, data: msg.data });
            if (results.flat().length === 2 * channels.length) {
              // we allow duplicates as exactly-once delivery is not guaranteed in the client-side simulation
              // of channel/consumer groups due to the use of rewind on consumer group resizing
              assertResults(results, channels.length, prefix, true);
              closeAndFinish(done, [realtime1, realtime2, realtime3]);
            }
          });

          let testMsg = { active: channelNames };
          let activeChannel = realtime1.channels.get('active');

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', testMsg);

          // wait for all consumers to appear in the group
          await waitForConsumers(realtime1.channels.get('testgroup'), 1);

          // send 2 messages to the first half of the channels
          for (let i = 0; i < Math.floor(channels.length / 2); i++) {
            console.log(i, 'publish');
            channels[i].publish('event0', `test data ${i}`);
            channels[i].publish('event1', `test data ${i}`);
          }

          // subscribe the second consumer and collect results
          await consumers[1].subscribe((channel, msg) => {
            console.log(1, channel, msg.data);
            results[1].push({ channel, name: msg.name, data: msg.data });
            if (results.flat().length === 2 * channels.length) {
              // we allow duplicates as exactly-once delivery is not guaranteed in the client-side simulation
              // of channel/consumer groups due to the use of rewind on consumer group resizing
              assertResults(results, channels.length, prefix, true);
              closeAndFinish(done, [realtime1, realtime2, realtime3]);
            }
          });

          // send 2 messages to the second half of the channels
          for (let i = Math.floor(channels.length / 2); i < channels.length; i++) {
            console.log(i, 'publish');
            channels[i].publish('event0', `test data ${i}`);
            channels[i].publish('event1', `test data ${i}`);
          }

          monitorConnection(done, realtime1);
          monitorConnection(done, realtime2);
          monitorConnection(done, realtime3);
        })
        .catch((err) => {
          closeAndFinish(done, [realtime1, realtime2, realtime3], err);
        });
    });
  });
});
