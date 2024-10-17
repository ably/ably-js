'use strict';

define(['ably', 'shared_helper', 'chai', 'live_objects', 'live_objects_helper'], function (
  Ably,
  Helper,
  chai,
  LiveObjectsPlugin,
  LiveObjectsHelper,
) {
  const expect = chai.expect;
  const BufferUtils = Ably.Realtime.Platform.BufferUtils;
  const createPM = Ably.makeProtocolMessageFromDeserialized({ LiveObjectsPlugin });
  const liveObjectsFixturesChannel = 'liveobjects_fixtures';
  const nextTick = Ably.Realtime.Platform.Config.nextTick;

  function RealtimeWithLiveObjects(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { LiveObjects: LiveObjectsPlugin } });
  }

  function channelOptionsWithLiveObjects(options) {
    return {
      ...options,
      modes: ['STATE_SUBSCRIBE', 'STATE_PUBLISH'],
    };
  }

  describe('realtime/live_objects', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);

      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }

        LiveObjectsHelper.initForChannel(helper, liveObjectsFixturesChannel)
          .then(done)
          .catch((err) => done(err));
      });
    });

    describe('Realtime without LiveObjects plugin', () => {
      /** @nospec */
      it("throws an error when attempting to access the channel's `liveObjects` property", async function () {
        const helper = this.test.helper;
        const client = helper.AblyRealtime({ autoConnect: false });
        const channel = client.channels.get('channel');
        expect(() => channel.liveObjects).to.throw('LiveObjects plugin not provided');
      });

      /** @nospec */
      it('doesn’t break when it receives a STATE_SYNC ProtocolMessage', async function () {
        const helper = this.test.helper;
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            // inject STATE_SYNC message that should be ignored and not break anything without LiveObjects plugin
            helper.recordPrivateApi('call.channel.processMessage');
            helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
            await testChannel.processMessage(
              createPM({
                action: 20,
                channel: 'channel',
                channelSerial: 'serial:',
                state: [
                  {
                    object: {
                      objectId: 'root',
                      regionalTimeserial: '@0-0',
                      map: {},
                    },
                  },
                ],
              }),
            );

            const publishChannel = publishClient.channels.get('channel');
            await publishChannel.publish(null, 'test');

            // regular message subscriptions should still work after processing STATE_SYNC message without LiveObjects plugin
            await receivedMessagePromise;
          }, publishClient);
        }, testClient);
      });
    });

    describe('Realtime with LiveObjects plugin', () => {
      /** @nospec */
      it("returns LiveObjects class instance when accessing channel's `liveObjects` property", async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper, { autoConnect: false });
        const channel = client.channels.get('channel');
        expect(channel.liveObjects.constructor.name).to.equal('LiveObjects');
      });

      /** @nospec */
      it('getRoot() returns LiveMap instance', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          expect(root.constructor.name).to.equal('LiveMap');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns live object with id "root"', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          helper.recordPrivateApi('call.LiveObject.getObjectId');
          expect(root.getObjectId()).to.equal('root');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns empty root when no state exist on a channel', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          expect(root.size()).to.equal(0, 'Check root has no keys');
        }, client);
      });

      /** @nospec */
      it('getRoot() waits for initial STATE_SYNC to be completed before resolving', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          const getRootPromise = liveObjects.getRoot();

          let getRootResolved = false;
          getRootPromise.then(() => {
            getRootResolved = true;
          });

          // give a chance for getRoot() to resolve and proc its handler. it should not
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));
          expect(getRootResolved, 'Check getRoot() is not resolved until STATE_SYNC sequence is completed').to.be.false;

          await channel.attach();

          // should resolve eventually after attach
          await getRootPromise;
        }, client);
      });

      /** @nospec */
      it('getRoot() resolves immediately when STATE_SYNC sequence is completed', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          // wait for STATE_SYNC sequence to complete by accessing root for the first time
          await liveObjects.getRoot();

          let resolvedImmediately = false;
          liveObjects.getRoot().then(() => {
            resolvedImmediately = true;
          });

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(resolvedImmediately, 'Check getRoot() is resolved on next tick').to.be.true;
        }, client);
      });

      /** @nospec */
      it('getRoot() waits for subsequent STATE_SYNC to finish before resolving', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          // wait for initial STATE_SYNC sequence to complete
          await liveObjects.getRoot();

          // inject STATE_SYNC message to emulate start of new sequence
          helper.recordPrivateApi('call.channel.processMessage');
          helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
          await channel.processMessage(
            createPM({
              action: 20,
              channel: 'channel',
              // have cursor so client awaits for additional STATE_SYNC messages
              channelSerial: 'serial:cursor',
              state: [],
            }),
          );

          let getRootResolved = false;
          let newRoot;
          liveObjects.getRoot().then((value) => {
            getRootResolved = true;
            newRoot = value;
          });

          // wait for next tick to check that getRoot() promise handler didn't proc
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is not resolved while STATE_SYNC is in progress').to.be.false;

          // inject next STATE_SYNC message
          helper.recordPrivateApi('call.channel.processMessage');
          helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
          await channel.processMessage(
            createPM({
              action: 20,
              channel: 'channel',
              // no cursor to indicate the end of STATE_SYNC messages
              channelSerial: 'serial:',
              state: [
                {
                  object: {
                    objectId: 'root',
                    regionalTimeserial: '@0-0',
                    map: {
                      entries: {
                        key: {
                          timeserial: '@0-0',
                          data: {
                            value: 1,
                          },
                        },
                      },
                    },
                  },
                },
              ],
            }),
          );

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is resolved when STATE_SYNC sequence has ended').to.be.true;
          expect(newRoot.get('key')).to.equal(1, 'Check new root after STATE_SYNC sequence has expected key');
        }, client);
      });

      it('builds state object tree from STATE_SYNC sequence on channel attachment', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get(liveObjectsFixturesChannel, channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          const counterKeys = ['emptyCounter', 'initialValueCounter', 'referencedCounter'];
          const mapKeys = ['emptyMap', 'referencedMap', 'valuesMap'];
          const rootKeysCount = counterKeys.length + mapKeys.length;

          expect(root, 'Check getRoot() is resolved when STATE_SYNC sequence ends').to.exist;
          expect(root.size()).to.equal(rootKeysCount, 'Check root has correct number of keys');

          counterKeys.forEach((key) => {
            const counter = root.get(key);
            expect(counter, `Check counter at key="${key}" in root exists`).to.exist;
            expect(counter.constructor.name).to.equal(
              'LiveCounter',
              `Check counter at key="${key}" in root is of type LiveCounter`,
            );
          });

          mapKeys.forEach((key) => {
            const map = root.get(key);
            expect(map, `Check map at key="${key}" in root exists`).to.exist;
            expect(map.constructor.name).to.equal('LiveMap', `Check map at key="${key}" in root is of type LiveMap`);
          });

          const valuesMap = root.get('valuesMap');
          const valueMapKeys = [
            'stringKey',
            'emptyStringKey',
            'bytesKey',
            'emptyBytesKey',
            'numberKey',
            'zeroKey',
            'trueKey',
            'falseKey',
            'mapKey',
          ];
          expect(valuesMap.size()).to.equal(valueMapKeys.length, 'Check nested map has correct number of keys');
          valueMapKeys.forEach((key) => {
            const value = valuesMap.get(key);
            expect(value, `Check value at key="${key}" in nested map exists`).to.exist;
          });
        }, client);
      });

      it('LiveCounter is initialized with initial value from STATE_SYNC sequence', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get(liveObjectsFixturesChannel, channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          const counters = [
            { key: 'emptyCounter', value: 0 },
            { key: 'initialValueCounter', value: 10 },
            { key: 'referencedCounter', value: 20 },
          ];

          counters.forEach((x) => {
            const counter = root.get(x.key);
            expect(counter.value()).to.equal(x.value, `Check counter at key="${x.key}" in root has correct value`);
          });
        }, client);
      });

      it('LiveMap is initialized with initial value from STATE_SYNC sequence', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get(liveObjectsFixturesChannel, channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          const emptyMap = root.get('emptyMap');
          expect(emptyMap.size()).to.equal(0, 'Check empty map in root has no keys');

          const referencedMap = root.get('referencedMap');
          expect(referencedMap.size()).to.equal(1, 'Check referenced map in root has correct number of keys');

          const counterFromReferencedMap = referencedMap.get('counterKey');
          expect(counterFromReferencedMap.value()).to.equal(20, 'Check nested counter has correct value');

          const valuesMap = root.get('valuesMap');
          expect(valuesMap.size()).to.equal(9, 'Check values map in root has correct number of keys');

          expect(valuesMap.get('stringKey')).to.equal('stringValue', 'Check values map has correct string value key');
          expect(valuesMap.get('emptyStringKey')).to.equal('', 'Check values map has correct empty string value key');
          expect(
            BufferUtils.areBuffersEqual(
              valuesMap.get('bytesKey'),
              BufferUtils.base64Decode('eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9'),
            ),
            'Check values map has correct bytes value key',
          ).to.be.true;
          expect(
            BufferUtils.areBuffersEqual(valuesMap.get('emptyBytesKey'), BufferUtils.base64Decode('')),
            'Check values map has correct empty bytes value key',
          ).to.be.true;
          expect(valuesMap.get('numberKey')).to.equal(1, 'Check values map has correct number value key');
          expect(valuesMap.get('zeroKey')).to.equal(0, 'Check values map has correct zero number value key');
          expect(valuesMap.get('trueKey')).to.equal(true, `Check values map has correct 'true' value key`);
          expect(valuesMap.get('falseKey')).to.equal(false, `Check values map has correct 'false' value key`);

          const mapFromValuesMap = valuesMap.get('mapKey');
          expect(mapFromValuesMap.size()).to.equal(1, 'Check nested map has correct number of keys');
        }, client);
      });

      it('LiveMaps can reference the same object in their keys', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get(liveObjectsFixturesChannel, channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          const referencedCounter = root.get('referencedCounter');
          const referencedMap = root.get('referencedMap');
          const valuesMap = root.get('valuesMap');

          const counterFromReferencedMap = referencedMap.get('counterKey');
          expect(counterFromReferencedMap, 'Check nested counter exists at a key in a map').to.exist;
          expect(counterFromReferencedMap.constructor.name).to.equal(
            'LiveCounter',
            'Check nested counter is of type LiveCounter',
          );
          expect(counterFromReferencedMap).to.equal(
            referencedCounter,
            'Check nested counter is the same object instance as counter on the root',
          );
          expect(counterFromReferencedMap.value()).to.equal(20, 'Check nested counter has correct value');

          const mapFromValuesMap = valuesMap.get('mapKey');
          expect(mapFromValuesMap, 'Check nested map exists at a key in a map').to.exist;
          expect(mapFromValuesMap.constructor.name).to.equal('LiveMap', 'Check nested map is of type LiveMap');
          expect(mapFromValuesMap.size()).to.equal(1, 'Check nested map has correct number of keys');
          expect(mapFromValuesMap).to.equal(
            referencedMap,
            'Check nested map is the same object instance as map on the root',
          );
        }, client);
      });
    });
  });
});
