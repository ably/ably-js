'use strict';

// class Deferred {
//   promise;
//   resolve;
//   reject;
//   constructor() {
//     this.promise = new Promise((resolve, reject) => {
//       this.resolve = resolve;
//       this.reject = reject;
//     });
//   }
// }

// class DeferredMany {
//   constructor(count) {
//     this.items = Array.from({ length: count }, () => new Deferred());
//   }
// }

// define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
//   let expect = chai.expect;
//   let closeAndFinishAsync = helper.closeAndFinishAsync;
//   let monitorConnectionAsync = helper.monitorConnectionAsync;
//   let utils = helper.Utils;

//   describe('realtime/channelgroup', function () {
//     this.timeout(60 * 1000);
//     before(function (done) {
//       helper.setupApp(function (err) {
//         if (err) {
//           done(err);
//         }
//         done();
//       });
//     });

//     it('subscribes to active', async function () {
//       const realtime = helper.AblyRealtime({ clientId: 'testclient' });
//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;

//         // connect and attach
//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         const channelGroup = realtime.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
//         const activeChannel = realtime.channels.get(activeChannelName);
//         const dataChannel1 = realtime.channels.get(`${prefix}:channel1`);
//         const dataChannel2 = realtime.channels.get(`${prefix}:channel2`);

//         // subscribe to channel group and assert results
//         let events = 0;
//         const result = new Deferred();
//         await channelGroup.subscribe(async (channel, msg) => {
//           events++;
//           try {
//             expect(msg.data).to.equal(`test data ${events}`, 'Unexpected msg text received');
//             expect(channel).to.equal(`${prefix}:channel${events}`, 'Unexpected channel name');
//           } catch (err) {
//             result.reject(err);
//             return;
//           }

//           if (events === 1) {
//             await dataChannel2.publish('event0', 'test data 2');
//             return;
//           }
//           result.resolve();
//         });

//         // publish active channels
//         await activeChannel.attach();
//         await activeChannel.publish('event0', {
//           active: [`${prefix}:channel1`, `${prefix}:channel2`],
//         });

//         // publish first message
//         await dataChannel1.publish('event0', 'test data 1');

//         return result.promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });

//     it('unsubscribes a listener', async function () {
//       const realtime = helper.AblyRealtime({ clientId: 'testclient' });
//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;

//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         const channelGroup = realtime.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
//         const activeChannel = realtime.channels.get(activeChannelName);
//         const channel = realtime.channels.get(`${prefix}:channel1`);

//         // subscribe to channel group and assert results
//         let events = 0;
//         let messages = new DeferredMany(3);
//         let result = new Deferred();
//         const listener1 = () => {
//           expect(events).to.be.lessThan(3, 'Unexpected number of messages received');
//         };
//         const listener2 = () => {
//           messages.items[events].resolve();
//           events++;
//           if (events < 3) {
//             return;
//           }
//           result.resolve();
//         };
//         await channelGroup.subscribe(listener1);
//         await channelGroup.subscribe(listener2);

//         // publish active channels
//         await activeChannel.attach();
//         await activeChannel.publish('event0', {
//           active: [`${prefix}:channel1`],
//         });
//         // publish first message
//         await channel.publish('event0', 'test data');
//         await channel.publish('event1', 'test data');
//         await messages.items[0].promise;
//         await messages.items[1].promise;

//         // unsubscribe the first listener and publish the last message to end the test
//         channelGroup.unsubscribe(listener1);
//         await channel.publish('event2', 'test data');
//         await messages.items[2].promise;

//         return result.promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });

//     it('leaves the channel group', async function () {
//       const realtime = helper.AblyRealtime({ clientId: 'testclient' });
//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;

//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         const channelGroup = realtime.channelGroups.get(`${prefix}.*`, { activeChannel: activeChannelName });
//         const activeChannel = realtime.channels.get(activeChannelName);
//         const channel = realtime.channels.get(`${prefix}:channel1`);

//         // subscribe to channel group and assert results
//         let events = 0;
//         await channelGroup.subscribe(() => {
//           expect(events).to.be.lessThan(3, 'Unexpected number of messages received');
//         });
//         let result = new Deferred();
//         await channel.subscribe(() => {
//           events++;
//           if (events < 3) {
//             return;
//           }
//           result.resolve();
//         });

//         // publish active channels
//         await activeChannel.attach();
//         await activeChannel.publish('event0', {
//           active: [`${prefix}:channel1`],
//         });

