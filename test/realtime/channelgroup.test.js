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
      const prefix = utils.cheapRandStr();
      const activeChannelName = `${prefix}:active`;
      // set up realtime
      let realtime = helper.AblyRealtime();
      realtime.options.clientId = 'testclient';

      // connect and attach
      realtime.connection.on('connected', async function () {
        try {
          const channelGroup = realtime.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
          const activeChannel = realtime.channels.get(activeChannelName);
          const dataChannel1 = realtime.channels.get(`${prefix}:channel1`);
          const dataChannel2 = realtime.channels.get(`${prefix}:channel2`);

          // subscribe to channel group and assert results
          let events = 1;
          await channelGroup.subscribe((channel, msg) => {
            try {
              expect(msg.data).to.equal(`test data ${events}`, 'Unexpected msg text received');
              expect(channel).to.equal(`${prefix}:channel${events}`, 'Unexpected channel name');
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

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', {
            active: [`${prefix}:channel1`, `${prefix}:channel2`, `${prefix}:channel3`],
          });
          // publish first message
          dataChannel1.publish('event0', 'test data 1');
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
      });
      monitorConnection(done, realtime);
    });

    it('unsubscribes a listener', function (done) {
      const prefix = utils.cheapRandStr();
      const activeChannelName = `${prefix}:active`;
      // set up realtime
      let realtime = helper.AblyRealtime();
      realtime.options.clientId = 'testclient';

      // connect and attach
      realtime.connection.on('connected', async function () {
        try {
          const channelGroup = realtime.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
          const activeChannel = realtime.channels.get(activeChannelName);
          const channel = realtime.channels.get(`${prefix}:channel1`);

          // subscribe to channel group and assert results
          let events = 0;
          let received = [null, null, null];
          let message1 = new Promise((resolve) => (received[0] = resolve));
          let message2 = new Promise((resolve) => (received[1] = resolve));
          let message3 = new Promise((resolve) => (received[2] = resolve));
          const listener1 = () => {
            expect(events).to.be.lessThan(3, 'Unexpected number of messages received');
          };
          const listener2 = () => {
            received[events]();
            events++;
            if (events < 3) {
              return;
            }
            closeAndFinish(done, realtime);
          };
          await channelGroup.subscribe(listener1);
          await channelGroup.subscribe(listener2);

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', {
            active: [`${prefix}:channel1`],
          });
          // publish first message
          channel.publish('event0', 'test data');
          channel.publish('event1', 'test data');
          await message1;
          await message2;

          // unsubscribe the first listener and publish the last message to end the test
          channelGroup.unsubscribe(listener1);
          channel.publish('event2', 'test data');
          await message3;
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
      });
      monitorConnection(done, realtime);
    });

    it('leaves the channel group', function (done) {
      const prefix = utils.cheapRandStr();
      const activeChannelName = `${prefix}:active`;
      // set up realtime
      let realtime1 = helper.AblyRealtime();
      let realtime2 = helper.AblyRealtime();
      realtime1.options.clientId = 'client1';
      realtime2.options.clientId = 'client2';

      // connect and attach
      Promise.all([
        new Promise((resolve) => realtime1.connection.on('connected', resolve)),
        new Promise((resolve) => realtime2.connection.on('connected', resolve)),
      ])
        .then(async () => {
          try {
            // TODO(mschristensen): use a single client and subscribe to the channel directly when the channel group no longer shares the channels object
            const channelGroup1 = realtime1.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
            const channelGroup2 = realtime2.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
            const activeChannel = realtime1.channels.get(activeChannelName);
            const channel = realtime1.channels.get(`${prefix}:channel1`);

            // subscribe to channel group and assert results
            let events = 0;
            await channelGroup1.subscribe(() => {
              expect(events).to.be.lessThan(3, 'Unexpected number of messages received');
            });
            await channelGroup2.subscribe(() => {
              events++;
              if (events < 3) {
                return;
              }
              closeAndFinish(done, [realtime1, realtime2]);
            });

            // publish active channels
            await activeChannel.attach();
            activeChannel.publish('event0', {
              active: [`${prefix}:channel1`],
            });
            // publish first message
            channel.publish('event0', 'test data');
            channel.publish('event1', 'test data');

            // leave the first channel group and publish the last message to end the test
            channelGroup1.leave();
            channel.publish('event2', 'test data');
          } catch (err) {
            closeAndFinish(done, [realtime1, realtime2], err);
            return;
          }
          monitorConnection(done, realtime1);
          monitorConnection(done, realtime2);
        })
        .catch((err) => {
          closeAndFinish(done, [realtime1, realtime2], err);
        });
    });

    it('ignores channels not matched on filter', function (done) {
      const prefix = utils.cheapRandStr();
      const activeChannelName = `${prefix}:active`;
      // set up realtime
      let realtime = helper.AblyRealtime();
      realtime.options.clientId = 'testclient';

      // connect and attach
      realtime.connection.on('connected', async function () {
        try {
          const channelGroup = realtime.channelGroups.get(`${prefix}:include:.*`, { activeChannel: activeChannelName });

          const activeChannel = realtime.channels.get(activeChannelName);
          const dataChannel1 = realtime.channels.get(`${prefix}:include:channel1`);
          const streamChannel3 = realtime.channels.get(`${prefix}:stream3`);

          // subscribe to channel group and assert results
          await channelGroup.subscribe((channel, msg) => {
            try {
              expect(msg.data).to.equal('test data 1', 'Unexpected msg text received');
              expect(channel).to.equal(`${prefix}:include:channel1`, 'Unexpected channel name');
            } catch (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            closeAndFinish(done, realtime);
          });

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', { active: [`${prefix}:include:channel1`, `${prefix}:stream3`] });

          // publish messages
          streamChannel3.publish('event0', 'should not be subscribed to this message');
          dataChannel1.publish('event0', 'test data 1');
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
      });
      monitorConnection(done, realtime);
    });

    it('reacts to changing active channels', function (done) {
      const prefix = utils.cheapRandStr();
      const activeChannelName = `${prefix}:active`;
      // set up realtime
      let realtime = helper.AblyRealtime();
      realtime.options.clientId = 'testclient';

      /* connect and attach */
      realtime.connection.on('connected', async function () {
        try {
          const channelGroup = realtime.channelGroups.get(`${prefix}:group:.*`, { activeChannel: activeChannelName });

          const activeChannel = realtime.channels.get(activeChannelName);
          const dataChannel1 = realtime.channels.get(`${prefix}:group:channel1`);
          const dataChannel2 = realtime.channels.get(`${prefix}:group:channel2`);
          const dataChannel4 = realtime.channels.get(`${prefix}:group:channel4`);
          const dataChannel5 = realtime.channels.get(`${prefix}:group:channel5`);

          // subscribe to channel group and assert results
          let events = 1;
          await channelGroup.subscribe(async (channel, msg) => {
            try {
              expect(msg.data).to.equal(`test data ${events}`, 'Unexpected msg text received');
              expect(channel).to.equal(`${prefix}:group:channel${events}`, 'Unexpected channel name');
            } catch (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            if (events == 1) {
              activeChannel.publish('event0', { active: [`${prefix}:group:channel4`, `${prefix}:group:channel5`] });
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

          // publish active channels
          await activeChannel.attach();
          activeChannel.publish('event0', {
            active: [`${prefix}:group:channel1`, `${prefix}:group:channel2`, `${prefix}:group:channel3`],
          });
          // publish first message
          dataChannel1.publish('event0', 'test data 1');
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
      });
      monitorConnection(done, realtime);
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

          // wait for first consumer to appear in the group
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

          // wait for second consumer to appear in the group
          await waitForConsumers(realtime1.channels.get('testgroup'), 2);

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
