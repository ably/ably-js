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

  function expectInstanceOf(object, className, msg) {
    // esbuild changes the name for classes with static method to include an underscore as prefix.
    // so LiveMap becomes _LiveMap. we account for it here.
    expect(object.constructor.name).to.match(new RegExp(`_?${className}`), msg);
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

        new LiveObjectsHelper(helper)
          .initForChannel(liveObjectsFixturesChannel)
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
      it(`doesn't break when it receives a STATE ProtocolMessage`, async function () {
        const helper = this.test.helper;
        const liveObjectsHelper = new LiveObjectsHelper(helper);
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            // inject STATE message that should be ignored and not break anything without LiveObjects plugin
            await liveObjectsHelper.processStateOperationMessageOnChannel({
              channel: testChannel,
              serial: '@0-0',
              state: [
                liveObjectsHelper.mapSetOp({ objectId: 'root', key: 'stringKey', data: { value: 'stringValue' } }),
              ],
            });

            const publishChannel = publishClient.channels.get('channel');
            await publishChannel.publish(null, 'test');

            // regular message subscriptions should still work after processing STATE_SYNC message without LiveObjects plugin
            await receivedMessagePromise;
          }, publishClient);
        }, testClient);
      });

      /** @nospec */
      it(`doesn't break when it receives a STATE_SYNC ProtocolMessage`, async function () {
        const helper = this.test.helper;
        const liveObjectsHelper = new LiveObjectsHelper(helper);
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            // inject STATE_SYNC message that should be ignored and not break anything without LiveObjects plugin
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel: testChannel,
              syncSerial: 'serial:',
              state: [liveObjectsHelper.mapObject({ objectId: 'root', regionalTimeserial: '@0-0' })],
            });

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
        expectInstanceOf(channel.liveObjects, 'LiveObjects');
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

          expectInstanceOf(root, 'LiveMap', 'root object should be of LiveMap type');
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
          expect(root.getObjectId()).to.equal('root', 'root object should have an object id "root"');
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
      it('getRoot() waits for STATE_SYNC with empty cursor before resolving', async function () {
        const helper = this.test.helper;
        const liveObjectsHelper = new LiveObjectsHelper(helper);
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          // wait for initial STATE_SYNC sequence to complete
          await liveObjects.getRoot();

          // inject STATE_SYNC message to emulate start of a new sequence
          await liveObjectsHelper.processStateObjectMessageOnChannel({
            channel,
            // have cursor so client awaits for additional STATE_SYNC messages
            syncSerial: 'serial:cursor',
          });

          let getRootResolved = false;
          let root;
          liveObjects.getRoot().then((value) => {
            getRootResolved = true;
            root = value;
          });

          // wait for next tick to check that getRoot() promise handler didn't proc
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is not resolved while STATE_SYNC is in progress').to.be.false;

          // inject final STATE_SYNC message
          await liveObjectsHelper.processStateObjectMessageOnChannel({
            channel,
            // no cursor to indicate the end of STATE_SYNC messages
            syncSerial: 'serial:',
            state: [
              liveObjectsHelper.mapObject({
                objectId: 'root',
                regionalTimeserial: '@0-0',
                entries: { key: { timeserial: '@0-0', data: { value: 1 } } },
              }),
            ],
          });

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is resolved when STATE_SYNC sequence has ended').to.be.true;
          expect(root.get('key')).to.equal(1, 'Check new root after STATE_SYNC sequence has expected key');
        }, client);
      });

      /** @nospec */
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
            expectInstanceOf(counter, 'LiveCounter', `Check counter at key="${key}" in root is of type LiveCounter`);
          });

          mapKeys.forEach((key) => {
            const map = root.get(key);
            expect(map, `Check map at key="${key}" in root exists`).to.exist;
            expectInstanceOf(map, 'LiveMap', `Check map at key="${key}" in root is of type LiveMap`);
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

      /** @nospec */
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

      /** @nospec */
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

      /** @nospec */
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
          expectInstanceOf(counterFromReferencedMap, 'LiveCounter', 'Check nested counter is of type LiveCounter');
          expect(counterFromReferencedMap).to.equal(
            referencedCounter,
            'Check nested counter is the same object instance as counter on the root',
          );
          expect(counterFromReferencedMap.value()).to.equal(20, 'Check nested counter has correct value');

          const mapFromValuesMap = valuesMap.get('mapKey');
          expect(mapFromValuesMap, 'Check nested map exists at a key in a map').to.exist;
          expectInstanceOf(mapFromValuesMap, 'LiveMap', 'Check nested map is of type LiveMap');
          expect(mapFromValuesMap.size()).to.equal(1, 'Check nested map has correct number of keys');
          expect(mapFromValuesMap).to.equal(
            referencedMap,
            'Check nested map is the same object instance as map on the root',
          );
        }, client);
      });

      const primitiveKeyData = [
        { key: 'stringKey', data: { value: 'stringValue' } },
        { key: 'emptyStringKey', data: { value: '' } },
        {
          key: 'bytesKey',
          data: { value: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9', encoding: 'base64' },
        },
        { key: 'emptyBytesKey', data: { value: '', encoding: 'base64' } },
        { key: 'maxSafeIntegerKey', data: { value: Number.MAX_SAFE_INTEGER } },
        { key: 'negativeMaxSafeIntegerKey', data: { value: -Number.MAX_SAFE_INTEGER } },
        { key: 'numberKey', data: { value: 1 } },
        { key: 'zeroKey', data: { value: 0 } },
        { key: 'trueKey', data: { value: true } },
        { key: 'falseKey', data: { value: false } },
      ];
      const primitiveMapsFixtures = [
        { name: 'emptyMap' },
        {
          name: 'valuesMap',
          entries: primitiveKeyData.reduce((acc, v) => {
            acc[v.key] = { data: v.data };
            return acc;
          }, {}),
        },
      ];
      const countersFixtures = [
        { name: 'emptyCounter' },
        { name: 'zeroCounter', count: 0 },
        { name: 'valueCounter', count: 10 },
        { name: 'negativeValueCounter', count: -10 },
        { name: 'maxSafeIntegerCounter', count: Number.MAX_SAFE_INTEGER },
        { name: 'negativeMaxSafeIntegerCounter', count: -Number.MAX_SAFE_INTEGER },
      ];
      const applyOperationsScenarios = [
        {
          description: 'MAP_CREATE with primitives',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;

            // LiveObjects public API allows us to check value of objects we've created based on MAP_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the MAP_CREATE op.

            // check no maps exist on root
            primitiveMapsFixtures.forEach((fixture) => {
              const key = fixture.name;
              expect(root.get(key, `Check "${key}" key doesn't exist on root before applying MAP_CREATE ops`)).to.not
                .exist;
            });

            // create new maps and set on root
            await Promise.all(
              primitiveMapsFixtures.map((fixture) =>
                liveObjectsHelper.createAndSetOnMap(channelName, {
                  mapObjectId: 'root',
                  key: fixture.name,
                  createOp: liveObjectsHelper.mapCreateOp({ entries: fixture.entries }),
                }),
              ),
            );

            // check created maps
            primitiveMapsFixtures.forEach((fixture) => {
              const key = fixture.name;
              const mapObj = root.get(key);

              // check all maps exist on root
              expect(mapObj, `Check map at "${key}" key in root exists`).to.exist;
              expectInstanceOf(mapObj, 'LiveMap', `Check map at "${key}" key in root is of type LiveMap`);

              // check primitive maps have correct values
              expect(mapObj.size()).to.equal(
                Object.keys(fixture.entries ?? {}).length,
                `Check map "${key}" has correct number of keys`,
              );

              Object.entries(fixture.entries ?? {}).forEach(([key, keyData]) => {
                if (keyData.data.encoding) {
                  expect(
                    BufferUtils.areBuffersEqual(mapObj.get(key), BufferUtils.base64Decode(keyData.data.value)),
                    `Check map "${key}" has correct value for "${key}" key`,
                  ).to.be.true;
                } else {
                  expect(mapObj.get(key)).to.equal(
                    keyData.data.value,
                    `Check map "${key}" has correct value for "${key}" key`,
                  );
                }
              });
            });
          },
        },

        {
          description: 'MAP_CREATE with object ids',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;
            const withReferencesMapKey = 'withReferencesMap';

            // LiveObjects public API allows us to check value of objects we've created based on MAP_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the MAP_CREATE op.

            // check map does not exist on root
            expect(
              root.get(
                withReferencesMapKey,
                `Check "${withReferencesMapKey}" key doesn't exist on root before applying MAP_CREATE ops`,
              ),
            ).to.not.exist;

            // create map with references. need to create referenced objects first to obtain their object ids
            const { objectId: referencedMapObjectId } = await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapCreateOp({ entries: { stringKey: { data: { value: 'stringValue' } } } }),
            );
            const { objectId: referencedCounterObjectId } = await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.counterCreateOp({ count: 1 }),
            );
            await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: withReferencesMapKey,
              createOp: liveObjectsHelper.mapCreateOp({
                entries: {
                  mapReference: { data: { objectId: referencedMapObjectId } },
                  counterReference: { data: { objectId: referencedCounterObjectId } },
                },
              }),
            });

            // check map with references exist on root
            const withReferencesMap = root.get(withReferencesMapKey);
            expect(withReferencesMap, `Check map at "${withReferencesMapKey}" key in root exists`).to.exist;
            expectInstanceOf(
              withReferencesMap,
              'LiveMap',
              `Check map at "${withReferencesMapKey}" key in root is of type LiveMap`,
            );

            // check map with references has correct values
            expect(withReferencesMap.size()).to.equal(
              2,
              `Check map "${withReferencesMapKey}" has correct number of keys`,
            );

            const referencedCounter = withReferencesMap.get('counterReference');
            const referencedMap = withReferencesMap.get('mapReference');

            expect(referencedCounter, `Check counter at "counterReference" exists`).to.exist;
            expectInstanceOf(
              referencedCounter,
              'LiveCounter',
              `Check counter at "counterReference" key is of type LiveCounter`,
            );
            expect(referencedCounter.value()).to.equal(1, 'Check counter at "counterReference" key has correct value');

            expect(referencedMap, `Check map at "mapReference" key exists`).to.exist;
            expectInstanceOf(referencedMap, 'LiveMap', `Check map at "mapReference" key is of type LiveMap`);

            expect(referencedMap.size()).to.equal(1, 'Check map at "mapReference" key has correct number of keys');
            expect(referencedMap.get('stringKey')).to.equal(
              'stringValue',
              'Check map at "mapReference" key has correct "stringKey" value',
            );
          },
        },

        {
          description: 'MAP_SET with primitives',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;

            // check root is empty before ops
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get(keyData.key, `Check "${keyData.key}" key doesn't exist on root before applying MAP_SET ops`),
              ).to.not.exist;
            });

            // apply MAP_SET ops
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                liveObjectsHelper.stateRequest(
                  channelName,
                  liveObjectsHelper.mapSetOp({
                    objectId: 'root',
                    key: keyData.key,
                    data: keyData.data,
                  }),
                ),
              ),
            );

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after MAP_SET op`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after MAP_SET op`,
                );
              }
            });
          },
        },

        {
          description: 'MAP_SET with object ids',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;

            // check no object ids are set on root
            expect(
              root.get('keyToCounter', `Check "keyToCounter" key doesn't exist on root before applying MAP_SET ops`),
            ).to.not.exist;
            expect(root.get('keyToMap', `Check "keyToMap" key doesn't exist on root before applying MAP_SET ops`)).to
              .not.exist;

            // create new objects and set on root
            await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'keyToCounter',
              createOp: liveObjectsHelper.counterCreateOp({ count: 1 }),
            });

            await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'keyToMap',
              createOp: liveObjectsHelper.mapCreateOp({
                entries: {
                  stringKey: { data: { value: 'stringValue' } },
                },
              }),
            });

            // check root has refs to new objects and they are not zero-value
            const counter = root.get('keyToCounter');
            const map = root.get('keyToMap');

            expect(counter, 'Check counter at "keyToCounter" key in root exists').to.exist;
            expectInstanceOf(
              counter,
              'LiveCounter',
              'Check counter at "keyToCounter" key in root is of type LiveCounter',
            );
            expect(counter.value()).to.equal(1, 'Check counter at "keyToCounter" key in root has correct value');

            expect(map, 'Check map at "keyToMap" key in root exists').to.exist;
            expectInstanceOf(map, 'LiveMap', 'Check map at "keyToMap" key in root is of type LiveMap');
            expect(map.size()).to.equal(1, 'Check map at "keyToMap" key in root has correct number of keys');
            expect(map.get('stringKey')).to.equal(
              'stringValue',
              'Check map at "keyToMap" key in root has correct "stringKey" value',
            );
          },
        },

        {
          description: 'MAP_REMOVE',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;
            const mapKey = 'map';

            // create new map and set on root
            const { objectId: mapObjectId } = await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: mapKey,
              createOp: liveObjectsHelper.mapCreateOp({
                entries: {
                  shouldStay: { data: { value: 'foo' } },
                  shouldDelete: { data: { value: 'bar' } },
                },
              }),
            });

            const map = root.get(mapKey);
            // check map has expected keys before MAP_REMOVE ops
            expect(map.size()).to.equal(
              2,
              `Check map at "${mapKey}" key in root has correct number of keys before MAP_REMOVE`,
            );
            expect(map.get('shouldStay')).to.equal(
              'foo',
              `Check map at "${mapKey}" key in root has correct "shouldStay" value before MAP_REMOVE`,
            );
            expect(map.get('shouldDelete')).to.equal(
              'bar',
              `Check map at "${mapKey}" key in root has correct "shouldDelete" value before MAP_REMOVE`,
            );

            // send MAP_REMOVE op
            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapRemoveOp({
                objectId: mapObjectId,
                key: 'shouldDelete',
              }),
            );

            // check map has correct keys after MAP_REMOVE ops
            expect(map.size()).to.equal(
              1,
              `Check map at "${mapKey}" key in root has correct number of keys after MAP_REMOVE`,
            );
            expect(map.get('shouldStay')).to.equal(
              'foo',
              `Check map at "${mapKey}" key in root has correct "shouldStay" value after MAP_REMOVE`,
            );
            expect(
              map.get('shouldDelete'),
              `Check map at "${mapKey}" key in root has no "shouldDelete" key after MAP_REMOVE`,
            ).to.not.exist;
          },
        },

        {
          description: 'COUNTER_CREATE',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;

            // LiveObjects public API allows us to check value of objects we've created based on COUNTER_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the COUNTER_CREATE op.

            // check no counters exist on root
            countersFixtures.forEach((fixture) => {
              const key = fixture.name;
              expect(root.get(key, `Check "${key}" key doesn't exist on root before applying COUNTER_CREATE ops`)).to
                .not.exist;
            });

            // create new counters and set on root
            await Promise.all(
              countersFixtures.map((fixture) =>
                liveObjectsHelper.createAndSetOnMap(channelName, {
                  mapObjectId: 'root',
                  key: fixture.name,
                  createOp: liveObjectsHelper.counterCreateOp({ count: fixture.count }),
                }),
              ),
            );

            // check created counters
            countersFixtures.forEach((fixture) => {
              const key = fixture.name;
              const counterObj = root.get(key);

              // check all counters exist on root
              expect(counterObj, `Check counter at "${key}" key in root exists`).to.exist;
              expectInstanceOf(
                counterObj,
                'LiveCounter',
                `Check counter at "${key}" key in root is of type LiveCounter`,
              );

              // check counters have correct values
              expect(counterObj.value()).to.equal(
                // if count was not set, should default to 0
                fixture.count ?? 0,
                `Check counter at "${key}" key in root has correct value`,
              );
            });
          },
        },

        {
          description: 'COUNTER_INC',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName } = ctx;
            const counterKey = 'counter';
            let expectedCounterValue = 0;

            // create new counter and set on root
            const { objectId: counterObjectId } = await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: counterKey,
              createOp: liveObjectsHelper.counterCreateOp({ count: expectedCounterValue }),
            });

            const counter = root.get(counterKey);
            // check counter has expected value before COUNTER_INC
            expect(counter.value()).to.equal(
              expectedCounterValue,
              `Check counter at "${counterKey}" key in root has correct value before COUNTER_INC`,
            );

            const increments = [
              1, // value=1
              10, // value=11
              100, // value=111
              1000000, // value=1000111
              -1000111, // value=0
              -1, // value=-1
              -10, // value=-11
              -100, // value=-111
              -1000000, // value=-1000111
              1000111, // value=0
              Number.MAX_SAFE_INTEGER, // value=9007199254740991
              // do next decrements in 2 steps as opposed to multiplying by -2 to prevent overflow
              -Number.MAX_SAFE_INTEGER, // value=0
              -Number.MAX_SAFE_INTEGER, // value=-9007199254740991
            ];

            // send increments one at a time and check expected value
            for (let i = 0; i < increments.length; i++) {
              const increment = increments[i];

              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.counterIncOp({
                  objectId: counterObjectId,
                  amount: increment,
                }),
              );
              expectedCounterValue += increment;

              expect(counter.value()).to.equal(
                expectedCounterValue,
                `Check counter at "${counterKey}" key in root has correct value after ${i + 1} COUNTER_INC ops`,
              );
            }
          },
        },
      ];

      for (const scenario of applyOperationsScenarios) {
        if (scenario.skip === true) {
          continue;
        }

        /** @nospec */
        it(`can apply ${scenario.description} state operation messages`, async function () {
          const helper = this.test.helper;
          const liveObjectsHelper = new LiveObjectsHelper(helper);
          const client = RealtimeWithLiveObjects(helper);

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            const channelName = `channel_can_apply_${scenario.description}`;
            const channel = client.channels.get(channelName, channelOptionsWithLiveObjects());
            const liveObjects = channel.liveObjects;

            await channel.attach();
            const root = await liveObjects.getRoot();

            await scenario.action({ root, liveObjectsHelper, channelName });
          }, client);
        });
      }

      const applyOperationsDuringSyncScenarios = [
        {
          description: 'state operation messages are buffered during STATE_SYNC sequence',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next STATE_SYNC messages
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, it should not be applied as sync is in progress
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial: '@0-0',
                  state: [liveObjectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: keyData.data })],
                }),
              ),
            );

            // check root doesn't have data from operations
            primitiveKeyData.forEach((keyData) => {
              expect(root.get(keyData.key), `Check "${keyData.key}" key doesn't exist on root during STATE_SYNC`).to.not
                .exist;
            });
          },
        },

        {
          description: 'buffered state operation messages are applied when STATE_SYNC sequence ends',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next STATE_SYNC messages
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial: '@0-0',
                  state: [liveObjectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: keyData.data })],
                }),
              ),
            );

            // end the sync with empty cursor
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after STATE_SYNC has ended and buffered operations are applied`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after STATE_SYNC has ended and buffered operations are applied`,
                );
              }
            });
          },
        },

        {
          description: 'buffered state operation messages are discarded when new STATE_SYNC sequence starts',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next STATE_SYNC messages
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, expect them to be discarded when sync with new sequence id starts
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial: '@0-0',
                  state: [liveObjectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: keyData.data })],
                }),
              ),
            );

            // start new sync with new sequence id
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'otherserial:cursor',
            });

            // inject another operation that should be applied when latest sync ends
            await liveObjectsHelper.processStateOperationMessageOnChannel({
              channel,
              serial: '@0-0',
              state: [liveObjectsHelper.mapSetOp({ objectId: 'root', key: 'foo', data: { value: 'bar' } })],
            });

            // end sync
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'otherserial:',
            });

            // check root doesn't have data from operations received during first sync
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get(keyData.key),
                `Check "${keyData.key}" key doesn't exist on root when STATE_SYNC has ended`,
              ).to.not.exist;
            });

            // check root has data from operations received during second sync
            expect(root.get('foo')).to.equal(
              'bar',
              'Check root has data from operations received during second STATE_SYNC sequence',
            );
          },
        },

        {
          description: 'buffered state operation messages are applied based on regional timeserial of the object',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next STATE_SYNC messages
            const mapId = liveObjectsHelper.fakeMapObjectId();
            const counterId = liveObjectsHelper.fakeCounterObjectId();
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
              // add state object messages with non-zero regional timeserials
              state: [
                liveObjectsHelper.mapObject({
                  objectId: 'root',
                  regionalTimeserial: '@1-0',
                  entries: {
                    map: { timeserial: '@0-0', data: { objectId: mapId } },
                    counter: { timeserial: '@0-0', data: { objectId: counterId } },
                  },
                }),
                liveObjectsHelper.mapObject({
                  objectId: mapId,
                  regionalTimeserial: '@1-0',
                }),
                liveObjectsHelper.counterObject({
                  objectId: counterId,
                  regionalTimeserial: '@1-0',
                }),
              ],
            });

            // inject operations with older or equal regional timeserial, expect them not to be applied when sync ends
            await Promise.all(
              ['@0-0', '@1-0'].map(async (serial) => {
                await Promise.all(
                  ['root', mapId].flatMap((objectId) =>
                    primitiveKeyData.map((keyData) =>
                      liveObjectsHelper.processStateOperationMessageOnChannel({
                        channel,
                        serial,
                        state: [liveObjectsHelper.mapSetOp({ objectId, key: keyData.key, data: keyData.data })],
                      }),
                    ),
                  ),
                );
                await liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial,
                  state: [liveObjectsHelper.counterIncOp({ objectId: counterId, amount: 1 })],
                });
              }),
            );

            // inject operations with greater regional timeserial, expect them to be applied when sync ends
            await Promise.all(
              ['root', mapId].map((objectId) =>
                liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial: '@2-0',
                  state: [liveObjectsHelper.mapSetOp({ objectId, key: 'foo', data: { value: 'bar' } })],
                }),
              ),
            );
            await liveObjectsHelper.processStateOperationMessageOnChannel({
              channel,
              serial: '@2-0',
              state: [liveObjectsHelper.counterIncOp({ objectId: counterId, amount: 1 })],
            });

            // end sync
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // check operations with older or equal regional timeserial are not applied
            // counter will be checked to match an expected value explicitly, so no need to check that it doesn't equal a sum of operations
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get(keyData.key),
                `Check "${keyData.key}" key doesn't exist on root when STATE_SYNC has ended`,
              ).to.not.exist;
            });
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get('map').get(keyData.key),
                `Check "${keyData.key}" key doesn't exist on inner map when STATE_SYNC has ended`,
              ).to.not.exist;
            });

            // check operations with greater regional timeserial are applied
            expect(root.get('foo')).to.equal(
              'bar',
              'Check only data from operations with greater regional timeserial exists on root after STATE_SYNC',
            );
            expect(root.get('map').get('foo')).to.equal(
              'bar',
              'Check only data from operations with greater regional timeserial exists on inner map after STATE_SYNC',
            );
            expect(root.get('counter').value()).to.equal(
              1,
              'Check only increment operations with greater regional timeserial were applied to counter after STATE_SYNC',
            );
          },
        },

        {
          description:
            'subsequent state operation messages are applied immediately after STATE_SYNC ended and buffers are applied',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channel, channelName } = ctx;

            // start new sync sequence with a cursor so client will wait for the next STATE_SYNC messages
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                liveObjectsHelper.processStateOperationMessageOnChannel({
                  channel,
                  serial: '@0-0',
                  state: [liveObjectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: keyData.data })],
                }),
              ),
            );

            // end the sync with empty cursor
            await liveObjectsHelper.processStateObjectMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // send some more operations
            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapSetOp({
                objectId: 'root',
                key: 'foo',
                data: { value: 'bar' },
              }),
            );

            // check buffered operations are applied, as well as the most recent operation outside of the STATE_SYNC is applied
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after STATE_SYNC has ended and buffered operations are applied`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after STATE_SYNC has ended and buffered operations are applied`,
                );
              }
            });
            expect(root.get('foo')).to.equal(
              'bar',
              'Check root has correct value for "foo" key from operation received outside of STATE_SYNC after other buffered operations were applied',
            );
          },
        },
      ];

      for (const scenario of applyOperationsDuringSyncScenarios) {
        if (scenario.skip === true) {
          continue;
        }

        /** @nospec */
        it(scenario.description, async function () {
          const helper = this.test.helper;
          const liveObjectsHelper = new LiveObjectsHelper(helper);
          const client = RealtimeWithLiveObjects(helper);

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            const channelName = scenario.description;
            const channel = client.channels.get(channelName, channelOptionsWithLiveObjects());
            const liveObjects = channel.liveObjects;

            await channel.attach();
            // wait for getRoot() to resolve so the initial SYNC sequence is completed,
            // as we're going to initiate a new one to test applying operations during SYNC sequence.
            const root = await liveObjects.getRoot();

            await scenario.action({ root, liveObjectsHelper, channelName, channel });
          }, client);
        });
      }

      const subscriptionCallbacksScenarios = [
        {
          description: 'can subscribe to the incoming COUNTER_INC operation on a LiveCounter',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              counter.subscribe((update) => {
                try {
                  expect(update).to.deep.equal(
                    { update: { inc: 1 } },
                    'Check counter subscription callback is called with an expected update object for COUNTER_INC operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.counterIncOp({
                objectId: sampleCounterObjectId,
                amount: 1,
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          description: 'can subscribe to multiple incoming operations on a LiveCounter',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            const expectedCounterIncrements = [100, -100, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
            let currentUpdateIndex = 0;

            const subscriptionPromise = new Promise((resolve, reject) =>
              counter.subscribe((update) => {
                try {
                  const expectedInc = expectedCounterIncrements[currentUpdateIndex];
                  expect(update).to.deep.equal(
                    { update: { inc: expectedInc } },
                    `Check counter subscription callback is called with an expected update object for ${currentUpdateIndex + 1} times`,
                  );

                  if (currentUpdateIndex === expectedCounterIncrements.length - 1) {
                    resolve();
                  }

                  currentUpdateIndex++;
                } catch (error) {
                  reject(error);
                }
              }),
            );

            for (const increment of expectedCounterIncrements) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.counterIncOp({
                  objectId: sampleCounterObjectId,
                  amount: increment,
                }),
              );
            }

            await subscriptionPromise;
          },
        },

        {
          description: 'can subscribe to the incoming MAP_SET operation on a LiveMap',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update).to.deep.equal(
                    { update: { stringKey: 'updated' } },
                    'Check map subscription callback is called with an expected update object for MAP_SET operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapSetOp({
                objectId: sampleMapObjectId,
                key: 'stringKey',
                data: { value: 'stringValue' },
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          description: 'can subscribe to the incoming MAP_REMOVE operation on a LiveMap',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update).to.deep.equal(
                    { update: { stringKey: 'removed' } },
                    'Check map subscription callback is called with an expected update object for MAP_REMOVE operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapRemoveOp({
                objectId: sampleMapObjectId,
                key: 'stringKey',
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          description: 'can subscribe to multiple incoming operations on a LiveMap',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const expectedMapUpdates = [
              { update: { foo: 'updated' } },
              { update: { bar: 'updated' } },
              { update: { foo: 'removed' } },
              { update: { baz: 'updated' } },
              { update: { bar: 'removed' } },
            ];
            let currentUpdateIndex = 0;

            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update).to.deep.equal(
                    expectedMapUpdates[currentUpdateIndex],
                    `Check map subscription callback is called with an expected update object for ${currentUpdateIndex + 1} times`,
                  );

                  if (currentUpdateIndex === expectedMapUpdates.length - 1) {
                    resolve();
                  }

                  currentUpdateIndex++;
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapSetOp({
                objectId: sampleMapObjectId,
                key: 'foo',
                data: { value: 'something' },
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapSetOp({
                objectId: sampleMapObjectId,
                key: 'bar',
                data: { value: 'something' },
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapRemoveOp({
                objectId: sampleMapObjectId,
                key: 'foo',
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapSetOp({
                objectId: sampleMapObjectId,
                key: 'baz',
                data: { value: 'something' },
              }),
            );

            await liveObjectsHelper.stateRequest(
              channelName,
              liveObjectsHelper.mapRemoveOp({
                objectId: sampleMapObjectId,
                key: 'bar',
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          description: 'can unsubscribe from LiveCounter updates via returned "unsubscribe" callback',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            let callbackCalled = 0;
            const subscriptionPromise = new Promise((resolve) => {
              const { unsubscribe } = counter.subscribe(() => {
                callbackCalled++;
                // unsubscribe from future updates after the first call
                unsubscribe();
                resolve();
              });
            });

            const increments = 3;
            for (let i = 0; i < increments; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.counterIncOp({
                  objectId: sampleCounterObjectId,
                  amount: 1,
                }),
              );
            }

            await subscriptionPromise;

            expect(counter.value()).to.equal(3, 'Check counter has final expected value after all increments');
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can unsubscribe from LiveCounter updates via LiveCounter.unsubscribe() call',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            let callbackCalled = 0;
            const subscriptionPromise = new Promise((resolve) => {
              const listener = () => {
                callbackCalled++;
                // unsubscribe from future updates after the first call
                counter.unsubscribe(listener);
                resolve();
              };

              counter.subscribe(listener);
            });

            const increments = 3;
            for (let i = 0; i < increments; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.counterIncOp({
                  objectId: sampleCounterObjectId,
                  amount: 1,
                }),
              );
            }

            await subscriptionPromise;

            expect(counter.value()).to.equal(3, 'Check counter has final expected value after all increments');
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can remove all LiveCounter update listeners via LiveCounter.unsubscribeAll() call',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            const callbacks = 3;
            const callbacksCalled = new Array(callbacks).fill(0);
            const subscriptionPromises = [];

            for (let i = 0; i < callbacks; i++) {
              const promise = new Promise((resolve) => {
                counter.subscribe(() => {
                  callbacksCalled[i]++;
                  resolve();
                });
              });
              subscriptionPromises.push(promise);
            }

            const increments = 3;
            for (let i = 0; i < increments; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.counterIncOp({
                  objectId: sampleCounterObjectId,
                  amount: 1,
                }),
              );

              if (i === 0) {
                // unsub all after first operation
                counter.unsubscribeAll();
              }
            }

            await Promise.all(subscriptionPromises);

            expect(counter.value()).to.equal(3, 'Check counter has final expected value after all increments');
            callbacksCalled.forEach((x) => expect(x).to.equal(1, 'Check subscription callbacks were called once each'));
          },
        },

        {
          description: 'can unsubscribe from LiveMap updates via returned "unsubscribe" callback',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            let callbackCalled = 0;
            const subscriptionPromise = new Promise((resolve) => {
              const { unsubscribe } = map.subscribe(() => {
                callbackCalled++;
                // unsubscribe from future updates after the first call
                unsubscribe();
                resolve();
              });
            });

            const mapSets = 3;
            for (let i = 0; i < mapSets; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.mapSetOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  data: { value: 'exists' },
                }),
              );
            }

            await subscriptionPromise;

            for (let i = 0; i < mapSets; i++) {
              expect(map.get(`foo-${i}`)).to.equal(
                'exists',
                `Check map has value for key "foo-${i}" after all map sets`,
              );
            }
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can unsubscribe from LiveMap updates via LiveMap.unsubscribe() call',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            let callbackCalled = 0;
            const subscriptionPromise = new Promise((resolve) => {
              const listener = () => {
                callbackCalled++;
                // unsubscribe from future updates after the first call
                map.unsubscribe(listener);
                resolve();
              };

              map.subscribe(listener);
            });

            const mapSets = 3;
            for (let i = 0; i < mapSets; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.mapSetOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  data: { value: 'exists' },
                }),
              );
            }

            await subscriptionPromise;

            for (let i = 0; i < mapSets; i++) {
              expect(map.get(`foo-${i}`)).to.equal(
                'exists',
                `Check map has value for key "foo-${i}" after all map sets`,
              );
            }
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can remove all LiveMap update listeners via LiveMap.unsubscribeAll() call',
          action: async (ctx) => {
            const { root, liveObjectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const callbacks = 3;
            const callbacksCalled = new Array(callbacks).fill(0);
            const subscriptionPromises = [];

            for (let i = 0; i < callbacks; i++) {
              const promise = new Promise((resolve) => {
                map.subscribe(() => {
                  callbacksCalled[i]++;
                  resolve();
                });
              });
              subscriptionPromises.push(promise);
            }

            const mapSets = 3;
            for (let i = 0; i < mapSets; i++) {
              await liveObjectsHelper.stateRequest(
                channelName,
                liveObjectsHelper.mapSetOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  data: { value: 'exists' },
                }),
              );

              if (i === 0) {
                // unsub all after first operation
                map.unsubscribeAll();
              }
            }

            await Promise.all(subscriptionPromises);

            for (let i = 0; i < mapSets; i++) {
              expect(map.get(`foo-${i}`)).to.equal(
                'exists',
                `Check map has value for key "foo-${i}" after all map sets`,
              );
            }
            callbacksCalled.forEach((x) => expect(x).to.equal(1, 'Check subscription callbacks were called once each'));
          },
        },
      ];

      for (const scenario of subscriptionCallbacksScenarios) {
        if (scenario.skip === true) {
          continue;
        }

        /** @nospec */
        it(scenario.description, async function () {
          const helper = this.test.helper;
          const liveObjectsHelper = new LiveObjectsHelper(helper);
          const client = RealtimeWithLiveObjects(helper);

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            const channelName = scenario.description;
            const channel = client.channels.get(channelName, channelOptionsWithLiveObjects());
            const liveObjects = channel.liveObjects;

            await channel.attach();
            const root = await liveObjects.getRoot();

            const sampleMapKey = 'sampleMap';
            const sampleCounterKey = 'sampleCounter';

            // prepare map and counter objects for use by the scenario
            const { objectId: sampleMapObjectId } = await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: sampleMapKey,
              createOp: liveObjectsHelper.mapCreateOp(),
            });
            const { objectId: sampleCounterObjectId } = await liveObjectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: sampleCounterKey,
              createOp: liveObjectsHelper.counterCreateOp(),
            });

            await scenario.action({
              root,
              liveObjectsHelper,
              channelName,
              channel,
              sampleMapKey,
              sampleMapObjectId,
              sampleCounterKey,
              sampleCounterObjectId,
            });
          }, client);
        });
      }
    });

    /** @nospec */
    it('can attach to channel with LiveObjects state modes', async function () {
      const helper = this.test.helper;
      const client = helper.AblyRealtime();

      await helper.monitorConnectionThenCloseAndFinish(async () => {
        const liveObjectsModes = ['state_subscribe', 'state_publish'];
        const channelOptions = { modes: liveObjectsModes };
        const channel = client.channels.get('channel', channelOptions);

        await channel.attach();

        helper.recordPrivateApi('read.channel.channelOptions');
        expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check expected channel options');
        expect(channel.modes).to.deep.equal(liveObjectsModes, 'Check expected modes');
      }, client);
    });
  });
});