//         // publish first message
//         await channel.publish('event0', 'test data');
//         await channel.publish('event1', 'test data');

//         // leave the first channel group and publish the last message to end the test
//         await channelGroup.leave();
//         await channel.publish('event2', 'test data');

//         return result.promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });

//     it('ignores channels not matched on filter', async function () {
//       let realtime = helper.AblyRealtime({ clientId: 'testclient' });
//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;

//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         const channelGroup = realtime.channelGroups.get(`${prefix}:include:.*`, { activeChannel: activeChannelName });

//         const activeChannel = realtime.channels.get(activeChannelName);
//         const dataChannel1 = realtime.channels.get(`${prefix}:include:channel1`);
//         const streamChannel3 = realtime.channels.get(`${prefix}:stream3`);

//         // subscribe to channel group and assert results
//         let result = new Deferred();
//         await channelGroup.subscribe((channel, msg) => {
//           try {
//             expect(msg.data).to.equal('test data 1', 'Unexpected msg text received');
//             expect(channel).to.equal(`${prefix}:include:channel1`, 'Unexpected channel name');
//           } catch (err) {
//             result.reject(err);
//             return;
//           }
//           result.resolve();
//         });

//         // publish active channels
//         await activeChannel.attach();
//         await activeChannel.publish('event0', { active: [`${prefix}:include:channel1`, `${prefix}:stream3`] });

//         // publish messages
//         await streamChannel3.publish('event0', 'should not be subscribed to this message');
//         await dataChannel1.publish('event0', 'test data 1');

//         return result.promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });

//     it('reacts to changing active channels', async function () {
//       let realtime = helper.AblyRealtime({ clientId: 'testclient' });
//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;

//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         const channelGroup = realtime.channelGroups.get(`${prefix}:group:.*`, { activeChannel: activeChannelName });

//         const activeChannel = realtime.channels.get(activeChannelName);
//         const dataChannel1 = realtime.channels.get(`${prefix}:group:channel1`);
//         const dataChannel2 = realtime.channels.get(`${prefix}:group:channel2`);
//         const dataChannel4 = realtime.channels.get(`${prefix}:group:channel4`);
//         const dataChannel5 = realtime.channels.get(`${prefix}:group:channel5`);

//         // subscribe to channel group and assert results
//         let events = 1;
//         let result = new Deferred();
//         await channelGroup.subscribe(async (channel, msg) => {
//           try {
//             expect(msg.data).to.equal(`test data ${events}`, 'Unexpected msg text received');
//             expect(channel).to.equal(`${prefix}:group:channel${events}`, 'Unexpected channel name');
//           } catch (err) {
//             result.reject(err);
//             return;
//           }

//           if (events === 1) {
//             events = 4;
//             await activeChannel.publish('event0', { active: [`${prefix}:group:channel4`, `${prefix}:group:channel5`] });
//             await dataChannel4.publish('event0', 'test data 4');
//             return;
//           }

//           if (events === 4) {
//             events++;
//             await dataChannel2.publish('event 0', 'should be ignored test data');
//             await dataChannel5.publish('event0', 'test data 5');
//             return;
//           }

//           result.resolve();
//         });

//         // publish active channels
//         await activeChannel.attach();
//         await activeChannel.publish('event0', {
//           active: [`${prefix}:group:channel1`, `${prefix}:group:channel2`, `${prefix}:group:channel3`],
//         });

//         // publish first message
//         await dataChannel1.publish('event0', 'test data 1');

//         return result.promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });

//     // wait for n consumers to appear in the given channel's presence set
//     function waitForNConsumersInPresenceSet(channel, n) {
//       return new Promise(async (resolve, reject) => {
//         const interval = setInterval(async () => {
//           try {
//             const result = await channel.presence.get({ waitForSync: true });
//             if (result.length === n) {
//               resolve();
//               channel.presence.unsubscribe();
//               clearInterval(interval);
//             }
//           } catch (err) {
//             reject(err);
//             channel.presence.unsubscribe();
//             clearInterval(interval);
//           }
//         }, 100);
//       });
//     }

//     function uniqueResults(results) {
//       return utils.arrUniqueBy(results, (elem) => `${elem.channel}:${elem.name}`);
//     }

//     function assertResults(results, channelPrefix, allowDuplicates) {
//       // expect each consumer to have received at least 1 message
//       for (let i = 0; i < results.length; i++) {
//         expect(results[i].length).to.be.greaterThan(0, `consumer ${i} received no messages`);
//       }
//       // sort first on channel, then on message name
//       let allResults = results.flat().sort((a, b) => {
//         if (a.channel < b.channel) return -1;
//         if (a.channel > b.channel) return 1;
//         if (a.name < b.name) return -1;
//         if (a.name > b.name) return 1;
//         return 0;
//       });
//       // remove duplicates if allowed
//       if (allowDuplicates) {
//         allResults = uniqueResults(allResults);
//       }
//       // expect to have received 2 messages from each channel across all consumers
//       for (let i = 0; i < allResults.length; i += 2) {
//         const baseIndex = i / 2;
//         const data = `test data ${baseIndex}`;
//         const channel = `${channelPrefix}:${baseIndex}`;

//         const first = allResults[i];
//         const second = allResults[i + 1];

//         expect(first.channel).to.equal(channel);
//         expect(second.channel).to.equal(channel);
//         expect(first.name).to.equal('event0');
//         expect(second.name).to.equal('event1');
//         expect(first.data).to.equal(data);
//         expect(second.data).to.equal(data);
//       }
//     }

//     it('partitions over consumer group', async function () {
//       let realtime1 = helper.AblyRealtime({ clientId: 'testclient' });
//       let realtime2 = helper.AblyRealtime({ clientId: 'consumer1' });
//       let realtime3 = helper.AblyRealtime({ clientId: 'consumer2' });

//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;
//         const consumerGroupName = `${prefix}:testgroup`;

//         await Promise.all([
//           new Promise((resolve) => realtime1.connection.on('connected', resolve)),
//           new Promise((resolve) => realtime2.connection.on('connected', resolve)),
//           new Promise((resolve) => realtime3.connection.on('connected', resolve)),
//         ]);

//         // create 2 consumers in one group
//         const consumers = [
//           realtime2.channelGroups.get(`${prefix}:.*`, {
//             activeChannel: activeChannelName,
//             consumerGroup: { name: consumerGroupName },
//           }),
//           realtime3.channelGroups.get(`${prefix}:.*`, {
//             activeChannel: activeChannelName,
//             consumerGroup: { name: consumerGroupName },
//           }),
//         ];

//         // create 5 channels
//         const channels = [];
//         const channelNames = Array.from({ length: 5 }, (_, i) => `${prefix}:` + i);
//         for (const name of channelNames) {
//           const channel = realtime1.channels.get(name);
//           await channel.attach();
//           channels.push(channel);
//         }

//         // subscribe each consumer and collect results
//         let result = new Deferred();
//         const messages = Array.from({ length: consumers.length }, () => []);
//         for (let i = 0; i < consumers.length; i++) {
//           await consumers[i].subscribe((channel, msg) => {
//             messages[i].push({ channel, name: msg.name, data: msg.data });
//             if (messages.flat().length === 2 * channels.length) {
//               assertResults(messages, prefix, false);
//               result.resolve();
//             }
//           });
//         }

//         // publish active channels
//         let activeChannel = realtime1.channels.get(activeChannelName);
//         await activeChannel.attach();
//         await activeChannel.publish('event0', { active: channelNames });

//         // wait for all consumers to appear in the group
//         await waitForNConsumersInPresenceSet(realtime1.channels.get(consumerGroupName), consumers.length);

//         // send 2 messages to each channel
//         for (let i = 0; i < channels.length; i++) {
//           await channels[i].publish('event0', `test data ${i}`);
//           await channels[i].publish('event1', `test data ${i}`);
//         }

//         return result.promise;
//       }

//       try {
//         await Promise.race([
//           monitorConnectionAsync(realtime1),
//           monitorConnectionAsync(realtime2),
//           monitorConnectionAsync(realtime3),
//           test(),
//         ]);
//         await closeAndFinishAsync([realtime1, realtime2, realtime3]);
//       } catch (err) {
//         await closeAndFinishAsync([realtime1, realtime2, realtime3], err);
//         return;
//       }
//     });

//     it('dynamically rebalances the consumer group', async function () {
//       let realtime1 = helper.AblyRealtime({ clientId: 'testclient' });
//       let realtime2 = helper.AblyRealtime({ clientId: 'consumer1' });
//       let realtime3 = helper.AblyRealtime({ clientId: 'consumer2' });
//       const deliveryTimeout = 3000;

//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;
//         const consumerGroupName = `${prefix}:testgroup`;

//         await Promise.all([
//           new Promise((resolve) => realtime1.connection.on('connected', resolve)),
//           new Promise((resolve) => realtime2.connection.on('connected', resolve)),
//           new Promise((resolve) => realtime3.connection.on('connected', resolve)),
//         ]);

//         // create 2 consumers in one group
//         const consumer1 = realtime2.channelGroups.get(`${prefix}:.*`, {
//           activeChannel: activeChannelName,
//           consumerGroup: { name: consumerGroupName },
//         });
//         const consumer2 = realtime3.channelGroups.get(`${prefix}:.*`, {
//           activeChannel: activeChannelName,
//           consumerGroup: { name: consumerGroupName },
//         });

//         // create 10 channels
//         const channels = [];
//         const channelNames = Array.from({ length: 10 }, (_, i) => `${prefix}:` + i);
//         for (const name of channelNames) {
//           const channel = realtime1.channels.get(name);
//           await channel.attach();
//           channels.push(channel);
//         }

//         // subscribe the first consumer and collect results
//         const consumer1Results = [];
//         let hasLeft = false;
//         await consumer1.subscribe((channel, msg) => {
//           expect(hasLeft).to.be.false;
//           consumer1Results.push({ channel, name: msg.name, data: msg.data });
//         });

//         // publish active channels
//         let activeChannel = realtime1.channels.get(activeChannelName);
//         await activeChannel.attach();
//         await activeChannel.publish('event0', { active: channelNames });

//         // wait for first consumer to appear in the group
//         await waitForNConsumersInPresenceSet(realtime1.channels.get(consumerGroupName), 1);

//         // send 2 messages to the first third of the channels
//         for (let i = 0; i < Math.floor(channels.length / 3); i++) {
//           await channels[i].publish('event0', `test data ${i}`);
//           await channels[i].publish('event1', `test data ${i}`);
//         }

//         // wait for the messages to be delivered
//         await new Promise((resolve) => setTimeout(resolve, deliveryTimeout));

//         // subscribe the second consumer and collect results
//         let consumer2Results = [];
//         await consumer2.subscribe((channel, msg) => {
//           consumer2Results.push({ channel, name: msg.name, data: msg.data });
//         });

//         // wait for second consumer to appear in the group
//         await waitForNConsumersInPresenceSet(realtime1.channels.get(consumerGroupName), 2);

//         // send 2 messages to the second third of the channels
//         for (let i = Math.floor(channels.length / 3); i < 2 * Math.floor(channels.length / 3); i++) {
//           await channels[i].publish('event0', `test data ${i}`);
//           await channels[i].publish('event1', `test data ${i}`);
//         }

//         // wait for the messages to be delivered
//         await new Promise((resolve) => setTimeout(resolve, deliveryTimeout));

//         // the first consumer leaves the group, remaining messages should be received by the second consumer
//         await consumer1.leave();
//         hasLeft = true;
//         await waitForNConsumersInPresenceSet(realtime1.channels.get(consumerGroupName), 1);

//         // send 2 messages to the final third of the channels
//         for (let i = 2 * Math.floor(channels.length / 3); i < channels.length; i++) {
//           await channels[i].publish('event0', `test data ${i}`);
//           await channels[i].publish('event1', `test data ${i}`);
//         }

//         // wait for the messages to be delivered
//         await new Promise((resolve) => setTimeout(resolve, deliveryTimeout));

//         assertResults([consumer1Results, consumer2Results], prefix, true);
//       }

//       try {
//         await Promise.race([
//           monitorConnectionAsync(realtime1),
//           monitorConnectionAsync(realtime2),
//           monitorConnectionAsync(realtime3),
//           test(),
//         ]);
//         await closeAndFinishAsync([realtime1, realtime2, realtime3]);
//       } catch (err) {
//         await closeAndFinishAsync([realtime1, realtime2, realtime3], err);
//         return;
//       }
//     });

//     it('does not conflict with regular use of channel', async function () {
//       let realtime1 = helper.AblyRealtime({ clientId: 'testclient' });
//       let realtime2 = helper.AblyRealtime({ clientId: 'consumer' });

//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;
//         const consumerGroupName = `${prefix}:testgroup`;

//         await Promise.all([
//           new Promise((resolve) => realtime1.connection.on('connected', resolve)),
//           new Promise((resolve) => realtime2.connection.on('connected', resolve)),
//         ]);

//         // create a group with a single consumer
//         const consumer = realtime2.channelGroups.get(`${prefix}:.*`, {
//           activeChannel: activeChannelName,
//           consumerGroup: { name: consumerGroupName },
//         });

//         let events = 0;
//         const messages = new DeferredMany(2);
//         await consumer.subscribe((channel, msg) => {
//           messages.items[events].resolve();
//           events++;
//           expect(msg.data).to.equal('test data', 'Unexpected msg text received');
//           expect(channel).to.equal(`${prefix}:channel`, 'Unexpected channel name');
//         });

//         // publish active channels
//         const channelName = `${prefix}:channel`;
//         let activeChannel = realtime1.channels.get(activeChannelName);
//         await activeChannel.attach();
//         await activeChannel.publish('event0', { active: [channelName] });

//         // wait for the consumer to appear in the group
//         await waitForNConsumersInPresenceSet(realtime1.channels.get(consumerGroupName), 1);

//         // send a message to the channel
//         // channel.publish('event0', 'test data');
//         realtime1.channels.get(channelName).publish('event0', 'test data');

//         // wait for the consumer to receive the message
//         await messages.items[0].promise;

//         // Create channel on same client as consumer group and rewind,
//         // as the attach will fail as options have changed if the channel group
//         // uses the same channel object exposed on the client.
//         // For example, if the BaseRealtime._channelGroups object was instantiated as:
//         //  ```
//         //  this._channelGroups = new modules.ChannelGroups(this._channels)
//         //  ```
//         //  We would see:
//         //  ```
//         //  Error: Channels.get() cannot be used to set channel options that would cause the channel to reattach. Please, use RealtimeChannel.setOptions() instead.
//         //  ```
//         const channel = realtime2.channels.get(channelName, { params: { rewind: 5 } });

//         await channel.subscribe((msg) => {
//           messages.items[events].resolve();
//           events++;
//           expect(msg.data).to.equal('test data', 'Unexpected msg text received');
//         });

//         // wait for the channel to receive the message via rewind
//         await messages.items[1].promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime1), monitorConnectionAsync(realtime2), test()]);
//         await closeAndFinishAsync([realtime1, realtime2]);
//       } catch (err) {
//         await closeAndFinishAsync([realtime1, realtime2], err);
//         return;
//       }
//     });

//     it('unsubscribes channels after timeout', async function () {
//       let realtime = helper.AblyRealtime({ clientId: 'testclient' });

//       async function test() {
//         const prefix = utils.cheapRandStr();
//         const activeChannelName = `${prefix}:active`;
//         const consumerGroupName = `${prefix}:testgroup`;

//         await new Promise((resolve) => realtime.connection.on('connected', resolve));

//         // create a group with a single consumer
//         const consumer = realtime.channelGroups.get(`${prefix}:.*`, {
//           activeChannel: activeChannelName,
//           consumerGroup: { name: consumerGroupName },
//           subscriptionTimeout: 1000,
//         });

//         let events = 0;
//         let messages = new DeferredMany(2);
//         await consumer.subscribe((channel, msg) => {
//           events++;
//           expect(events).to.equal(1, 'Unexpected number of messages received');
//           messages.items[0].resolve();
//           expect(msg.data).to.equal('test data', 'Unexpected msg text received');
//           expect(channel).to.equal(`${prefix}:channel`, 'Unexpected channel name');
//         });

//         // publish active channels
//         const channelName = `${prefix}:channel`;
//         let activeChannel = realtime.channels.get(activeChannelName);
//         await activeChannel.attach();
//         await activeChannel.publish('event0', { active: [channelName] });

//         // wait for the consumer to appear in the group
//         await waitForNConsumersInPresenceSet(realtime.channels.get(consumerGroupName), 1);

//         // send a message to the channel
//         realtime.channels.get(channelName).publish('event0', 'test data');

//         // wait for the consumer to receive the message
//         await messages.items[0].promise;

//         await realtime.channels.get(channelName).subscribe((msg) => {
//           events++;
//           expect(events).to.equal(2, 'Unexpected number of messages received');
//           messages.items[1].resolve();
//           expect(msg.data).to.equal('test data', 'Unexpected msg text received');
//         });

//         // wait for the consumer to unsubscribe from the channel after timeout
//         await new Promise((resolve) => setTimeout(resolve, 2000));

//         // send a message to the channel; the channel group should not receive it
//         realtime.channels.get(channelName).publish('event0', 'test data');

//         // wait for the channel to receive the message
//         await messages.items[1].promise;
//       }

//       try {
//         await Promise.race([monitorConnectionAsync(realtime), test()]);
//         await closeAndFinishAsync(realtime);
//       } catch (err) {
//         await closeAndFinishAsync(realtime, err);
//         return;
//       }
//     });
//   });
// });
