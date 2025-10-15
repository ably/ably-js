'use strict';

define(['ably', 'shared_helper', 'chai', 'objects', 'objects_helper'], function (
  Ably,
  Helper,
  chai,
  ObjectsPlugin,
  ObjectsHelper,
) {
  const expect = chai.expect;
  const BufferUtils = Ably.Realtime.Platform.BufferUtils;
  const Utils = Ably.Realtime.Utils;
  const MessageEncoding = Ably.Realtime._MessageEncoding;
  const createPM = Ably.makeProtocolMessageFromDeserialized({ ObjectsPlugin });
  const objectsFixturesChannel = 'objects_fixtures';
  const nextTick = Ably.Realtime.Platform.Config.nextTick;
  const gcIntervalOriginal = ObjectsPlugin.RealtimeObject._DEFAULTS.gcInterval;

  function RealtimeWithObjects(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { Objects: ObjectsPlugin } });
  }

  function channelOptionsWithObjects(options) {
    return {
      ...options,
      modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'],
    };
  }

  function expectInstanceOf(object, className, msg) {
    // esbuild changes the name for classes with static method to include an underscore as prefix.
    // so LiveMap becomes _LiveMap. we account for it here.
    expect(object.constructor.name).to.match(new RegExp(`_?${className}`), msg);
  }

  function forScenarios(thisInDescribe, scenarios, testFn) {
    for (const scenario of scenarios) {
      if (scenario.allTransportsAndProtocols) {
        Helper.testOnAllTransportsAndProtocols(
          thisInDescribe,
          scenario.description,
          function (options, channelName) {
            return async function () {
              const helper = this.test.helper;
              await testFn(helper, scenario, options, channelName);
            };
          },
          scenario.skip,
          scenario.only,
        );
      } else {
        const itFn = scenario.skip ? it.skip : scenario.only ? it.only : it;

        itFn(scenario.description, async function () {
          const helper = this.test.helper;
          await testFn(helper, scenario, {}, scenario.description);
        });
      }
    }
  }

  function lexicoTimeserial(seriesId, timestamp, counter, index) {
    const paddedTimestamp = timestamp.toString().padStart(14, '0');
    const paddedCounter = counter.toString().padStart(3, '0');
    const paddedIndex = index != null ? index.toString().padStart(3, '0') : undefined;

    // Example:
    //
    //	01726585978590-001@abcdefghij:001
    //	|____________| |_| |________| |_|
    //	      |         |        |     |
    //	timestamp   counter  seriesId  idx
    return `${paddedTimestamp}-${paddedCounter}@${seriesId}` + (paddedIndex ? `:${paddedIndex}` : '');
  }

  async function expectToThrowAsync(fn, errorStr, conditions) {
    const { withCode } = conditions ?? {};

    let savedError;
    try {
      await fn();
    } catch (error) {
      expect(error.message).to.have.string(errorStr);
      if (withCode != null) expect(error.code).to.equal(withCode);
      savedError = error;
    }
    expect(savedError, 'Expected async function to throw an error').to.exist;

    return savedError;
  }

  function objectMessageFromValues(values) {
    return ObjectsPlugin.ObjectMessage.fromValues(values, Utils, MessageEncoding);
  }

  async function waitForMapKeyUpdate(map, key) {
    return new Promise((resolve) => {
      const { unsubscribe } = map.subscribe(({ update }) => {
        if (update[key]) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  async function waitForCounterUpdate(counter) {
    return new Promise((resolve) => {
      const { unsubscribe } = counter.subscribe(() => {
        unsubscribe();
        resolve();
      });
    });
  }

  async function waitForObjectOperation(helper, client, waitForAction) {
    return new Promise((resolve, reject) => {
      helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
      const transport = client.connection.connectionManager.activeProtocol.getTransport();
      const onProtocolMessageOriginal = transport.onProtocolMessage;

      helper.recordPrivateApi('replace.transport.onProtocolMessage');
      transport.onProtocolMessage = function (message) {
        try {
          helper.recordPrivateApi('call.transport.onProtocolMessage');
          onProtocolMessageOriginal.call(transport, message);

          if (message.action === 19 && message.state[0]?.operation?.action === waitForAction) {
            helper.recordPrivateApi('replace.transport.onProtocolMessage');
            transport.onProtocolMessage = onProtocolMessageOriginal;
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  async function waitForObjectSync(helper, client) {
    return new Promise((resolve, reject) => {
      helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
      const transport = client.connection.connectionManager.activeProtocol.getTransport();
      const onProtocolMessageOriginal = transport.onProtocolMessage;

      helper.recordPrivateApi('replace.transport.onProtocolMessage');
      transport.onProtocolMessage = function (message) {
        try {
          helper.recordPrivateApi('call.transport.onProtocolMessage');
          onProtocolMessageOriginal.call(transport, message);

          if (message.action === 20) {
            helper.recordPrivateApi('replace.transport.onProtocolMessage');
            transport.onProtocolMessage = onProtocolMessageOriginal;
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  /**
   * The channel with fixture data may not yet be populated by REST API requests made by ObjectsHelper.
   * This function waits for a channel to have all keys set.
   */
  async function waitFixtureChannelIsReady(client) {
    const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
    const expectedKeys = ObjectsHelper.fixtureRootKeys();

    await channel.attach();
    const root = await channel.object.get();

    await Promise.all(expectedKeys.map((key) => (root.get(key) ? undefined : waitForMapKeyUpdate(root, key))));
  }

  describe('realtime/objects', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);

      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }

        new ObjectsHelper(helper)
          .initForChannel(objectsFixturesChannel)
          .then(done)
          .catch((err) => done(err));
      });
    });

    describe('Realtime without Objects plugin', () => {
      /** @nospec */
      it("throws an error when attempting to access the channel's `object` property", async function () {
        const helper = this.test.helper;
        const client = helper.AblyRealtime({ autoConnect: false });
        const channel = client.channels.get('channel');
        expect(() => channel.object).to.throw('Objects plugin not provided');
      });

      /** @nospec */
      it(`doesn't break when it receives an OBJECT ProtocolMessage`, async function () {
        const helper = this.test.helper;
        const objectsHelper = new ObjectsHelper(helper);
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            // inject OBJECT message that should be ignored and not break anything without the plugin
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel: testChannel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'stringKey', data: { string: 'stringValue' } })],
            });

            const publishChannel = publishClient.channels.get('channel');
            await publishChannel.publish(null, 'test');

            // regular message subscriptions should still work after processing OBJECT_SYNC message without the plugin
            await receivedMessagePromise;
          }, publishClient);
        }, testClient);
      });

      /** @nospec */
      it(`doesn't break when it receives an OBJECT_SYNC ProtocolMessage`, async function () {
        const helper = this.test.helper;
        const objectsHelper = new ObjectsHelper(helper);
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            // inject OBJECT_SYNC message that should be ignored and not break anything without the plugin
            await objectsHelper.processObjectStateMessageOnChannel({
              channel: testChannel,
              syncSerial: 'serial:',
              state: [
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                }),
              ],
            });

            const publishChannel = publishClient.channels.get('channel');
            await publishChannel.publish(null, 'test');

            // regular message subscriptions should still work after processing OBJECT_SYNC message without the plugin
            await receivedMessagePromise;
          }, publishClient);
        }, testClient);
      });
    });

    describe('Realtime with Objects plugin', () => {
      /** @nospec */
      it("returns RealtimeObject class instance when accessing channel's `object` property", async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper, { autoConnect: false });
        const channel = client.channels.get('channel');
        expectInstanceOf(channel.object, 'RealtimeObject');
      });

      /** @nospec */
      it('RealtimeObject.get() returns LiveMap instance', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          const root = await channel.object.get();

          expectInstanceOf(root, 'LiveMap', 'root object should be of LiveMap type');
        }, client);
      });

      /** @nospec */
      it('RealtimeObject.get() returns LiveObject with id "root"', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          const root = await channel.object.get();

          helper.recordPrivateApi('call.LiveObject.getObjectId');
          expect(root.getObjectId()).to.equal('root', 'root object should have an object id "root"');
        }, client);
      });

      /** @nospec */
      it('RealtimeObject.get() returns empty root when no objects exist on a channel', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          const root = await channel.object.get();

          expect(root.size()).to.equal(0, 'Check root has no keys');
        }, client);
      });

      /** @nospec */
      it('RealtimeObject.get() waits for initial OBJECT_SYNC to be completed before resolving', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          const getPromise = channel.object.get();

          let getResolved = false;
          getPromise.then(() => {
            getResolved = true;
          });

          // give a chance for RealtimeObject.get() to resolve and proc its handler. it should not
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));
          expect(getResolved, 'Check RealtimeObject.get() is not resolved until OBJECT_SYNC sequence is completed').to
            .be.false;

          await channel.attach();

          // should resolve eventually after attach
          await getPromise;
        }, client);
      });

      /** @nospec */
      it('RealtimeObject.get() resolves immediately when OBJECT_SYNC sequence is completed', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          // wait for sync sequence to complete by accessing root for the first time
          await channel.object.get();

          let resolvedImmediately = false;
          channel.object.get().then(() => {
            resolvedImmediately = true;
          });

          // wait for next tick for RealtimeObject.get() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(resolvedImmediately, 'Check RealtimeObject.get() is resolved on next tick').to.be.true;
        }, client);
      });

      /** @nospec */
      it('RealtimeObject.get() waits for OBJECT_SYNC with empty cursor before resolving', async function () {
        const helper = this.test.helper;
        const objectsHelper = new ObjectsHelper(helper);
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          // wait for initial sync sequence to complete
          await channel.object.get();

          // inject OBJECT_SYNC message to emulate start of a new sequence
          await objectsHelper.processObjectStateMessageOnChannel({
            channel,
            // have cursor so client awaits for additional OBJECT_SYNC messages
            syncSerial: 'serial:cursor',
          });

          let getResolved = false;
          let root;
          channel.object.get().then((value) => {
            getResolved = true;
            root = value;
          });

          // wait for next tick to check that RealtimeObject.get() promise handler didn't proc
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getResolved, 'Check RealtimeObject.get() is not resolved while OBJECT_SYNC is in progress').to.be
            .false;

          // inject final OBJECT_SYNC message
          await objectsHelper.processObjectStateMessageOnChannel({
            channel,
            // no cursor to indicate the end of OBJECT_SYNC messages
            syncSerial: 'serial:',
            state: [
              objectsHelper.mapObject({
                objectId: 'root',
                siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                initialEntries: { key: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { number: 1 } } },
              }),
            ],
          });

          // wait for next tick for RealtimeObject.get() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getResolved, 'Check RealtimeObject.get() is resolved when OBJECT_SYNC sequence has ended').to.be.true;
          expect(root.get('key')).to.equal(1, 'Check new root after OBJECT_SYNC sequence has expected key');
        }, client);
      });

      function checkKeyDataOnMap({ helper, key, keyData, mapObj, msg }) {
        if (keyData.data.bytes != null) {
          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(BufferUtils.areBuffersEqual(mapObj.get(key), BufferUtils.base64Decode(keyData.data.bytes)), msg).to.be
            .true;
        } else if (keyData.data.json != null) {
          const expectedObject = JSON.parse(keyData.data.json);
          expect(mapObj.get(key)).to.deep.equal(expectedObject, msg);
        } else {
          const expectedValue = keyData.data.string ?? keyData.data.number ?? keyData.data.boolean;
          expect(mapObj.get(key)).to.equal(expectedValue, msg);
        }
      }

      function checkKeyDataOnPathObject({ helper, key, keyData, mapObj, pathObject, msg }) {
        // should check that both mapObj and pathObject return the same value for the key
        // and it matches the expected value from keyData
        const compareMsg = `Check PathObject and LiveMap have the same value for "${keyData.key}" key`;

        if (keyData.data.bytes != null) {
          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(
            BufferUtils.areBuffersEqual(pathObject.get(key).value(), BufferUtils.base64Decode(keyData.data.bytes)),
            msg,
          ).to.be.true;

          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(BufferUtils.areBuffersEqual(pathObject.get(key).value(), mapObj.get(key)), compareMsg).to.be.true;
        } else if (keyData.data.json != null) {
          const expectedObject = JSON.parse(keyData.data.json);
          expect(pathObject.get(key).value()).to.deep.equal(expectedObject, msg);
          expect(pathObject.get(key).value()).to.deep.equal(mapObj.get(key), compareMsg);
        } else {
          const expectedValue = keyData.data.string ?? keyData.data.number ?? keyData.data.boolean;
          expect(pathObject.get(key).value()).to.equal(expectedValue, msg);
          expect(pathObject.get(key).value()).to.equal(mapObj.get(key), compareMsg);
        }
      }

      function checkKeyDataOnInstance({ helper, key, keyData, instance, msg }) {
        const entryInstance = instance.get(key);

        expect(entryInstance, `Check instance exists for "${keyData.key}"`).to.exist;
        expectInstanceOf(entryInstance, 'DefaultInstance', `Check instance for "${keyData.key}" is DefaultInstance`);

        if (keyData.data.bytes != null) {
          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(BufferUtils.areBuffersEqual(entryInstance.value(), BufferUtils.base64Decode(keyData.data.bytes)), msg)
            .to.be.true;
        } else if (keyData.data.json != null) {
          const expectedObject = JSON.parse(keyData.data.json);
          expect(entryInstance.value()).to.deep.equal(expectedObject, msg);
        } else {
          const expectedValue = keyData.data.string ?? keyData.data.number ?? keyData.data.boolean;
          expect(entryInstance.value()).to.equal(expectedValue, msg);
        }
      }

      const primitiveKeyData = [
        { key: 'stringKey', data: { string: 'stringValue' } },
        { key: 'emptyStringKey', data: { string: '' } },
        { key: 'bytesKey', data: { bytes: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9' } },
        { key: 'emptyBytesKey', data: { bytes: '' } },
        { key: 'maxSafeIntegerKey', data: { number: Number.MAX_SAFE_INTEGER } },
        { key: 'negativeMaxSafeIntegerKey', data: { number: -Number.MAX_SAFE_INTEGER } },
        { key: 'numberKey', data: { number: 1 } },
        { key: 'zeroKey', data: { number: 0 } },
        { key: 'trueKey', data: { boolean: true } },
        { key: 'falseKey', data: { boolean: false } },
        { key: 'objectKey', data: { json: JSON.stringify({ foo: 'bar' }) } },
        { key: 'arrayKey', data: { json: JSON.stringify(['foo', 'bar', 'baz']) } },
      ];
      const primitiveMapsFixtures = [
        { name: 'emptyMap' },
        {
          name: 'valuesMap',
          entries: primitiveKeyData.reduce((acc, v) => {
            acc[v.key] = { data: v.data };
            return acc;
          }, {}),
          restData: primitiveKeyData.reduce((acc, v) => {
            acc[v.key] = v.data;
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

      const objectSyncSequenceScenarios = [
        {
          allTransportsAndProtocols: true,
          description: 'OBJECT_SYNC sequence builds object tree on channel attachment',
          action: async (ctx) => {
            const { client } = ctx;

            await waitFixtureChannelIsReady(client);

            const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());

            await channel.attach();
            const root = await channel.object.get();

            const counterKeys = ['emptyCounter', 'initialValueCounter', 'referencedCounter'];
            const mapKeys = ['emptyMap', 'referencedMap', 'valuesMap'];
            const rootKeysCount = counterKeys.length + mapKeys.length;

            expect(root, 'Check RealtimeObject.get() is resolved when OBJECT_SYNC sequence ends').to.exist;
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
              'maxSafeIntegerKey',
              'negativeMaxSafeIntegerKey',
              'numberKey',
              'zeroKey',
              'trueKey',
              'falseKey',
              'objectKey',
              'arrayKey',
              'mapKey',
            ];
            expect(valuesMap.size()).to.equal(valueMapKeys.length, 'Check nested map has correct number of keys');
            valueMapKeys.forEach((key) => {
              const value = valuesMap.get(key);
              expect(value, `Check value at key="${key}" in nested map exists`).to.exist;
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'OBJECT_SYNC sequence builds object tree with all operations applied',
          action: async (ctx) => {
            const { root, realtimeObject, helper, clientOptions, channelName } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);

            // MAP_CREATE
            const map = await realtimeObject.createMap({ shouldStay: 'foo', shouldDelete: 'bar' });
            // COUNTER_CREATE
            const counter = await realtimeObject.createCounter(1);

            await Promise.all([root.set('map', map), root.set('counter', counter), objectsCreatedPromise]);

            const operationsAppliedPromise = Promise.all([
              waitForMapKeyUpdate(map, 'anotherKey'),
              waitForMapKeyUpdate(map, 'shouldDelete'),
              waitForCounterUpdate(counter),
            ]);

            await Promise.all([
              // MAP_SET
              map.set('anotherKey', 'baz'),
              // MAP_REMOVE
              map.remove('shouldDelete'),
              // COUNTER_INC
              counter.increment(10),
              operationsAppliedPromise,
            ]);

            // create a new client and check it syncs with the aggregated data
            const client2 = RealtimeWithObjects(helper, clientOptions);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              const channel2 = client2.channels.get(channelName, channelOptionsWithObjects());

              await channel2.attach();
              const root2 = await channel2.object.get();

              expect(root2.get('counter'), 'Check counter exists').to.exist;
              expect(root2.get('counter').value()).to.equal(11, 'Check counter has correct value');

              expect(root2.get('map'), 'Check map exists').to.exist;
              expect(root2.get('map').size()).to.equal(2, 'Check map has correct number of keys');
              expect(root2.get('map').get('shouldStay')).to.equal(
                'foo',
                'Check map has correct value for "shouldStay" key',
              );
              expect(root2.get('map').get('anotherKey')).to.equal(
                'baz',
                'Check map has correct value for "anotherKey" key',
              );
              expect(root2.get('map').get('shouldDelete'), 'Check map does not have "shouldDelete" key').to.not.exist;
            }, client2);
          },
        },

        {
          description: 'OBJECT_SYNC sequence does not change references to existing objects',
          action: async (ctx) => {
            const { root, realtimeObject, helper, channel } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);

            const map = await realtimeObject.createMap();
            const counter = await realtimeObject.createCounter();
            await Promise.all([root.set('map', map), root.set('counter', counter), objectsCreatedPromise]);
            await channel.detach();

            // wait for the actual OBJECT_SYNC message to confirm it was received and processed
            const objectSyncPromise = waitForObjectSync(helper, channel.client);
            await channel.attach();
            await objectSyncPromise;

            const newRootRef = await channel.object.get();
            const newMapRef = newRootRef.get('map');
            const newCounterRef = newRootRef.get('counter');

            expect(newRootRef).to.equal(root, 'Check root reference is the same after OBJECT_SYNC sequence');
            expect(newMapRef).to.equal(map, 'Check map reference is the same after OBJECT_SYNC sequence');
            expect(newCounterRef).to.equal(counter, 'Check counter reference is the same after OBJECT_SYNC sequence');
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveCounter is initialized with initial value from OBJECT_SYNC sequence',
          action: async (ctx) => {
            const { client } = ctx;

            await waitFixtureChannelIsReady(client);

            const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());

            await channel.attach();
            const root = await channel.object.get();

            const counters = [
              { key: 'emptyCounter', value: 0 },
              { key: 'initialValueCounter', value: 10 },
              { key: 'referencedCounter', value: 20 },
            ];

            counters.forEach((x) => {
              const counter = root.get(x.key);
              expect(counter.value()).to.equal(x.value, `Check counter at key="${x.key}" in root has correct value`);
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap is initialized with initial value from OBJECT_SYNC sequence',
          action: async (ctx) => {
            const { helper, client } = ctx;

            await waitFixtureChannelIsReady(client);

            const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());

            await channel.attach();
            const root = await channel.object.get();

            const emptyMap = root.get('emptyMap');
            expect(emptyMap.size()).to.equal(0, 'Check empty map in root has no keys');

            const referencedMap = root.get('referencedMap');
            expect(referencedMap.size()).to.equal(1, 'Check referenced map in root has correct number of keys');

            const counterFromReferencedMap = referencedMap.get('counterKey');
            expect(counterFromReferencedMap.value()).to.equal(20, 'Check nested counter has correct value');

            const valuesMap = root.get('valuesMap');
            expect(valuesMap.size()).to.equal(13, 'Check values map in root has correct number of keys');

            expect(valuesMap.get('stringKey')).to.equal('stringValue', 'Check values map has correct string value key');
            expect(valuesMap.get('emptyStringKey')).to.equal('', 'Check values map has correct empty string value key');
            helper.recordPrivateApi('call.BufferUtils.base64Decode');
            helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
            expect(
              BufferUtils.areBuffersEqual(
                valuesMap.get('bytesKey'),
                BufferUtils.base64Decode('eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9'),
              ),
              'Check values map has correct bytes value key',
            ).to.be.true;
            helper.recordPrivateApi('call.BufferUtils.base64Decode');
            helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
            expect(
              BufferUtils.areBuffersEqual(valuesMap.get('emptyBytesKey'), BufferUtils.base64Decode('')),
              'Check values map has correct empty bytes value key',
            ).to.be.true;
            expect(valuesMap.get('maxSafeIntegerKey')).to.equal(
              Number.MAX_SAFE_INTEGER,
              'Check values map has correct maxSafeIntegerKey value',
            );
            expect(valuesMap.get('negativeMaxSafeIntegerKey')).to.equal(
              -Number.MAX_SAFE_INTEGER,
              'Check values map has correct negativeMaxSafeIntegerKey value',
            );
            expect(valuesMap.get('numberKey')).to.equal(1, 'Check values map has correct number value key');
            expect(valuesMap.get('zeroKey')).to.equal(0, 'Check values map has correct zero number value key');
            expect(valuesMap.get('trueKey')).to.equal(true, `Check values map has correct 'true' value key`);
            expect(valuesMap.get('falseKey')).to.equal(false, `Check values map has correct 'false' value key`);
            expect(valuesMap.get('objectKey')).to.deep.equal(
              { foo: 'bar' },
              `Check values map has correct objectKey value`,
            );
            expect(valuesMap.get('arrayKey')).to.deep.equal(
              ['foo', 'bar', 'baz'],
              `Check values map has correct arrayKey value`,
            );

            const mapFromValuesMap = valuesMap.get('mapKey');
            expect(mapFromValuesMap.size()).to.equal(1, 'Check nested map has correct number of keys');
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap can reference the same object in their keys',
          action: async (ctx) => {
            const { client } = ctx;

            await waitFixtureChannelIsReady(client);

            const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());

            await channel.attach();
            const root = await channel.object.get();

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
          },
        },

        {
          description: 'OBJECT_SYNC sequence with "tombstone=true" for an object creates tombstoned object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            const mapId = objectsHelper.fakeMapObjectId();
            const counterId = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              // add object states with tombstone=true
              state: [
                objectsHelper.mapObject({
                  objectId: mapId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialEntries: {},
                }),
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 1,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    map: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: mapId } },
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'bar' } },
                  },
                }),
              ],
            });

            expect(
              root.get('map'),
              'Check map does not exist on root after OBJECT_SYNC with "tombstone=true" for a map object',
            ).to.not.exist;
            expect(
              root.get('counter'),
              'Check counter does not exist on root after OBJECT_SYNC with "tombstone=true" for a counter object',
            ).to.not.exist;
            // control check that OBJECT_SYNC was applied at all
            expect(root.get('foo'), 'Check property exists on root after OBJECT_SYNC').to.exist;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'OBJECT_SYNC sequence with "tombstone=true" for an object deletes existing object',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            const { objectId: counterId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp({ number: 1 }),
            });
            await counterCreatedPromise;

            expect(
              root.get('counter'),
              'Check counter exists on root before OBJECT_SYNC sequence with "tombstone=true"',
            ).to.exist;

            // inject an OBJECT_SYNC message where a counter is now tombstoned
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 1,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'bar' } },
                  },
                }),
              ],
            });

            expect(
              root.get('counter'),
              'Check counter does not exist on root after OBJECT_SYNC with "tombstone=true" for an existing counter object',
            ).to.not.exist;
            // control check that OBJECT_SYNC was applied at all
            expect(root.get('foo'), 'Check property exists on root after OBJECT_SYNC').to.exist;
          },
        },

        {
          allTransportsAndProtocols: true,
          description:
            'OBJECT_SYNC sequence with "tombstone=true" for an object triggers subscription callback for existing object',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            const { objectId: counterId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp({ number: 1 }),
            });
            await counterCreatedPromise;

            const counterSubPromise = new Promise((resolve, reject) =>
              root.get('counter').subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { amount: -1 },
                    'Check counter subscription callback is called with an expected update object after OBJECT_SYNC sequence with "tombstone=true"',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            // inject an OBJECT_SYNC message where a counter is now tombstoned
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 1,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                  },
                }),
              ],
            });

            await counterSubPromise;
          },
        },

        {
          description:
            'OBJECT_SYNC sequence with "tombstone=true" for an object sets "tombstoneAt" from "serialTimestamp"',
          action: async (ctx) => {
            const { helper, objectsHelper, channel, realtimeObject } = ctx;

            const counterId = objectsHelper.fakeCounterObjectId();
            const serialTimestamp = 1234567890;
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              serialTimestamp,
              state: [
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 1,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                  },
                }),
              ],
            });

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            const obj = realtimeObject._objectsPool.get(counterId);
            expect(obj, 'Check object added to the pool OBJECT_SYNC sequence with "tombstone=true"').to.exist;
            helper.recordPrivateApi('call.LiveObject.tombstonedAt');
            expect(obj.tombstonedAt()).to.equal(
              serialTimestamp,
              `Check object's "tombstonedAt" value is set to "serialTimestamp" from OBJECT_SYNC sequence`,
            );
          },
        },

        {
          description:
            'OBJECT_SYNC sequence with "tombstone=true" for an object sets "tombstoneAt" using local clock if missing "serialTimestamp"',
          action: async (ctx) => {
            const { helper, objectsHelper, channel, realtimeObject } = ctx;

            const tsBeforeMsg = Date.now();
            const counterId = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectStateMessageOnChannel({
              // don't provide serialTimestamp
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 1,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                  },
                }),
              ],
            });
            const tsAfterMsg = Date.now();

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            const obj = realtimeObject._objectsPool.get(counterId);
            expect(obj, 'Check object added to the pool OBJECT_SYNC sequence with "tombstone=true"').to.exist;
            helper.recordPrivateApi('call.LiveObject.tombstonedAt');
            expect(
              tsBeforeMsg <= obj.tombstonedAt() <= tsAfterMsg,
              `Check object's "tombstonedAt" value is set using local clock if no "serialTimestamp" provided`,
            ).to.be.true;
          },
        },

        {
          description:
            'OBJECT_SYNC sequence with "tombstone=true" for a map entry sets "tombstoneAt" from "serialTimestamp"',
          action: async (ctx) => {
            const { helper, root, objectsHelper, channel } = ctx;

            const serialTimestamp = 1234567890;
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    foo: {
                      timeserial: lexicoTimeserial('aaa', 0, 0),
                      data: { string: 'bar' },
                      tombstone: true,
                      serialTimestamp,
                    },
                  },
                }),
              ],
            });

            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            const mapEntry = root._dataRef.data.get('foo');
            expect(
              mapEntry,
              'Check map entry is added to root internal data after OBJECT_SYNC sequence with "tombstone=true" for a map entry',
            ).to.exist;
            expect(mapEntry.tombstonedAt).to.equal(
              serialTimestamp,
              `Check map entry's "tombstonedAt" value is set to "serialTimestamp" from OBJECT_SYNC sequence`,
            );
          },
        },

        {
          description:
            'OBJECT_SYNC sequence with "tombstone=true" for a map entry sets "tombstoneAt" using local clock if missing "serialTimestamp"',
          action: async (ctx) => {
            const { helper, root, objectsHelper, channel } = ctx;

            const tsBeforeMsg = Date.now();
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    foo: {
                      timeserial: lexicoTimeserial('aaa', 0, 0),
                      data: { string: 'bar' },
                      tombstone: true,
                      // don't provide serialTimestamp
                    },
                  },
                }),
              ],
            });
            const tsAfterMsg = Date.now();

            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            const mapEntry = root._dataRef.data.get('foo');
            expect(
              mapEntry,
              'Check map entry is added to root internal data after OBJECT_SYNC sequence with "tombstone=true" for a map entry',
            ).to.exist;
            expect(
              tsBeforeMsg <= mapEntry.tombstonedAt <= tsAfterMsg,
              `Check map entry's "tombstonedAt" value is set using local clock if no "serialTimestamp" provided`,
            ).to.be.true;
          },
        },
      ];

      const applyOperationsScenarios = [
        {
          allTransportsAndProtocols: true,
          description: 'can apply MAP_CREATE with primitives object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, helper } = ctx;

            // Objects public API allows us to check value of objects we've created based on MAP_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the MAP_CREATE op.

            // check no maps exist on root
            primitiveMapsFixtures.forEach((fixture) => {
              const key = fixture.name;
              expect(root.get(key), `Check "${key}" key doesn't exist on root before applying MAP_CREATE ops`).to.not
                .exist;
            });

            const mapsCreatedPromise = Promise.all(primitiveMapsFixtures.map((x) => waitForMapKeyUpdate(root, x.name)));
            // create new maps and set on root
            await Promise.all(
              primitiveMapsFixtures.map((fixture) =>
                objectsHelper.createAndSetOnMap(channelName, {
                  mapObjectId: 'root',
                  key: fixture.name,
                  createOp: objectsHelper.mapCreateRestOp({ data: fixture.restData }),
                }),
              ),
            );
            await mapsCreatedPromise;

            // check created maps
            primitiveMapsFixtures.forEach((fixture) => {
              const mapKey = fixture.name;
              const mapObj = root.get(mapKey);

              // check all maps exist on root
              expect(mapObj, `Check map at "${mapKey}" key in root exists`).to.exist;
              expectInstanceOf(mapObj, 'LiveMap', `Check map at "${mapKey}" key in root is of type LiveMap`);

              // check primitive maps have correct values
              expect(mapObj.size()).to.equal(
                Object.keys(fixture.entries ?? {}).length,
                `Check map "${mapKey}" has correct number of keys`,
              );

              Object.entries(fixture.entries ?? {}).forEach(([key, keyData]) => {
                checkKeyDataOnMap({
                  helper,
                  key,
                  keyData,
                  mapObj,
                  msg: `Check map "${mapKey}" has correct value for "${key}" key`,
                });
              });
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply MAP_CREATE with object ids object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;
            const withReferencesMapKey = 'withReferencesMap';

            // Objects public API allows us to check value of objects we've created based on MAP_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the MAP_CREATE op.

            // check map does not exist on root
            expect(
              root.get(withReferencesMapKey),
              `Check "${withReferencesMapKey}" key doesn't exist on root before applying MAP_CREATE ops`,
            ).to.not.exist;

            const mapCreatedPromise = waitForMapKeyUpdate(root, withReferencesMapKey);
            // create map with references. need to create referenced objects first to obtain their object ids
            const { objectId: referencedMapObjectId } = await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapCreateRestOp({ data: { stringKey: { string: 'stringValue' } } }),
            );
            const { objectId: referencedCounterObjectId } = await objectsHelper.operationRequest(
              channelName,
              objectsHelper.counterCreateRestOp({ number: 1 }),
            );
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: withReferencesMapKey,
              createOp: objectsHelper.mapCreateRestOp({
                data: {
                  mapReference: { objectId: referencedMapObjectId },
                  counterReference: { objectId: referencedCounterObjectId },
                },
              }),
            });
            await mapCreatedPromise;

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
          description:
            'MAP_CREATE object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // need to use multiple maps as MAP_CREATE op can only be applied once to a map object
            const mapIds = [
              objectsHelper.fakeMapObjectId(),
              objectsHelper.fakeMapObjectId(),
              objectsHelper.fakeMapObjectId(),
              objectsHelper.fakeMapObjectId(),
              objectsHelper.fakeMapObjectId(),
            ];
            await Promise.all(
              mapIds.map(async (mapId, i) => {
                // send a MAP_SET op first to create a zero-value map with forged site timeserials vector (from the op), and set it on a root.
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('bbb', 1, 0),
                  siteCode: 'bbb',
                  state: [objectsHelper.mapSetOp({ objectId: mapId, key: 'foo', data: { string: 'bar' } })],
                });
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: mapId, data: { objectId: mapId } })],
                });
              }),
            );

            // inject operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // existing site, earlier CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, same CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, later CGO, applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // different site, earlier CGO, applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // different site, later CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [
                  objectsHelper.mapCreateOp({
                    objectId: mapIds[i],
                    entries: {
                      baz: { timeserial: serial, data: { string: 'qux' } },
                    },
                  }),
                ],
              });
            }

            // check only operations with correct timeserials were applied
            const expectedMapValues = [
              { foo: 'bar' },
              { foo: 'bar' },
              { foo: 'bar', baz: 'qux' }, // applied MAP_CREATE
              { foo: 'bar', baz: 'qux' }, // applied MAP_CREATE
              { foo: 'bar', baz: 'qux' }, // applied MAP_CREATE
            ];

            for (const [i, mapId] of mapIds.entries()) {
              const expectedMapValue = expectedMapValues[i];
              const expectedKeysCount = Object.keys(expectedMapValue).length;

              expect(root.get(mapId).size()).to.equal(
                expectedKeysCount,
                `Check map #${i + 1} has expected number of keys after MAP_CREATE ops`,
              );
              Object.entries(expectedMapValue).forEach(([key, value]) => {
                expect(root.get(mapId).get(key)).to.equal(
                  value,
                  `Check map #${i + 1} has expected value for "${key}" key after MAP_CREATE ops`,
                );
              });
            }
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply MAP_SET with primitives object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, helper } = ctx;

            // check root is empty before ops
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get(keyData.key),
                `Check "${keyData.key}" key doesn't exist on root before applying MAP_SET ops`,
              ).to.not.exist;
            });

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            // apply MAP_SET ops
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                objectsHelper.operationRequest(
                  channelName,
                  objectsHelper.mapSetRestOp({
                    objectId: 'root',
                    key: keyData.key,
                    value: keyData.data,
                  }),
                ),
              ),
            );
            await keysUpdatedPromise;

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnMap({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                msg: `Check root has correct value for "${keyData.key}" key after MAP_SET op`,
              });
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply MAP_SET with object ids object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            // check no object ids are set on root
            expect(
              root.get('keyToCounter'),
              `Check "keyToCounter" key doesn't exist on root before applying MAP_SET ops`,
            ).to.not.exist;
            expect(root.get('keyToMap'), `Check "keyToMap" key doesn't exist on root before applying MAP_SET ops`).to
              .not.exist;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'keyToCounter'),
              waitForMapKeyUpdate(root, 'keyToMap'),
            ]);
            // create new objects and set on root
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'keyToCounter',
              createOp: objectsHelper.counterCreateRestOp({ number: 1 }),
            });

            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'keyToMap',
              createOp: objectsHelper.mapCreateRestOp({
                data: {
                  stringKey: { string: 'stringValue' },
                },
              }),
            });
            await objectsCreatedPromise;

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
          description:
            'MAP_SET object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // create new map and set it on a root with forged timeserials
            const mapId = objectsHelper.fakeMapObjectId();
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 1, 0),
              siteCode: 'bbb',
              state: [
                objectsHelper.mapCreateOp({
                  objectId: mapId,
                  entries: {
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                  },
                }),
              ],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'map', data: { objectId: mapId } })],
            });

            // inject operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // existing site, earlier site CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, same site CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, later site CGO, applied, site timeserials updated
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, same site CGO (updated from last op), not applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // different site, earlier entry CGO, not applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // different site, later entry CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.mapSetOp({ objectId: mapId, key: `foo${i + 1}`, data: { string: 'baz' } })],
              });
            }

            // check only operations with correct timeserials were applied
            const expectedMapKeys = [
              { key: 'foo1', value: 'bar' },
              { key: 'foo2', value: 'bar' },
              { key: 'foo3', value: 'baz' }, // updated
              { key: 'foo4', value: 'bar' },
              { key: 'foo5', value: 'bar' },
              { key: 'foo6', value: 'baz' }, // updated
            ];

            expectedMapKeys.forEach(({ key, value }) => {
              expect(root.get('map').get(key)).to.equal(
                value,
                `Check "${key}" key on map has expected value after MAP_SET ops`,
              );
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply MAP_REMOVE object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;
            const mapKey = 'map';

            const mapCreatedPromise = waitForMapKeyUpdate(root, mapKey);
            // create new map and set on root
            const { objectId: mapObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: mapKey,
              createOp: objectsHelper.mapCreateRestOp({
                data: {
                  shouldStay: { string: 'foo' },
                  shouldDelete: { string: 'bar' },
                },
              }),
            });
            await mapCreatedPromise;

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

            const keyRemovedPromise = waitForMapKeyUpdate(map, 'shouldDelete');
            // send MAP_REMOVE op
            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapRemoveRestOp({
                objectId: mapObjectId,
                key: 'shouldDelete',
              }),
            );
            await keyRemovedPromise;

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
          description:
            'MAP_REMOVE object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // create new map and set it on a root with forged timeserials
            const mapId = objectsHelper.fakeMapObjectId();
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 1, 0),
              siteCode: 'bbb',
              state: [
                objectsHelper.mapCreateOp({
                  objectId: mapId,
                  entries: {
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                  },
                }),
              ],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'map', data: { objectId: mapId } })],
            });

            // inject operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // existing site, earlier site CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, same site CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, later site CGO, applied, site timeserials updated
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, same site CGO (updated from last op), not applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // different site, earlier entry CGO, not applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // different site, later entry CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.mapRemoveOp({ objectId: mapId, key: `foo${i + 1}` })],
              });
            }

            // check only operations with correct timeserials were applied
            const expectedMapKeys = [
              { key: 'foo1', exists: true },
              { key: 'foo2', exists: true },
              { key: 'foo3', exists: false }, // removed
              { key: 'foo4', exists: true },
              { key: 'foo5', exists: true },
              { key: 'foo6', exists: false }, // removed
            ];

            expectedMapKeys.forEach(({ key, exists }) => {
              if (exists) {
                expect(root.get('map').get(key), `Check "${key}" key on map still exists after MAP_REMOVE ops`).to
                  .exist;
              } else {
                expect(root.get('map').get(key), `Check "${key}" key on map does not exist after MAP_REMOVE ops`).to.not
                  .exist;
              }
            });
          },
        },

        {
          description: 'MAP_REMOVE for a map entry sets "tombstoneAt" from "serialTimestamp"',
          action: async (ctx) => {
            const { helper, channel, root, objectsHelper } = ctx;

            const serialTimestamp = 1234567890;
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              serialTimestamp,
              siteCode: 'aaa',
              state: [objectsHelper.mapRemoveOp({ objectId: 'root', key: 'foo' })],
            });

            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            const mapEntry = root._dataRef.data.get('foo');
            expect(mapEntry, 'Check map entry is added to root internal data after MAP_REMOVE for a map entry').to
              .exist;
            expect(mapEntry.tombstonedAt).to.equal(
              serialTimestamp,
              `Check map entry's "tombstonedAt" value is set to "serialTimestamp" from MAP_REMOVE`,
            );
          },
        },

        {
          description: 'MAP_REMOVE for a map entry sets "tombstoneAt" using local clock if missing "serialTimestamp"',
          action: async (ctx) => {
            const { helper, channel, root, objectsHelper } = ctx;

            const tsBeforeMsg = Date.now();
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              // don't provide serialTimestamp
              siteCode: 'aaa',
              state: [objectsHelper.mapRemoveOp({ objectId: 'root', key: 'foo' })],
            });
            const tsAfterMsg = Date.now();

            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            const mapEntry = root._dataRef.data.get('foo');
            expect(mapEntry, 'Check map entry is added to root internal data after MAP_REMOVE for a map entry').to
              .exist;
            expect(
              tsBeforeMsg <= mapEntry.tombstonedAt <= tsAfterMsg,
              `Check map entry's "tombstonedAt" value is set using local clock if no "serialTimestamp" provided`,
            ).to.be.true;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply COUNTER_CREATE object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            // Objects public API allows us to check value of objects we've created based on COUNTER_CREATE ops
            // if we assign those objects to another map (root for example), as there is no way to access those objects from the internal pool directly.
            // however, in this test we put heavy focus on the data that is being created as the result of the COUNTER_CREATE op.

            // check no counters exist on root
            countersFixtures.forEach((fixture) => {
              const key = fixture.name;
              expect(root.get(key), `Check "${key}" key doesn't exist on root before applying COUNTER_CREATE ops`).to
                .not.exist;
            });

            const countersCreatedPromise = Promise.all(countersFixtures.map((x) => waitForMapKeyUpdate(root, x.name)));
            // create new counters and set on root
            await Promise.all(
              countersFixtures.map((fixture) =>
                objectsHelper.createAndSetOnMap(channelName, {
                  mapObjectId: 'root',
                  key: fixture.name,
                  createOp: objectsHelper.counterCreateRestOp({ number: fixture.count }),
                }),
              ),
            );
            await countersCreatedPromise;

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
          description:
            'COUNTER_CREATE object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // need to use multiple counters as COUNTER_CREATE op can only be applied once to a counter object
            const counterIds = [
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
            ];
            await Promise.all(
              counterIds.map(async (counterId, i) => {
                // send a COUNTER_INC op first to create a zero-value counter with forged site timeserials vector (from the op), and set it on a root.
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('bbb', 1, 0),
                  siteCode: 'bbb',
                  state: [objectsHelper.counterIncOp({ objectId: counterId, amount: 1 })],
                });
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: counterId, data: { objectId: counterId } })],
                });
              }),
            );

            // inject operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // existing site, earlier CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, same CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, later CGO, applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // different site, earlier CGO, applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // different site, later CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.counterCreateOp({ objectId: counterIds[i], count: 10 })],
              });
            }

            // check only operations with correct timeserials were applied
            const expectedCounterValues = [
              1,
              1,
              11, // applied COUNTER_CREATE
              11, // applied COUNTER_CREATE
              11, // applied COUNTER_CREATE
            ];

            for (const [i, counterId] of counterIds.entries()) {
              const expectedValue = expectedCounterValues[i];

              expect(root.get(counterId).value()).to.equal(
                expectedValue,
                `Check counter #${i + 1} has expected value after COUNTER_CREATE ops`,
              );
            }
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can apply COUNTER_INC object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;
            const counterKey = 'counter';
            let expectedCounterValue = 0;

            const counterCreated = waitForMapKeyUpdate(root, counterKey);
            // create new counter and set on root
            const { objectId: counterObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: counterKey,
              createOp: objectsHelper.counterCreateRestOp({ number: expectedCounterValue }),
            });
            await counterCreated;

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
              expectedCounterValue += increment;

              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.counterIncRestOp({
                  objectId: counterObjectId,
                  number: increment,
                }),
              );
              await counterUpdatedPromise;

              expect(counter.value()).to.equal(
                expectedCounterValue,
                `Check counter at "${counterKey}" key in root has correct value after ${i + 1} COUNTER_INC ops`,
              );
            }
          },
        },

        {
          description:
            'COUNTER_INC object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // create new counter and set it on a root with forged timeserials
            const counterId = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 1, 0),
              siteCode: 'bbb',
              state: [objectsHelper.counterCreateOp({ objectId: counterId, count: 1 })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'counter', data: { objectId: counterId } })],
            });

            // inject operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // +10       existing site, earlier CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // +100      existing site, same CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // +1000     existing site, later CGO, applied, site timeserials updated
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // +10000    existing site, same CGO (updated from last op), not applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // +100000   different site, earlier CGO, applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // +1000000  different site, later CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.counterIncOp({ objectId: counterId, amount: Math.pow(10, i + 1) })],
              });
            }

            // check only operations with correct timeserials were applied
            expect(root.get('counter').value()).to.equal(
              1 + 1000 + 100000 + 1000000, // sum of passing operations and the initial value
              `Check counter has expected value after COUNTER_INC ops`,
            );
          },
        },

        {
          description: 'can apply OBJECT_DELETE object operation messages',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
            ]);
            // create initial objects and set on root
            const { objectId: mapObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            const { objectId: counterObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectsCreatedPromise;

            expect(root.get('map'), 'Check map exists on root before OBJECT_DELETE').to.exist;
            expect(root.get('counter'), 'Check counter exists on root before OBJECT_DELETE').to.exist;

            // inject OBJECT_DELETE
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: mapObjectId })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: counterObjectId })],
            });

            expect(root.get('map'), 'Check map is not accessible on root after OBJECT_DELETE').to.not.exist;
            expect(root.get('counter'), 'Check counter is not accessible on root after OBJECT_DELETE').to.not.exist;
          },
        },

        {
          description: 'OBJECT_DELETE for unknown object id creates zero-value tombstoned object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            const counterId = objectsHelper.fakeCounterObjectId();
            // inject OBJECT_DELETE. should create a zero-value tombstoned object which can't be modified
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: counterId })],
            });

            // try to create and set tombstoned object on root
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 0, 0),
              siteCode: 'bbb',
              state: [objectsHelper.counterCreateOp({ objectId: counterId })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 1, 0),
              siteCode: 'bbb',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'counter', data: { objectId: counterId } })],
            });

            expect(root.get('counter'), 'Check counter is not accessible on root').to.not.exist;
          },
        },

        {
          description:
            'OBJECT_DELETE object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // need to use multiple objects as OBJECT_DELETE op can only be applied once to an object
            const counterIds = [
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
              objectsHelper.fakeCounterObjectId(),
            ];
            await Promise.all(
              counterIds.map(async (counterId, i) => {
                // create objects and set them on root with forged timeserials
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('bbb', 1, 0),
                  siteCode: 'bbb',
                  state: [objectsHelper.counterCreateOp({ objectId: counterId })],
                });
                await objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: counterId, data: { objectId: counterId } })],
                });
              }),
            );

            // inject OBJECT_DELETE operations with various timeserial values
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // existing site, earlier CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, same CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, later CGO, applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // different site, earlier CGO, applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // different site, later CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.objectDeleteOp({ objectId: counterIds[i] })],
              });
            }

            // check only operations with correct timeserials were applied
            const expectedCounters = [
              { exists: true },
              { exists: true },
              { exists: false }, // OBJECT_DELETE applied
              { exists: false }, // OBJECT_DELETE applied
              { exists: false }, // OBJECT_DELETE applied
            ];

            for (const [i, counterId] of counterIds.entries()) {
              const { exists } = expectedCounters[i];

              if (exists) {
                expect(
                  root.get(counterId),
                  `Check counter #${i + 1} exists on root as OBJECT_DELETE op was not applied`,
                ).to.exist;
              } else {
                expect(
                  root.get(counterId),
                  `Check counter #${i + 1} does not exist on root as OBJECT_DELETE op was applied`,
                ).to.not.exist;
              }
            }
          },
        },

        {
          description: 'OBJECT_DELETE triggers subscription callback with deleted data',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
            ]);
            // create initial objects and set on root
            const { objectId: mapObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp({
                data: {
                  foo: { string: 'bar' },
                  baz: { number: 1 },
                },
              }),
            });
            const { objectId: counterObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp({ number: 1 }),
            });
            await objectsCreatedPromise;

            const mapSubPromise = new Promise((resolve, reject) =>
              root.get('map').subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { foo: 'removed', baz: 'removed' },
                    'Check map subscription callback is called with an expected update object after OBJECT_DELETE operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );
            const counterSubPromise = new Promise((resolve, reject) =>
              root.get('counter').subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { amount: -1 },
                    'Check counter subscription callback is called with an expected update object after OBJECT_DELETE operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            // inject OBJECT_DELETE
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: mapObjectId })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: counterObjectId })],
            });

            await Promise.all([mapSubPromise, counterSubPromise]);
          },
        },

        {
          description: 'OBJECT_DELETE for an object sets "tombstoneAt" from "serialTimestamp"',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel, helper, realtimeObject } = ctx;

            const objectCreatedPromise = waitForMapKeyUpdate(root, 'object');
            const { objectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'object',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectCreatedPromise;

            expect(root.get('object'), 'Check object exists on root before OBJECT_DELETE').to.exist;

            // inject OBJECT_DELETE
            const serialTimestamp = 1234567890;
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              serialTimestamp,
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId })],
            });

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            const obj = realtimeObject._objectsPool.get(objectId);
            helper.recordPrivateApi('call.LiveObject.isTombstoned');
            expect(obj.isTombstoned()).to.equal(true, `Check object is tombstoned after OBJECT_DELETE`);
            helper.recordPrivateApi('call.LiveObject.tombstonedAt');
            expect(obj.tombstonedAt()).to.equal(
              serialTimestamp,
              `Check object's "tombstonedAt" value is set to "serialTimestamp" from OBJECT_DELETE`,
            );
          },
        },

        {
          description: 'OBJECT_DELETE for an object sets "tombstoneAt" using local clock if missing "serialTimestamp"',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel, helper, realtimeObject } = ctx;

            const objectCreatedPromise = waitForMapKeyUpdate(root, 'object');
            const { objectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'object',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectCreatedPromise;

            expect(root.get('object'), 'Check object exists on root before OBJECT_DELETE').to.exist;

            const tsBeforeMsg = Date.now();
            // inject OBJECT_DELETE
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              // don't provide serialTimestamp
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId })],
            });
            const tsAfterMsg = Date.now();

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            const obj = realtimeObject._objectsPool.get(objectId);
            helper.recordPrivateApi('call.LiveObject.isTombstoned');
            expect(obj.isTombstoned()).to.equal(true, `Check object is tombstoned after OBJECT_DELETE`);
            helper.recordPrivateApi('call.LiveObject.tombstonedAt');
            expect(
              tsBeforeMsg <= obj.tombstonedAt() <= tsAfterMsg,
              `Check object's "tombstonedAt" value is set using local clock if no "serialTimestamp" provided`,
            ).to.be.true;
          },
        },

        {
          description: 'MAP_SET with reference to a tombstoned object results in undefined value on key',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const objectCreatedPromise = waitForMapKeyUpdate(root, 'foo');
            // create initial objects and set on root
            const { objectId: counterObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'foo',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectCreatedPromise;

            expect(root.get('foo'), 'Check counter exists on root before OBJECT_DELETE').to.exist;

            // inject OBJECT_DELETE
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: counterObjectId })],
            });

            // set tombstoned counter to another key on root
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'bar', data: { objectId: counterObjectId } })],
            });

            expect(root.get('bar'), 'Check counter is not accessible on new key in root after OBJECT_DELETE').to.not
              .exist;
          },
        },

        {
          description: 'object operation message on a tombstoned object does not revive it',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, channel } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map1'),
              waitForMapKeyUpdate(root, 'map2'),
              waitForMapKeyUpdate(root, 'counter1'),
            ]);
            // create initial objects and set on root
            const { objectId: mapId1 } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map1',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            const { objectId: mapId2 } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map2',
              createOp: objectsHelper.mapCreateRestOp({ data: { foo: { string: 'bar' } } }),
            });
            const { objectId: counterId1 } = await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter1',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectsCreatedPromise;

            expect(root.get('map1'), 'Check map1 exists on root before OBJECT_DELETE').to.exist;
            expect(root.get('map2'), 'Check map2 exists on root before OBJECT_DELETE').to.exist;
            expect(root.get('counter1'), 'Check counter1 exists on root before OBJECT_DELETE').to.exist;

            // inject OBJECT_DELETE
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: mapId1 })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: mapId2 })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 2, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId: counterId1 })],
            });

            // inject object operations on tombstoned objects
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 3, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapSetOp({ objectId: mapId1, key: 'baz', data: { string: 'qux' } })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 4, 0),
              siteCode: 'aaa',
              state: [objectsHelper.mapRemoveOp({ objectId: mapId2, key: 'foo' })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 5, 0),
              siteCode: 'aaa',
              state: [objectsHelper.counterIncOp({ objectId: counterId1, amount: 1 })],
            });

            // objects should still be deleted
            expect(root.get('map1'), 'Check map1 does not exist on root after OBJECT_DELETE and another object op').to
              .not.exist;
            expect(root.get('map2'), 'Check map2 does not exist on root after OBJECT_DELETE and another object op').to
              .not.exist;
            expect(
              root.get('counter1'),
              'Check counter1 does not exist on root after OBJECT_DELETE and another object op',
            ).to.not.exist;
          },
        },
      ];

      const applyOperationsDuringSyncScenarios = [
        {
          description: 'object operation messages are buffered during OBJECT_SYNC sequence',
          action: async (ctx) => {
            const { root, objectsHelper, channel, client, helper } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, it should not be applied as sync is in progress
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                // copy data object as library will modify it
                const data = { ...keyData.data };
                helper.recordPrivateApi('read.realtime.options.useBinaryProtocol');
                if (data.bytes != null && client.options.useBinaryProtocol) {
                  // decode base64 data to binary for binary protocol
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  data.bytes = BufferUtils.base64Decode(data.bytes);
                }

                return objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', 0, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data })],
                });
              }),
            );

            // check root doesn't have data from operations
            primitiveKeyData.forEach((keyData) => {
              expect(root.get(keyData.key), `Check "${keyData.key}" key doesn't exist on root during OBJECT_SYNC`).to
                .not.exist;
            });
          },
        },

        {
          description: 'buffered object operation messages are applied when OBJECT_SYNC sequence ends',
          action: async (ctx) => {
            const { root, objectsHelper, channel, helper, client } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map(async (keyData, i) => {
                // copy data object as library will modify it
                const data = { ...keyData.data };
                helper.recordPrivateApi('read.realtime.options.useBinaryProtocol');
                if (data.bytes != null && client.options.useBinaryProtocol) {
                  // decode base64 data to binary for binary protocol
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  data.bytes = BufferUtils.base64Decode(data.bytes);
                }

                return objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data })],
                });
              }),
            );

            // end the sync with empty cursor
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnMap({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                msg: `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
              });
            });
          },
        },

        {
          description: 'buffered object operation messages are discarded when new OBJECT_SYNC sequence starts',
          action: async (ctx) => {
            const { root, objectsHelper, channel, client, helper } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, expect them to be discarded when sync with new sequence id starts
            await Promise.all(
              primitiveKeyData.map(async (keyData, i) => {
                // copy data object as library will modify it
                const data = { ...keyData.data };
                helper.recordPrivateApi('read.realtime.options.useBinaryProtocol');
                if (data.bytes != null && client.options.useBinaryProtocol) {
                  // decode base64 data to binary for binary protocol
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  data.bytes = BufferUtils.base64Decode(data.bytes);
                }

                return objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data })],
                });
              }),
            );

            // start new sync with new sequence id
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'otherserial:cursor',
            });

            // inject another operation that should be applied when latest sync ends
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('bbb', 0, 0),
              siteCode: 'bbb',
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'foo', data: { string: 'bar' } })],
            });

            // end sync
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'otherserial:',
            });

            // check root doesn't have data from operations received during first sync
            primitiveKeyData.forEach((keyData) => {
              expect(
                root.get(keyData.key),
                `Check "${keyData.key}" key doesn't exist on root when OBJECT_SYNC has ended`,
              ).to.not.exist;
            });

            // check root has data from operations received during second sync
            expect(root.get('foo')).to.equal(
              'bar',
              'Check root has data from operations received during second OBJECT_SYNC sequence',
            );
          },
        },

        {
          description:
            'buffered object operation messages are applied based on the site timeserials vector of the object',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            const mapId = objectsHelper.fakeMapObjectId();
            const counterId = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
              // add object state messages with non-empty site timeserials
              state: [
                // next map and counter objects will be checked to have correct operations applied on them based on site timeserials
                objectsHelper.mapObject({
                  objectId: mapId,
                  siteTimeserials: {
                    bbb: lexicoTimeserial('bbb', 2, 0),
                    ccc: lexicoTimeserial('ccc', 5, 0),
                  },
                  materialisedEntries: {
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('ccc', 5, 0), data: { string: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { string: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 2, 0), data: { string: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('ccc', 2, 0), data: { string: 'bar' } },
                    foo7: { timeserial: lexicoTimeserial('ccc', 0, 0), data: { string: 'bar' } },
                    foo8: { timeserial: lexicoTimeserial('ccc', 0, 0), data: { string: 'bar' } },
                  },
                }),
                objectsHelper.counterObject({
                  objectId: counterId,
                  siteTimeserials: {
                    bbb: lexicoTimeserial('bbb', 1, 0),
                  },
                  initialCount: 1,
                }),
                // add objects to the root so they're discoverable in the object tree
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  initialEntries: {
                    map: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: mapId } },
                    counter: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId } },
                  },
                }),
              ],
            });

            // inject operations with various timeserial values
            // Map:
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // existing site, earlier site CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // existing site, same site CGO, not applied
              { serial: lexicoTimeserial('bbb', 3, 0), siteCode: 'bbb' }, // existing site, later site CGO, earlier entry CGO, not applied but site timeserial updated
              // message with later site CGO, same entry CGO case is not possible, as timeserial from entry would be set for the corresponding site code or be less than that
              { serial: lexicoTimeserial('bbb', 3, 0), siteCode: 'bbb' }, // existing site, same site CGO (updated from last op), later entry CGO, not applied
              { serial: lexicoTimeserial('bbb', 4, 0), siteCode: 'bbb' }, // existing site, later site CGO, later entry CGO, applied
              { serial: lexicoTimeserial('aaa', 1, 0), siteCode: 'aaa' }, // different site, earlier entry CGO, not applied but site timeserial updated
              { serial: lexicoTimeserial('aaa', 1, 0), siteCode: 'aaa' }, // different site, same site CGO (updated from last op), later entry CGO, not applied
              // different site with matching entry CGO case is not possible, as matching entry timeserial means that that timeserial is in the site timeserials vector
              { serial: lexicoTimeserial('ddd', 1, 0), siteCode: 'ddd' }, // different site, later entry CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.mapSetOp({ objectId: mapId, key: `foo${i + 1}`, data: { string: 'baz' } })],
              });
            }

            // Counter:
            for (const [i, { serial, siteCode }] of [
              { serial: lexicoTimeserial('bbb', 0, 0), siteCode: 'bbb' }, // +10       existing site, earlier CGO, not applied
              { serial: lexicoTimeserial('bbb', 1, 0), siteCode: 'bbb' }, // +100      existing site, same CGO, not applied
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // +1000     existing site, later CGO, applied, site timeserials updated
              { serial: lexicoTimeserial('bbb', 2, 0), siteCode: 'bbb' }, // +10000    existing site, same CGO (updated from last op), not applied
              { serial: lexicoTimeserial('aaa', 0, 0), siteCode: 'aaa' }, // +100000   different site, earlier CGO, applied
              { serial: lexicoTimeserial('ccc', 9, 0), siteCode: 'ccc' }, // +1000000  different site, later CGO, applied
            ].entries()) {
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial,
                siteCode,
                state: [objectsHelper.counterIncOp({ objectId: counterId, amount: Math.pow(10, i + 1) })],
              });
            }

            // end sync
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // check only operations with correct timeserials were applied
            const expectedMapKeys = [
              { key: 'foo1', value: 'bar' },
              { key: 'foo2', value: 'bar' },
              { key: 'foo3', value: 'bar' },
              { key: 'foo4', value: 'bar' },
              { key: 'foo5', value: 'baz' }, // updated
              { key: 'foo6', value: 'bar' },
              { key: 'foo7', value: 'bar' },
              { key: 'foo8', value: 'baz' }, // updated
            ];

            expectedMapKeys.forEach(({ key, value }) => {
              expect(root.get('map').get(key)).to.equal(
                value,
                `Check "${key}" key on map has expected value after OBJECT_SYNC has ended`,
              );
            });

            expect(root.get('counter').value()).to.equal(
              1 + 1000 + 100000 + 1000000, // sum of passing operations and the initial value
              `Check counter has expected value after OBJECT_SYNC has ended`,
            );
          },
        },

        {
          description:
            'subsequent object operation messages are applied immediately after OBJECT_SYNC ended and buffers are applied',
          action: async (ctx) => {
            const { root, objectsHelper, channel, channelName, helper, client } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map(async (keyData, i) => {
                // copy data object as library will modify it
                const data = { ...keyData.data };
                helper.recordPrivateApi('read.realtime.options.useBinaryProtocol');
                if (data.bytes != null && client.options.useBinaryProtocol) {
                  // decode base64 data to binary for binary protocol
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  data.bytes = BufferUtils.base64Decode(data.bytes);
                }

                return objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data })],
                });
              }),
            );

            // end the sync with empty cursor
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'foo');
            // send some more operations
            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({
                objectId: 'root',
                key: 'foo',
                value: { string: 'bar' },
              }),
            );
            await keyUpdatedPromise;

            // check buffered operations are applied, as well as the most recent operation outside of the sync sequence is applied
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnMap({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                msg: `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
              });
            });
            expect(root.get('foo')).to.equal(
              'bar',
              'Check root has correct value for "foo" key from operation received outside of OBJECT_SYNC after other buffered operations were applied',
            );
          },
        },
      ];

      const writeApiScenarios = [
        {
          allTransportsAndProtocols: true,
          description: 'LiveCounter.increment sends COUNTER_INC operation',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await counterCreatedPromise;

            const counter = root.get('counter');
            const increments = [
              1, // value=1
              10, // value=11
              -11, // value=0
              -1, // value=-1
              -10, // value=-11
              11, // value=0
              Number.MAX_SAFE_INTEGER, // value=9007199254740991
              -Number.MAX_SAFE_INTEGER, // value=0
              -Number.MAX_SAFE_INTEGER, // value=-9007199254740991
            ];
            let expectedCounterValue = 0;

            for (let i = 0; i < increments.length; i++) {
              const increment = increments[i];
              expectedCounterValue += increment;

              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await counter.increment(increment);
              await counterUpdatedPromise;

              expect(counter.value()).to.equal(
                expectedCounterValue,
                `Check counter has correct value after ${i + 1} LiveCounter.increment calls`,
              );
            }
          },
        },

        {
          description: 'LiveCounter.increment throws on invalid input',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await counterCreatedPromise;

            const counter = root.get('counter');

            await expectToThrowAsync(
              async () => counter.increment(),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(null),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(Number.NaN),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(Number.POSITIVE_INFINITY),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(Number.NEGATIVE_INFINITY),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment('foo'),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(BigInt(1)),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(true),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(Symbol()),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment({}),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment([]),
              'Counter value increment should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.increment(counter),
              'Counter value increment should be a valid number',
            );
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveCounter.decrement sends COUNTER_INC operation',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await counterCreatedPromise;

            const counter = root.get('counter');
            const decrements = [
              1, // value=-1
              10, // value=-11
              -11, // value=0
              -1, // value=1
              -10, // value=11
              11, // value=0
              Number.MAX_SAFE_INTEGER, // value=-9007199254740991
              -Number.MAX_SAFE_INTEGER, // value=0
              -Number.MAX_SAFE_INTEGER, // value=9007199254740991
            ];
            let expectedCounterValue = 0;

            for (let i = 0; i < decrements.length; i++) {
              const decrement = decrements[i];
              expectedCounterValue -= decrement;

              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await counter.decrement(decrement);
              await counterUpdatedPromise;

              expect(counter.value()).to.equal(
                expectedCounterValue,
                `Check counter has correct value after ${i + 1} LiveCounter.decrement calls`,
              );
            }
          },
        },

        {
          description: 'LiveCounter.decrement throws on invalid input',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await counterCreatedPromise;

            const counter = root.get('counter');

            await expectToThrowAsync(
              async () => counter.decrement(),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(null),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(Number.NaN),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(Number.POSITIVE_INFINITY),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(Number.NEGATIVE_INFINITY),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement('foo'),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(BigInt(1)),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(true),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(Symbol()),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement({}),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement([]),
              'Counter value decrement should be a valid number',
            );
            await expectToThrowAsync(
              async () => counter.decrement(counter),
              'Counter value decrement should be a valid number',
            );
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap.set sends MAP_SET operation with primitive values',
          action: async (ctx) => {
            const { root, helper } = ctx;

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                let value;
                if (keyData.data.bytes != null) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  value = BufferUtils.base64Decode(keyData.data.bytes);
                } else if (keyData.data.json != null) {
                  value = JSON.parse(keyData.data.json);
                } else {
                  value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                }

                await root.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnMap({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                msg: `Check root has correct value for "${keyData.key}" key after LiveMap.set call`,
              });
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap.set sends MAP_SET operation with reference to another LiveObject',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            await objectsCreatedPromise;

            const counter = root.get('counter');
            const map = root.get('map');

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter2'),
              waitForMapKeyUpdate(root, 'map2'),
            ]);
            await root.set('counter2', counter);
            await root.set('map2', map);
            await keysUpdatedPromise;

            expect(root.get('counter2')).to.equal(
              counter,
              'Check can set a reference to a LiveCounter object on a root via a LiveMap.set call',
            );
            expect(root.get('map2')).to.equal(
              map,
              'Check can set a reference to a LiveMap object on a root via a LiveMap.set call',
            );
          },
        },

        {
          description: 'LiveMap.set throws on invalid input',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const mapCreatedPromise = waitForMapKeyUpdate(root, 'map');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            await mapCreatedPromise;

            const map = root.get('map');

            await expectToThrowAsync(async () => map.set(), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(null), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(1), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(BigInt(1)), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(true), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(Symbol()), 'Map key should be string');
            await expectToThrowAsync(async () => map.set({}), 'Map key should be string');
            await expectToThrowAsync(async () => map.set([]), 'Map key should be string');
            await expectToThrowAsync(async () => map.set(map), 'Map key should be string');

            await expectToThrowAsync(async () => map.set('key'), 'Map value data type is unsupported');
            await expectToThrowAsync(async () => map.set('key', null), 'Map value data type is unsupported');
            await expectToThrowAsync(async () => map.set('key', BigInt(1)), 'Map value data type is unsupported');
            await expectToThrowAsync(async () => map.set('key', Symbol()), 'Map value data type is unsupported');
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap.remove sends MAP_REMOVE operation',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const mapCreatedPromise = waitForMapKeyUpdate(root, 'map');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp({
                data: {
                  foo: { number: 1 },
                  bar: { number: 1 },
                  baz: { number: 1 },
                },
              }),
            });
            await mapCreatedPromise;

            const map = root.get('map');

            const keysUpdatedPromise = Promise.all([waitForMapKeyUpdate(map, 'foo'), waitForMapKeyUpdate(map, 'bar')]);
            await map.remove('foo');
            await map.remove('bar');
            await keysUpdatedPromise;

            expect(map.get('foo'), 'Check can remove a key from a root via a LiveMap.remove call').to.not.exist;
            expect(map.get('bar'), 'Check can remove a key from a root via a LiveMap.remove call').to.not.exist;
            expect(
              map.get('baz'),
              'Check non-removed keys are still present on a root after LiveMap.remove call for another keys',
            ).to.equal(1);
          },
        },

        {
          description: 'LiveMap.remove throws on invalid input',
          action: async (ctx) => {
            const { root, objectsHelper, channelName } = ctx;

            const mapCreatedPromise = waitForMapKeyUpdate(root, 'map');
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            await mapCreatedPromise;

            const map = root.get('map');

            await expectToThrowAsync(async () => map.remove(), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(null), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(1), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(BigInt(1)), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(true), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(Symbol()), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove({}), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove([]), 'Map key should be string');
            await expectToThrowAsync(async () => map.remove(map), 'Map key should be string');
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'RealtimeObject.createCounter sends COUNTER_CREATE operation',
          action: async (ctx) => {
            const { realtimeObject } = ctx;

            const counters = await Promise.all(
              countersFixtures.map(async (x) => realtimeObject.createCounter(x.count)),
            );

            for (let i = 0; i < counters.length; i++) {
              const counter = counters[i];
              const fixture = countersFixtures[i];

              expect(counter, `Check counter #${i + 1} exists`).to.exist;
              expectInstanceOf(counter, 'LiveCounter', `Check counter instance #${i + 1} is of an expected class`);
              expect(counter.value()).to.equal(
                fixture.count ?? 0,
                `Check counter #${i + 1} has expected initial value`,
              );
            }
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveCounter created with RealtimeObject.createCounter can be assigned to the object tree',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter(1);
            await root.set('counter', counter);
            await counterCreatedPromise;

            expectInstanceOf(counter, 'LiveCounter', `Check counter instance is of an expected class`);
            expectInstanceOf(
              root.get('counter'),
              'LiveCounter',
              `Check counter instance on root is of an expected class`,
            );
            expect(root.get('counter')).to.equal(
              counter,
              'Check counter object on root is the same as from create method',
            );
            expect(root.get('counter').value()).to.equal(
              1,
              'Check counter assigned to the object tree has the expected value',
            );
          },
        },

        {
          description:
            'RealtimeObject.createCounter can return LiveCounter with initial value without applying CREATE operation',
          action: async (ctx) => {
            const { realtimeObject, helper } = ctx;

            // prevent publishing of ops to realtime so we guarantee that the initial value doesn't come from a CREATE op
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = () => {};

            const counter = await realtimeObject.createCounter(1);
            expect(counter.value()).to.equal(1, `Check counter has expected initial value`);
          },
        },

        {
          allTransportsAndProtocols: true,
          description:
            'RealtimeObject.createCounter can return LiveCounter with initial value from applied CREATE operation',
          action: async (ctx) => {
            const { realtimeObject, objectsHelper, helper, channel } = ctx;

            // instead of sending CREATE op to the realtime, echo it immediately to the client
            // with forged initial value so we can check that counter gets initialized with a value from a CREATE op
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = async (objectMessages) => {
              const counterId = objectMessages[0].operation.objectId;
              // this should result execute regular operation application procedure and create an object in the pool with forged initial value
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial: lexicoTimeserial('aaa', 1, 1),
                siteCode: 'aaa',
                state: [objectsHelper.counterCreateOp({ objectId: counterId, count: 10 })],
              });
            };

            const counter = await realtimeObject.createCounter(1);

            // counter should be created with forged initial value instead of the actual one
            expect(counter.value()).to.equal(
              10,
              'Check counter value has the expected initial value from a CREATE operation',
            );
          },
        },

        {
          description:
            'initial value is not double counted for LiveCounter from RealtimeObject.createCounter when CREATE op is received',
          action: async (ctx) => {
            const { realtimeObject, objectsHelper, helper, channel } = ctx;

            // prevent publishing of ops to realtime so we can guarantee order of operations
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = () => {};

            // create counter locally, should have an initial value set
            const counter = await realtimeObject.createCounter(1);
            helper.recordPrivateApi('call.LiveObject.getObjectId');
            const counterId = counter.getObjectId();

            // now inject CREATE op for a counter with a forged value. it should not be applied
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 1),
              siteCode: 'aaa',
              state: [objectsHelper.counterCreateOp({ objectId: counterId, count: 10 })],
            });

            expect(counter.value()).to.equal(
              1,
              `Check counter initial value is not double counted after being created and receiving CREATE operation`,
            );
          },
        },

        {
          description: 'RealtimeObject.createCounter throws on invalid input',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            await expectToThrowAsync(
              async () => realtimeObject.createCounter(null),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(Number.NaN),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(Number.POSITIVE_INFINITY),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(Number.NEGATIVE_INFINITY),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter('foo'),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(BigInt(1)),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(true),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(Symbol()),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter({}),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter([]),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createCounter(root),
              'Counter value should be a valid number',
            );
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'RealtimeObject.createMap sends MAP_CREATE operation with primitive values',
          action: async (ctx) => {
            const { realtimeObject, helper } = ctx;

            const maps = await Promise.all(
              primitiveMapsFixtures.map(async (mapFixture) => {
                const entries = mapFixture.entries
                  ? Object.entries(mapFixture.entries).reduce((acc, [key, keyData]) => {
                      let value;
                      if (keyData.data.bytes != null) {
                        helper.recordPrivateApi('call.BufferUtils.base64Decode');
                        value = BufferUtils.base64Decode(keyData.data.bytes);
                      } else if (keyData.data.json != null) {
                        value = JSON.parse(keyData.data.json);
                      } else {
                        value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                      }

                      acc[key] = value;
                      return acc;
                    }, {})
                  : undefined;

                return realtimeObject.createMap(entries);
              }),
            );

            for (let i = 0; i < maps.length; i++) {
              const map = maps[i];
              const fixture = primitiveMapsFixtures[i];

              expect(map, `Check map #${i + 1} exists`).to.exist;
              expectInstanceOf(map, 'LiveMap', `Check map instance #${i + 1} is of an expected class`);

              expect(map.size()).to.equal(
                Object.keys(fixture.entries ?? {}).length,
                `Check map #${i + 1} has correct number of keys`,
              );

              Object.entries(fixture.entries ?? {}).forEach(([key, keyData]) => {
                checkKeyDataOnMap({
                  helper,
                  key,
                  keyData,
                  mapObj: map,
                  msg: `Check map #${i + 1} has correct value for "${key}" key`,
                });
              });
            }
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'RealtimeObject.createMap sends MAP_CREATE operation with reference to another LiveObject',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'counter',
              createOp: objectsHelper.counterCreateRestOp(),
            });
            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'map',
              createOp: objectsHelper.mapCreateRestOp(),
            });
            await objectsCreatedPromise;

            const counter = root.get('counter');
            const map = root.get('map');

            const newMap = await realtimeObject.createMap({ counter, map });

            expect(newMap, 'Check map exists').to.exist;
            expectInstanceOf(newMap, 'LiveMap', 'Check map instance is of an expected class');

            expect(newMap.get('counter')).to.equal(
              counter,
              'Check can set a reference to a LiveCounter object on a new map via a MAP_CREATE operation',
            );
            expect(newMap.get('map')).to.equal(
              map,
              'Check can set a reference to a LiveMap object on a new map via a MAP_CREATE operation',
            );
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'LiveMap created with RealtimeObject.createMap can be assigned to the object tree',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const mapCreatedPromise = waitForMapKeyUpdate(root, 'map');
            const counter = await realtimeObject.createCounter();
            const map = await realtimeObject.createMap({ foo: 'bar', baz: counter });
            await root.set('map', map);
            await mapCreatedPromise;

            expectInstanceOf(map, 'LiveMap', `Check map instance is of an expected class`);
            expectInstanceOf(root.get('map'), 'LiveMap', `Check map instance on root is of an expected class`);
            expect(root.get('map')).to.equal(map, 'Check map object on root is the same as from create method');
            expect(root.get('map').size()).to.equal(
              2,
              'Check map assigned to the object tree has the expected number of keys',
            );
            expect(root.get('map').get('foo')).to.equal(
              'bar',
              'Check map assigned to the object tree has the expected value for its string key',
            );
            expect(root.get('map').get('baz')).to.equal(
              counter,
              'Check map assigned to the object tree has the expected value for its LiveCounter key',
            );
          },
        },

        {
          description:
            'RealtimeObject.createMap can return LiveMap with initial value without applying CREATE operation',
          action: async (ctx) => {
            const { realtimeObject, helper } = ctx;

            // prevent publishing of ops to realtime so we guarantee that the initial value doesn't come from a CREATE op
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = () => {};

            const map = await realtimeObject.createMap({ foo: 'bar' });
            expect(map.get('foo')).to.equal('bar', `Check map has expected initial value`);
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'RealtimeObject.createMap can return LiveMap with initial value from applied CREATE operation',
          action: async (ctx) => {
            const { realtimeObject, objectsHelper, helper, channel } = ctx;

            // instead of sending CREATE op to the realtime, echo it immediately to the client
            // with forged initial value so we can check that map gets initialized with a value from a CREATE op
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = async (objectMessages) => {
              const mapId = objectMessages[0].operation.objectId;
              // this should result execute regular operation application procedure and create an object in the pool with forged initial value
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial: lexicoTimeserial('aaa', 1, 1),
                siteCode: 'aaa',
                state: [
                  objectsHelper.mapCreateOp({
                    objectId: mapId,
                    entries: { baz: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { string: 'qux' } } },
                  }),
                ],
              });
            };

            const map = await realtimeObject.createMap({ foo: 'bar' });

            // map should be created with forged initial value instead of the actual one
            expect(map.get('foo'), `Check key "foo" was not set on a map client-side`).to.not.exist;
            expect(map.get('baz')).to.equal(
              'qux',
              `Check key "baz" was set on a map from a CREATE operation after object creation`,
            );
          },
        },

        {
          description:
            'initial value is not double counted for LiveMap from RealtimeObject.createMap when CREATE op is received',
          action: async (ctx) => {
            const { realtimeObject, objectsHelper, helper, channel } = ctx;

            // prevent publishing of ops to realtime so we can guarantee order of operations
            helper.recordPrivateApi('replace.RealtimeObject.publish');
            realtimeObject.publish = () => {};

            // create map locally, should have an initial value set
            const map = await realtimeObject.createMap({ foo: 'bar' });
            helper.recordPrivateApi('call.LiveObject.getObjectId');
            const mapId = map.getObjectId();

            // now inject CREATE op for a map with a forged value. it should not be applied
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 1),
              siteCode: 'aaa',
              state: [
                objectsHelper.mapCreateOp({
                  objectId: mapId,
                  entries: {
                    foo: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { string: 'qux' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { string: 'qux' } },
                  },
                }),
              ],
            });

            expect(map.get('foo')).to.equal(
              'bar',
              `Check key "foo" was not overridden by a CREATE operation after creating a map locally`,
            );
            expect(map.get('baz'), `Check key "baz" was not set by a CREATE operation after creating a map locally`).to
              .not.exist;
          },
        },

        {
          description: 'RealtimeObject.createMap throws on invalid input',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            await expectToThrowAsync(
              async () => realtimeObject.createMap(null),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap('foo'),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap(1),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap(BigInt(1)),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap(true),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap(Symbol()),
              'Map entries should be a key-value object',
            );

            await expectToThrowAsync(
              async () => realtimeObject.createMap({ key: undefined }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap({ key: null }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap({ key: BigInt(1) }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => realtimeObject.createMap({ key: Symbol() }),
              'Map value data type is unsupported',
            );
          },
        },

        {
          description: 'batch API get method is synchronous',
          action: async (ctx) => {
            const { realtimeObject } = ctx;

            await realtimeObject.batch((ctx) => {
              const root = ctx.get();
              expect(root, 'Check BatchContext.get() returns object synchronously').to.exist;
              expectInstanceOf(root, 'LiveMap', 'root object obtained from a BatchContext is a LiveMap');
            });
          },
        },

        {
          description: 'batch API .get method on a map returns BatchContext* wrappers for objects',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ innerCounter: counter });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await realtimeObject.batch((ctx) => {
              const ctxRoot = ctx.get();
              const ctxCounter = ctxRoot.get('counter');
              const ctxMap = ctxRoot.get('map');
              const ctxInnerCounter = ctxMap.get('innerCounter');

              expect(ctxCounter, 'Check counter object can be accessed from a map in a batch API').to.exist;
              expectInstanceOf(
                ctxCounter,
                'BatchContextLiveCounter',
                'Check counter object obtained in a batch API has a BatchContext specific wrapper type',
              );
              expect(ctxMap, 'Check map object can be accessed from a map in a batch API').to.exist;
              expectInstanceOf(
                ctxMap,
                'BatchContextLiveMap',
                'Check map object obtained in a batch API has a BatchContext specific wrapper type',
              );
              expect(ctxInnerCounter, 'Check inner counter object can be accessed from a map in a batch API').to.exist;
              expectInstanceOf(
                ctxInnerCounter,
                'BatchContextLiveCounter',
                'Check inner counter object obtained in a batch API has a BatchContext specific wrapper type',
              );
            });
          },
        },

        {
          description: 'batch API access API methods on objects work and are synchronous',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await realtimeObject.batch((ctx) => {
              const ctxRoot = ctx.get();
              const ctxCounter = ctxRoot.get('counter');
              const ctxMap = ctxRoot.get('map');

              expect(ctxCounter.value()).to.equal(
                1,
                'Check batch API counter .value() method works and is synchronous',
              );
              expect(ctxMap.get('foo')).to.equal('bar', 'Check batch API map .get() method works and is synchronous');
              expect(ctxMap.size()).to.equal(1, 'Check batch API map .size() method works and is synchronous');
              expect([...ctxMap.entries()]).to.deep.equal(
                [['foo', 'bar']],
                'Check batch API map .entries() method works and is synchronous',
              );
              expect([...ctxMap.keys()]).to.deep.equal(
                ['foo'],
                'Check batch API map .keys() method works and is synchronous',
              );
              expect([...ctxMap.values()]).to.deep.equal(
                ['bar'],
                'Check batch API map .values() method works and is synchronous',
              );
            });
          },
        },

        {
          description: 'batch API write API methods on objects do not mutate objects inside the batch callback',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await realtimeObject.batch((ctx) => {
              const ctxRoot = ctx.get();
              const ctxCounter = ctxRoot.get('counter');
              const ctxMap = ctxRoot.get('map');

              ctxCounter.increment(10);
              expect(ctxCounter.value()).to.equal(
                1,
                'Check batch API counter .increment method does not mutate the object inside the batch callback',
              );

              ctxCounter.decrement(100);
              expect(ctxCounter.value()).to.equal(
                1,
                'Check batch API counter .decrement method does not mutate the object inside the batch callback',
              );

              ctxMap.set('baz', 'qux');
              expect(
                ctxMap.get('baz'),
                'Check batch API map .set method does not mutate the object inside the batch callback',
              ).to.not.exist;

              ctxMap.remove('foo');
              expect(ctxMap.get('foo')).to.equal(
                'bar',
                'Check batch API map .remove method does not mutate the object inside the batch callback',
              );
            });
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'batch API scheduled operations are applied when batch callback is finished',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await realtimeObject.batch((ctx) => {
              const ctxRoot = ctx.get();
              const ctxCounter = ctxRoot.get('counter');
              const ctxMap = ctxRoot.get('map');

              ctxCounter.increment(10);
              ctxCounter.decrement(100);

              ctxMap.set('baz', 'qux');
              ctxMap.remove('foo');
            });

            expect(counter.value()).to.equal(1 + 10 - 100, 'Check counter has an expected value after batch call');
            expect(map.get('baz')).to.equal('qux', 'Check key "baz" has an expected value in a map after batch call');
            expect(map.get('foo'), 'Check key "foo" is removed from map after batch call').to.not.exist;
          },
        },

        {
          description: 'batch API can be called without scheduling any operations',
          action: async (ctx) => {
            const { realtimeObject } = ctx;

            let caughtError;
            try {
              await realtimeObject.batch((ctx) => {});
            } catch (error) {
              caughtError = error;
            }
            expect(
              caughtError,
              `Check batch API can be called without scheduling any operations, but got error: ${caughtError?.toString()}`,
            ).to.not.exist;
          },
        },

        {
          description: 'batch API scheduled operations can be canceled by throwing an error in the batch callback',
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            const cancelError = new Error('cancel batch');
            let caughtError;
            try {
              await realtimeObject.batch((ctx) => {
                const ctxRoot = ctx.get();
                const ctxCounter = ctxRoot.get('counter');
                const ctxMap = ctxRoot.get('map');

                ctxCounter.increment(10);
                ctxCounter.decrement(100);

                ctxMap.set('baz', 'qux');
                ctxMap.remove('foo');

                throw cancelError;
              });
            } catch (error) {
              caughtError = error;
            }

            expect(counter.value()).to.equal(1, 'Check counter value is not changed after canceled batch call');
            expect(map.get('baz'), 'Check key "baz" does not exist on a map after canceled batch call').to.not.exist;
            expect(map.get('foo')).to.equal('bar', 'Check key "foo" is not changed on a map after canceled batch call');
            expect(caughtError).to.equal(
              cancelError,
              'Check error from a batch callback was rethrown by a batch method',
            );
          },
        },

        {
          description: `batch API batch context and derived objects can't be interacted with after the batch call`,
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            let savedCtx;
            let savedCtxCounter;
            let savedCtxMap;

            await realtimeObject.batch((ctx) => {
              const ctxRoot = ctx.get();
              savedCtx = ctx;
              savedCtxCounter = ctxRoot.get('counter');
              savedCtxMap = ctxRoot.get('map');
            });

            expectAccessBatchApiToThrow({
              ctx: savedCtx,
              map: savedCtxMap,
              counter: savedCtxCounter,
              errorMsg: 'Batch is closed',
            });
            expectWriteBatchApiToThrow({
              ctx: savedCtx,
              map: savedCtxMap,
              counter: savedCtxCounter,
              errorMsg: 'Batch is closed',
            });
          },
        },

        {
          description: `batch API batch context and derived objects can't be interacted with after error was thrown from batch callback`,
          action: async (ctx) => {
            const { root, realtimeObject } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await realtimeObject.createCounter(1);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            let savedCtx;
            let savedCtxCounter;
            let savedCtxMap;

            let caughtError;
            try {
              await realtimeObject.batch((ctx) => {
                const ctxRoot = ctx.get();
                savedCtx = ctx;
                savedCtxCounter = ctxRoot.get('counter');
                savedCtxMap = ctxRoot.get('map');

                throw new Error('cancel batch');
              });
            } catch (error) {
              caughtError = error;
            }

            expect(caughtError, 'Check batch call failed with an error').to.exist;
            expectAccessBatchApiToThrow({
              ctx: savedCtx,
              map: savedCtxMap,
              counter: savedCtxCounter,
              errorMsg: 'Batch is closed',
            });
            expectWriteBatchApiToThrow({
              ctx: savedCtx,
              map: savedCtxMap,
              counter: savedCtxCounter,
              errorMsg: 'Batch is closed',
            });
          },
        },
      ];

      const liveMapEnumerationScenarios = [
        {
          description: `LiveMap enumeration`,
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            const counterId1 = objectsHelper.fakeCounterObjectId();
            const counterId2 = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.counterObject({
                  objectId: counterId1,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: false,
                  initialCount: 0,
                }),
                objectsHelper.counterObject({
                  objectId: counterId2,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 0,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  materialisedEntries: {
                    counter1: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId1 } },
                    counter2: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId2 } },
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'bar' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'qux' }, tombstone: true },
                  },
                }),
              ],
            });

            const counter1 = await root.get('counter1');

            // enumeration methods should not count tombstoned entries
            expect(root.size()).to.equal(2, 'Check LiveMap.size() returns expected number of keys');
            expect([...root.entries()]).to.deep.equal(
              [
                ['counter1', counter1],
                ['foo', 'bar'],
              ],
              'Check LiveMap.entries() returns expected entries',
            );
            expect([...root.keys()]).to.deep.equal(['counter1', 'foo'], 'Check LiveMap.keys() returns expected keys');
            expect([...root.values()]).to.deep.equal(
              [counter1, 'bar'],
              'Check LiveMap.values() returns expected values',
            );
          },
        },
        {
          description: `BatchContextLiveMap enumeration`,
          action: async (ctx) => {
            const { root, objectsHelper, channel, realtimeObject } = ctx;

            const counterId1 = objectsHelper.fakeCounterObjectId();
            const counterId2 = objectsHelper.fakeCounterObjectId();
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:', // empty serial so sync sequence ends immediately
              state: [
                objectsHelper.counterObject({
                  objectId: counterId1,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: false,
                  initialCount: 0,
                }),
                objectsHelper.counterObject({
                  objectId: counterId2,
                  siteTimeserials: {
                    aaa: lexicoTimeserial('aaa', 0, 0),
                  },
                  tombstone: true,
                  initialCount: 0,
                }),
                objectsHelper.mapObject({
                  objectId: 'root',
                  siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                  materialisedEntries: {
                    counter1: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId1 } },
                    counter2: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { objectId: counterId2 } },
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'bar' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { string: 'qux' }, tombstone: true },
                  },
                }),
              ],
            });

            const counter1 = await root.get('counter1');

            await realtimeObject.batch(async (ctx) => {
              const ctxRoot = ctx.get();

              // enumeration methods should not count tombstoned entries
              expect(ctxRoot.size()).to.equal(2, 'Check BatchContextLiveMap.size() returns expected number of keys');
              expect([...ctxRoot.entries()]).to.deep.equal(
                [
                  ['counter1', counter1],
                  ['foo', 'bar'],
                ],
                'Check BatchContextLiveMap.entries() returns expected entries',
              );
              expect([...ctxRoot.keys()]).to.deep.equal(
                ['counter1', 'foo'],
                'Check BatchContextLiveMap.keys() returns expected keys',
              );
              expect([...ctxRoot.values()]).to.deep.equal(
                [counter1, 'bar'],
                'Check BatchContextLiveMap.values() returns expected values',
              );
            });
          },
        },
      ];

      const pathObjectScenarios = [
        {
          description: 'RealtimeObject.getPathObject() returns PathObject instance',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            expect(entryPathObject, 'Check entry path object exists').to.exist;
            expectInstanceOf(entryPathObject, 'DefaultPathObject', 'entrypoint should be of DefaultPathObject type');
          },
        },

        {
          description: 'PathObject.get() returns child PathObject instances',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            const stringPathObj = entryPathObject.get('stringKey');
            const numberPathObj = entryPathObject.get('numberKey');

            expect(stringPathObj, 'Check string PathObject exists').to.exist;
            expect(stringPathObj.path()).to.equal('stringKey', 'Check string PathObject has correct path');

            expect(numberPathObj, 'Check number PathObject exists').to.exist;
            expect(numberPathObj.path()).to.equal('numberKey', 'Check number PathObject has correct path');
          },
        },

        {
          description: 'PathObject.path() returns correct path strings',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keysUpdatedPromise = Promise.all([waitForMapKeyUpdate(root, 'nested')]);
            const nestedMap = await realtimeObject.createMap({
              simple: 'value',
              deep: await realtimeObject.createMap({ nested: 'deepValue' }),
              'key.with.dots': 'dottedValue',
              'key\\escaped': 'escapedValue',
            });
            await root.set('nested', nestedMap);
            await keysUpdatedPromise;

            // Test path with .get() method
            expect(entryPathObject.path()).to.equal('', 'Check root PathObject has empty path');
            expect(entryPathObject.get('nested').path()).to.equal('nested', 'Check simple child path');
            expect(entryPathObject.get('nested').get('simple').path()).to.equal(
              'nested.simple',
              'Check nested path via get()',
            );
            expect(entryPathObject.get('nested').get('deep').get('nested').path()).to.equal(
              'nested.deep.nested',
              'Check complex nested path',
            );
            expect(entryPathObject.get('nested').get('key.with.dots').path()).to.equal(
              'nested.key\\.with\\.dots',
              'Check path with dots in key name is properly escaped',
            );
            expect(entryPathObject.get('nested').get('key\\escaped').path()).to.equal(
              'nested.key\\escaped',
              'Check path with escaped symbols',
            );

            // Test path with .at() method
            expect(entryPathObject.at('nested.simple').path()).to.equal('nested.simple', 'Check nested path via at()');
            expect(entryPathObject.at('nested.key\\.with\\.dots').path()).to.equal(
              'nested.key\\.with\\.dots',
              'Check path via at() method with dots in key name is properly escaped',
            );
            expect(entryPathObject.at('nested.key\\escaped').path()).to.equal(
              'nested.key\\escaped',
              'Check path via at() method with escaped symbols',
            );
          },
        },

        {
          description: 'PathObject.at() navigates using dot-separated paths',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            // Create nested structure
            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'nested');
            const nestedMap = await realtimeObject.createMap({ deepKey: 'deepValue', 'key.with.dots': 'dottedValue' });
            await root.set('nested', nestedMap);
            await keyUpdatedPromise;

            const nestedPathObj = entryPathObject.at('nested.deepKey');
            expect(nestedPathObj, 'Check nested PathObject exists').to.exist;
            expect(nestedPathObj.path()).to.equal('nested.deepKey', 'Check nested PathObject has correct path');
            expect(nestedPathObj.value()).to.equal('deepValue', 'Check nested PathObject has correct value');

            const nestedPathWithDotsObj = entryPathObject.at('nested.key\\.with\\.dots');
            expect(nestedPathWithDotsObj, 'Check nested PathObject with dots in path exists').to.exist;
            expect(nestedPathWithDotsObj.path()).to.equal(
              'nested.key\\.with\\.dots',
              'Check nested PathObject with dots in path has correct path',
            );
            expect(nestedPathWithDotsObj.value()).to.equal(
              'dottedValue',
              'Check nested PathObject with dots in path has correct value',
            );
          },
        },

        {
          description: 'PathObject resolves complex path strings',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'nested.key');
            const nestedMap = await realtimeObject.createMap({
              'key.with.dots.and\\escaped\\characters': 'nestedValue',
            });
            await root.set('nested.key', nestedMap);
            await keyUpdatedPromise;

            // Test complex path via chaining .get()
            const pathObjViaGetChain = entryPathObject.get('nested.key').get('key.with.dots.and\\escaped\\characters');
            expect(pathObjViaGetChain.value()).to.equal(
              'nestedValue',
              'Check PathObject resolves value for a complex path via chain of get() calls',
            );
            expect(pathObjViaGetChain.path()).to.equal(
              'nested\\.key.key\\.with\\.dots\\.and\\escaped\\characters',
              'Check PathObject returns correct path for a complex path via chain of get() calls',
            );

            // Test complex path via .at()
            const pathObjViaAt = entryPathObject.at('nested\\.key.key\\.with\\.dots\\.and\\escaped\\characters');
            expect(pathObjViaAt.value()).to.equal(
              'nestedValue',
              'Check PathObject resolves value for a complex path via at() call',
            );
            expect(pathObjViaAt.path()).to.equal(
              'nested\\.key.key\\.with\\.dots\\.and\\escaped\\characters',
              'Check PathObject returns correct path for a complex path via at() call',
            );
          },
        },

        {
          description: 'PathObject.value() returns primitive values correctly',
          action: async (ctx) => {
            const { root, entryPathObject, helper } = ctx;

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                let value;
                if (keyData.data.bytes != null) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  value = BufferUtils.base64Decode(keyData.data.bytes);
                } else if (keyData.data.json != null) {
                  value = JSON.parse(keyData.data.json);
                } else {
                  value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                }

                await root.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            // check PathObject returns primitive values correctly
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnPathObject({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                pathObject: entryPathObject,
                msg: `Check PathObject returns correct value for "${keyData.key}" key after LiveMap.set call`,
              });
            });
          },
        },

        {
          description: 'PathObject.value() returns LiveCounter values',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter(10);
            await root.set('counter', counter);
            await keyUpdatedPromise;

            const counterPathObj = entryPathObject.get('counter');

            expect(counterPathObj.value()).to.equal(10, 'Check counter value is returned correctly');
          },
        },

        {
          description: 'PathObject.instance() returns DefaultInstance for LiveMap and LiveCounter',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
            ]);
            await root.set('map', await realtimeObject.createMap());
            await root.set('counter', await realtimeObject.createCounter());
            await keysUpdatedPromise;

            const counterInstance = entryPathObject.get('counter').instance();
            expect(counterInstance, 'Check instance exists for counter path').to.exist;
            expectInstanceOf(counterInstance, 'DefaultInstance', 'Check counter instance is DefaultInstance');

            const mapInstance = entryPathObject.get('map').instance();
            expect(mapInstance, 'Check instance exists for map path').to.exist;
            expectInstanceOf(mapInstance, 'DefaultInstance', 'Check map instance is DefaultInstance');
          },
        },

        {
          description: 'PathObject collection methods work for LiveMap objects',
          action: async (ctx) => {
            const { root, entryPathObject } = ctx;

            // Set up test data
            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'key1'),
              waitForMapKeyUpdate(root, 'key2'),
              waitForMapKeyUpdate(root, 'key3'),
            ]);
            await root.set('key1', 'value1');
            await root.set('key2', 'value2');
            await root.set('key3', 'value3');
            await keysUpdatedPromise;

            // Test size
            expect(entryPathObject.size()).to.equal(3, 'Check PathObject size');

            // Test keys
            const keys = [...entryPathObject.keys()];
            expect(keys).to.have.members(['key1', 'key2', 'key3'], 'Check PathObject keys');

            // Test entries
            const entries = [...entryPathObject.entries()];
            expect(entries).to.have.lengthOf(3, 'Check PathObject entries length');

            const entryKeys = entries.map(([key]) => key);
            expect(entryKeys).to.have.members(['key1', 'key2', 'key3'], 'Check entry keys');

            const entryValues = entries.map(([key, pathObj]) => pathObj.value());
            expect(entryValues).to.have.members(['value1', 'value2', 'value3'], 'Check PathObject entries values');

            // Test values
            const values = [...entryPathObject.values()];
            expect(values).to.have.lengthOf(3, 'Check PathObject values length');

            const valueValues = values.map((pathObj) => pathObj.value());
            expect(valueValues).to.have.members(['value1', 'value2', 'value3'], 'Check PathObject values');
          },
        },

        {
          description: 'PathObject.set() works for LiveMap objects with primitive values',
          action: async (ctx) => {
            const { root, entryPathObject, helper } = ctx;

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                let value;
                if (keyData.data.bytes != null) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  value = BufferUtils.base64Decode(keyData.data.bytes);
                } else if (keyData.data.json != null) {
                  value = JSON.parse(keyData.data.json);
                } else {
                  value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                }

                await entryPathObject.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            // check primitive values were set correctly via PathObject
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnPathObject({
                helper,
                key: keyData.key,
                keyData,
                mapObj: root,
                pathObject: entryPathObject,
                msg: `Check PathObject returns correct value for "${keyData.key}" key after PathObject.set call`,
              });
            });
          },
        },

        {
          description: 'PathObject.set() works for LiveMap objects with LiveObject references',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counterKey');
            const counter = await realtimeObject.createCounter(5);
            await entryPathObject.set('counterKey', counter);
            await keyUpdatedPromise;

            expect(root.get('counterKey')).to.equal(counter, 'Check counter object was set via PathObject');
            expect(entryPathObject.get('counterKey').value()).to.equal(5, 'Check PathObject reflects counter value');
          },
        },

        {
          description: 'PathObject.remove() works for LiveMap objects',
          action: async (ctx) => {
            const { root, entryPathObject } = ctx;

            const keyAddedPromise = waitForMapKeyUpdate(root, 'keyToRemove');
            await root.set('keyToRemove', 'valueToRemove');
            await keyAddedPromise;

            expect(root.get('keyToRemove'), 'Check key exists on root').to.exist;

            const keyRemovedPromise = waitForMapKeyUpdate(root, 'keyToRemove');
            await entryPathObject.remove('keyToRemove');
            await keyRemovedPromise;

            expect(root.get('keyToRemove'), 'Check key on root is removed after PathObject.remove()').to.be.undefined;
            expect(
              entryPathObject.get('keyToRemove').value(),
              'Check value for path is undefined after PathObject.remove()',
            ).to.be.undefined;
          },
        },

        {
          description: 'PathObject.increment() and PathObject.decrement() work for LiveCounter objects',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter(10);
            await root.set('counter', counter);
            await keyUpdatedPromise;

            const counterPathObj = entryPathObject.get('counter');

            let counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterPathObj.increment(5);
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(15, 'Check counter incremented via PathObject');
            expect(counterPathObj.value()).to.equal(15, 'Check PathObject reflects incremented value');

            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterPathObj.decrement(3);
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(12, 'Check counter decremented via PathObject');
            expect(counterPathObj.value()).to.equal(12, 'Check PathObject reflects decremented value');

            // test increment/decrement without argument (should increment/decrement by 1)
            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterPathObj.increment();
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(13, 'Check counter incremented via PathObject without argument');
            expect(counterPathObj.value()).to.equal(13, 'Check PathObject reflects incremented value');

            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterPathObj.decrement();
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(12, 'Check counter decremented via PathObject without argument');
            expect(counterPathObj.value()).to.equal(12, 'Check PathObject reflects decremented value');
          },
        },

        {
          description: 'PathObject.get() throws error for non-string keys',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            expect(() => entryPathObject.get()).to.throw('Path key must be a string');
            expect(() => entryPathObject.get(null)).to.throw('Path key must be a string');
            expect(() => entryPathObject.get(123)).to.throw('Path key must be a string');
            expect(() => entryPathObject.get(BigInt(1))).to.throw('Path key must be a string');
            expect(() => entryPathObject.get(true)).to.throw('Path key must be a string');
            expect(() => entryPathObject.get({})).to.throw('Path key must be a string');
            expect(() => entryPathObject.get([])).to.throw('Path key must be a string');
          },
        },

        {
          description: 'PathObject.at() throws error for non-string paths',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            expect(() => entryPathObject.at()).to.throw('Path must be a string');
            expect(() => entryPathObject.at(null)).to.throw('Path must be a string');
            expect(() => entryPathObject.at(123)).to.throw('Path must be a string');
            expect(() => entryPathObject.at(BigInt(1))).to.throw('Path must be a string');
            expect(() => entryPathObject.at(true)).to.throw('Path must be a string');
            expect(() => entryPathObject.at({})).to.throw('Path must be a string');
            expect(() => entryPathObject.at([])).to.throw('Path must be a string');
          },
        },

        {
          description: 'PathObject handling of operations on non-existent paths',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            const nonExistentPathObj = entryPathObject.at('non.existent.path');
            const errorMsg = 'Could not resolve value at path';

            // Next operations should not throw and silently handle non-existent path
            expect(nonExistentPathObj.value(), 'Check PathObject.value() for non-existent path returns undefined').to.be
              .undefined;
            expect(nonExistentPathObj.instance(), 'Check PathObject.instance() for non-existent path returns undefined')
              .to.be.undefined;
            expect([...nonExistentPathObj.entries()]).to.deep.equal(
              [],
              'Check PathObject.entries() for non-existent path returns empty iterator',
            );
            expect([...nonExistentPathObj.keys()]).to.deep.equal(
              [],
              'Check PathObject.keys() for non-existent path returns empty iterator',
            );
            expect([...nonExistentPathObj.values()]).to.deep.equal(
              [],
              'Check PathObject.values() for non-existent path returns empty iterator',
            );
            expect(nonExistentPathObj.size(), 'Check PathObject.size() for non-existent path returns undefined').to.be
              .undefined;

            // Next operations should throw due to path resolution failure
            await expectToThrowAsync(async () => nonExistentPathObj.set('key', 'value'), errorMsg, { withCode: 92005 });
            await expectToThrowAsync(async () => nonExistentPathObj.remove('key'), errorMsg, {
              withCode: 92005,
            });
            await expectToThrowAsync(async () => nonExistentPathObj.increment(), errorMsg, {
              withCode: 92005,
            });
            await expectToThrowAsync(async () => nonExistentPathObj.decrement(), errorMsg, {
              withCode: 92005,
            });
          },
        },

        {
          description: 'PathObject handling of operations for paths with non-collection intermediate segments',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter();
            await root.set('counter', counter);
            await keyUpdatedPromise;

            const wrongTypePathObj = entryPathObject.at('counter.nested.path');
            const errorMsg = `Cannot resolve path segment 'nested' on non-collection type at path`;

            // Next operations should not throw and silently handle incorrect path
            expect(wrongTypePathObj.value(), 'Check PathObject.value() for non-collection path returns undefined').to.be
              .undefined;
            expect(wrongTypePathObj.instance(), 'Check PathObject.instance() for non-collection path returns undefined')
              .to.be.undefined;
            expect([...wrongTypePathObj.entries()]).to.deep.equal(
              [],
              'Check PathObject.entries() for non-collection path returns empty iterator',
            );
            expect([...wrongTypePathObj.keys()]).to.deep.equal(
              [],
              'Check PathObject.keys() for non-collection path returns empty iterator',
            );
            expect([...wrongTypePathObj.values()]).to.deep.equal(
              [],
              'Check PathObject.values() for non-collection path returns empty iterator',
            );
            expect(wrongTypePathObj.size(), 'Check PathObject.size() for non-collection path returns undefined').to.be
              .undefined;

            // These should throw due to path resolution failure
            await expectToThrowAsync(async () => wrongTypePathObj.set('key', 'value'), errorMsg, { withCode: 92005 });
            await expectToThrowAsync(async () => wrongTypePathObj.remove('key'), errorMsg, {
              withCode: 92005,
            });
            await expectToThrowAsync(async () => wrongTypePathObj.increment(), errorMsg, {
              withCode: 92005,
            });
            await expectToThrowAsync(async () => wrongTypePathObj.decrement(), errorMsg, {
              withCode: 92005,
            });
          },
        },

        {
          description: 'PathObject handling of operations on wrong underlying object type',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'primitive'),
            ]);
            const map = await realtimeObject.createMap();
            const counter = await realtimeObject.createCounter(5);
            await root.set('map', map);
            await root.set('counter', counter);
            await root.set('primitive', 'value');
            await keysUpdatedPromise;

            const mapPathObj = entryPathObject.get('map');
            const counterPathObj = entryPathObject.get('counter');
            const primitivePathObj = entryPathObject.get('primitive');

            // next methods silently handle incorrect underlying type
            expect(mapPathObj.value(), 'Check PathObject.value() for wrong underlying object type returns undefined').to
              .be.undefined;
            expect(
              primitivePathObj.instance(),
              'Check PathObject.instance() for wrong underlying object type returns undefined',
            ).to.be.undefined;
            expect([...primitivePathObj.entries()]).to.deep.equal(
              [],
              'Check PathObject.entries() for wrong underlying object type returns empty iterator',
            );
            expect([...primitivePathObj.keys()]).to.deep.equal(
              [],
              'Check PathObject.keys() for wrong underlying object type returns empty iterator',
            );
            expect([...primitivePathObj.values()]).to.deep.equal(
              [],
              'Check PathObject.values() for wrong underlying object type returns empty iterator',
            );
            expect(
              primitivePathObj.size(),
              'Check PathObject.size() for wrong underlying object type returns undefined',
            ).to.be.undefined;

            // map mutation methods throw errors for non-LiveMap objects
            await expectToThrowAsync(
              async () => primitivePathObj.set('key', 'value'),
              'Cannot set a key on a non-LiveMap object at path',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => counterPathObj.set('key', 'value'),
              'Cannot set a key on a non-LiveMap object at path',
              { withCode: 92007 },
            );

            await expectToThrowAsync(
              async () => primitivePathObj.remove('key'),
              'Cannot remove a key from a non-LiveMap object at path',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => counterPathObj.remove('key'),
              'Cannot remove a key from a non-LiveMap object at path',
              { withCode: 92007 },
            );

            // counter mutation methods throw errors for non-LiveCounter objects
            await expectToThrowAsync(
              async () => primitivePathObj.increment(),
              'Cannot increment a non-LiveCounter object at path',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => mapPathObj.increment(),
              'Cannot increment a non-LiveCounter object at path',
              {
                withCode: 92007,
              },
            );

            await expectToThrowAsync(
              async () => primitivePathObj.decrement(),
              'Cannot decrement a non-LiveCounter object at path',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => mapPathObj.decrement(),
              'Cannot decrement a non-LiveCounter object at path',
              {
                withCode: 92007,
              },
            );
          },
        },
      ];

      const instanceScenarios = [
        {
          description: 'DefaultInstance.id() returns object ID of underlying LiveObject',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject, helper } = ctx;

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
            ]);
            const map = await realtimeObject.createMap();
            const counter = await realtimeObject.createCounter();
            await entryPathObject.set('map', map);
            await entryPathObject.set('counter', counter);
            await keysUpdatedPromise;

            const mapInstance = entryPathObject.get('map').instance();
            const counterInstance = entryPathObject.get('counter').instance();

            helper.recordPrivateApi('call.LiveObject.getObjectId');
            expect(mapInstance.id()).to.equal(map.getObjectId(), 'Check map instance ID matches underlying LiveMap ID');

            helper.recordPrivateApi('call.LiveObject.getObjectId');
            expect(counterInstance.id()).to.equal(
              counter.getObjectId(),
              'Check counter instance ID matches underlying LiveCounter ID',
            );
          },
        },

        {
          description: 'DefaultInstance.get() returns child DefaultInstance instances',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'stringKey'),
              waitForMapKeyUpdate(root, 'counterKey'),
            ]);
            await entryPathObject.set('stringKey', 'value');
            await entryPathObject.set('counterKey', await realtimeObject.createCounter(42));
            await keysUpdatedPromise;

            const rootInstance = entryPathObject.instance();

            const stringInstance = rootInstance.get('stringKey');
            expect(stringInstance, 'Check string DefaultInstance exists').to.exist;
            expectInstanceOf(stringInstance, 'DefaultInstance', 'string instance should be of DefaultInstance type');
            expect(stringInstance.value()).to.equal('value', 'Check string instance has correct value');

            const counterInstance = rootInstance.get('counterKey');
            expect(counterInstance, 'Check counter DefaultInstance exists').to.exist;
            expectInstanceOf(counterInstance, 'DefaultInstance', 'counter instance should be of DefaultInstance type');
            expect(counterInstance.value()).to.equal(42, 'Check counter instance has correct value');
          },
        },

        {
          description: 'DefaultInstance.value() returns primitive values correctly',
          action: async (ctx) => {
            const { root, entryPathObject, helper } = ctx;

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                let value;
                if (keyData.data.bytes != null) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  value = BufferUtils.base64Decode(keyData.data.bytes);
                } else if (keyData.data.json != null) {
                  value = JSON.parse(keyData.data.json);
                } else {
                  value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                }

                await entryPathObject.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            const rootInstance = entryPathObject.instance();

            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnInstance({
                helper,
                key: keyData.key,
                keyData,
                instance: rootInstance,
                msg: `Check DefaultInstance returns correct value for "${keyData.key}" key after PathObject.set call`,
              });
            });
          },
        },

        {
          description: 'DefaultInstance.value() returns LiveCounter values',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter(10);
            await entryPathObject.set('counter', counter);
            await keyUpdatedPromise;

            const counterInstance = entryPathObject.get('counter').instance();

            expect(counterInstance.value()).to.equal(10, 'Check counter value is returned correctly');
          },
        },

        {
          description: 'DefaultInstance collection methods work for LiveMap objects',
          action: async (ctx) => {
            const { root, entryPathObject } = ctx;

            // Set up test data
            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'key1'),
              waitForMapKeyUpdate(root, 'key2'),
              waitForMapKeyUpdate(root, 'key3'),
            ]);
            await entryPathObject.set('key1', 'value1');
            await entryPathObject.set('key2', 'value2');
            await entryPathObject.set('key3', 'value3');
            await keysUpdatedPromise;

            const rootInstance = entryPathObject.instance();

            // Test size
            expect(rootInstance.size()).to.equal(3, 'Check DefaultInstance size');

            // Test keys
            const keys = [...rootInstance.keys()];
            expect(keys).to.have.members(['key1', 'key2', 'key3'], 'Check DefaultInstance keys');

            // Test entries
            const entries = [...rootInstance.entries()];
            expect(entries).to.have.lengthOf(3, 'Check DefaultInstance entries length');

            const entryKeys = entries.map(([key]) => key);
            expect(entryKeys).to.have.members(['key1', 'key2', 'key3'], 'Check entry keys');

            const entryValues = entries.map(([key, instance]) => instance.value());
            expect(entryValues).to.have.members(['value1', 'value2', 'value3'], 'Check DefaultInstance entries values');

            // Test values
            const values = [...rootInstance.values()];
            expect(values).to.have.lengthOf(3, 'Check DefaultInstance values length');

            const valueValues = values.map((instance) => instance.value());
            expect(valueValues).to.have.members(['value1', 'value2', 'value3'], 'Check DefaultInstance values');
          },
        },

        {
          description: 'DefaultInstance.set() works for LiveMap objects with primitive values',
          action: async (ctx) => {
            const { root, entryPathObject, helper } = ctx;

            const rootInstance = entryPathObject.instance();

            const keysUpdatedPromise = Promise.all(primitiveKeyData.map((x) => waitForMapKeyUpdate(root, x.key)));
            await Promise.all(
              primitiveKeyData.map(async (keyData) => {
                let value;
                if (keyData.data.bytes != null) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  value = BufferUtils.base64Decode(keyData.data.bytes);
                } else if (keyData.data.json != null) {
                  value = JSON.parse(keyData.data.json);
                } else {
                  value = keyData.data.number ?? keyData.data.string ?? keyData.data.boolean;
                }

                await rootInstance.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            // check primitive values were set correctly via Instance
            primitiveKeyData.forEach((keyData) => {
              checkKeyDataOnInstance({
                helper,
                key: keyData.key,
                keyData,
                instance: rootInstance,
                msg: `Check DefaultInstance returns correct value for "${keyData.key}" key after DefaultInstance.set call`,
              });
            });
          },
        },

        {
          description: 'DefaultInstance.set() works for LiveMap objects with LiveObject references',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const rootInstance = entryPathObject.instance();

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counterKey');
            const counter = await realtimeObject.createCounter(5);
            await rootInstance.set('counterKey', counter);
            await keyUpdatedPromise;

            expect(root.get('counterKey')).to.equal(counter, 'Check counter object was set via DefaultInstance');
            expect(rootInstance.get('counterKey').value()).to.equal(5, 'Check DefaultInstance reflects counter value');
          },
        },

        {
          description: 'DefaultInstance.remove() works for LiveMap objects',
          action: async (ctx) => {
            const { root, entryPathObject } = ctx;

            const rootInstance = entryPathObject.instance();

            const keyAddedPromise = waitForMapKeyUpdate(root, 'keyToRemove');
            await entryPathObject.set('keyToRemove', 'valueToRemove');
            await keyAddedPromise;

            expect(entryPathObject.get('keyToRemove').value(), 'Check key exists on root').to.exist;

            const keyRemovedPromise = waitForMapKeyUpdate(root, 'keyToRemove');
            await rootInstance.remove('keyToRemove');
            await keyRemovedPromise;

            expect(root.get('keyToRemove'), 'Check key on root is removed after DefaultInstance.remove()').to.be
              .undefined;
            expect(
              rootInstance.get('keyToRemove'),
              'Check value for instance is undefined after DefaultInstance.remove()',
            ).to.be.undefined;
          },
        },

        {
          description: 'DefaultInstance.increment() and DefaultInstance.decrement() work for LiveCounter objects',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const rootInstance = entryPathObject.instance();

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await realtimeObject.createCounter(10);
            await entryPathObject.set('counter', counter);
            await keyUpdatedPromise;

            const counterInstance = rootInstance.get('counter');

            let counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterInstance.increment(5);
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(15, 'Check counter incremented via DefaultInstance');
            expect(counterInstance.value()).to.equal(15, 'Check DefaultInstance reflects incremented value');

            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterInstance.decrement(3);
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(12, 'Check counter decremented via DefaultInstance');
            expect(counterInstance.value()).to.equal(12, 'Check DefaultInstance reflects decremented value');

            // test increment/decrement without argument (should increment/decrement by 1)
            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterInstance.increment();
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(13, 'Check counter incremented via DefaultInstance without argument');
            expect(counterInstance.value()).to.equal(13, 'Check DefaultInstance reflects incremented value');

            counterUpdatedPromise = waitForCounterUpdate(counter);
            await counterInstance.decrement();
            await counterUpdatedPromise;

            expect(counter.value()).to.equal(12, 'Check counter decremented via DefaultInstance without argument');
            expect(counterInstance.value()).to.equal(12, 'Check DefaultInstance reflects decremented value');
          },
        },

        {
          description: 'DefaultInstance.get() throws error for non-string keys',
          action: async (ctx) => {
            const { entryPathObject } = ctx;

            const rootInstance = entryPathObject.instance();

            expect(() => rootInstance.get()).to.throw('Key must be a string');
            expect(() => rootInstance.get(null)).to.throw('Key must be a string');
            expect(() => rootInstance.get(123)).to.throw('Key must be a string');
            expect(() => rootInstance.get(BigInt(1))).to.throw('Key must be a string');
            expect(() => rootInstance.get(true)).to.throw('Key must be a string');
            expect(() => rootInstance.get({})).to.throw('Key must be a string');
            expect(() => rootInstance.get([])).to.throw('Key must be a string');
          },
        },

        {
          description: 'DefaultInstance handling of operations on wrong underlying object type',
          action: async (ctx) => {
            const { root, realtimeObject, entryPathObject } = ctx;

            const keysUpdatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'map'),
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'primitive'),
            ]);
            const map = await realtimeObject.createMap({ foo: 'bar' });
            const counter = await realtimeObject.createCounter(5);
            await entryPathObject.set('map', map);
            await entryPathObject.set('counter', counter);
            await entryPathObject.set('primitive', 'value');
            await keysUpdatedPromise;

            const mapInstance = entryPathObject.get('map').instance();
            const counterInstance = entryPathObject.get('counter').instance();
            const primitiveInstance = mapInstance.get('foo');

            // next methods silently handle incorrect underlying type
            expect(
              primitiveInstance.id(),
              'Check DefaultInstance.id() for wrong underlying object type returns undefined',
            ).to.be.undefined;
            expect(
              primitiveInstance.get('foo'),
              'Check DefaultInstance.get() for wrong underlying object type returns undefined',
            ).to.be.undefined;
            expect(
              mapInstance.value(),
              'Check DefaultInstance.value() for wrong underlying object type returns undefined',
            ).to.be.undefined;
            expect([...primitiveInstance.entries()]).to.deep.equal(
              [],
              'Check DefaultInstance.entries() for wrong underlying object type returns empty iterator',
            );
            expect([...primitiveInstance.keys()]).to.deep.equal(
              [],
              'Check DefaultInstance.keys() for wrong underlying object type returns empty iterator',
            );
            expect([...primitiveInstance.values()]).to.deep.equal(
              [],
              'Check DefaultInstance.values() for wrong underlying object type returns empty iterator',
            );
            expect(
              primitiveInstance.size(),
              'Check DefaultInstance.size() for wrong underlying object type returns undefined',
            ).to.be.undefined;

            // map mutation methods throw errors for non-LiveMap objects
            await expectToThrowAsync(
              async () => primitiveInstance.set('key', 'value'),
              'Cannot set a key on a non-LiveMap instance',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => counterInstance.set('key', 'value'),
              'Cannot set a key on a non-LiveMap instance',
              { withCode: 92007 },
            );

            await expectToThrowAsync(
              async () => primitiveInstance.remove('key'),
              'Cannot remove a key from a non-LiveMap instance',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => counterInstance.remove('key'),
              'Cannot remove a key from a non-LiveMap instance',
              { withCode: 92007 },
            );

            // counter mutation methods throw errors for non-LiveCounter objects
            await expectToThrowAsync(
              async () => primitiveInstance.increment(),
              'Cannot increment a non-LiveCounter instance',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => mapInstance.increment(),
              'Cannot increment a non-LiveCounter instance',
              {
                withCode: 92007,
              },
            );

            await expectToThrowAsync(
              async () => primitiveInstance.decrement(),
              'Cannot decrement a non-LiveCounter instance',
              { withCode: 92007 },
            );
            await expectToThrowAsync(
              async () => mapInstance.decrement(),
              'Cannot decrement a non-LiveCounter instance',
              {
                withCode: 92007,
              },
            );
          },
        },
      ];

      /** @nospec */
      forScenarios(
        this,
        [
          ...objectSyncSequenceScenarios,
          ...applyOperationsScenarios,
          ...applyOperationsDuringSyncScenarios,
          ...writeApiScenarios,
          ...liveMapEnumerationScenarios,
          ...pathObjectScenarios,
          ...instanceScenarios,
        ],
        async function (helper, scenario, clientOptions, channelName) {
          const objectsHelper = new ObjectsHelper(helper);
          const client = RealtimeWithObjects(helper, clientOptions);

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            const channel = client.channels.get(channelName, channelOptionsWithObjects());
            const realtimeObject = channel.object;

            await channel.attach();
            const root = await realtimeObject.get();
            const entryPathObject = await realtimeObject.getPathObject();

            await scenario.action({
              realtimeObject,
              root,
              entryPathObject,
              objectsHelper,
              channelName,
              channel,
              client,
              helper,
              clientOptions,
            });
          }, client);
        },
      );

      const subscriptionCallbacksScenarios = [
        {
          allTransportsAndProtocols: true,
          description: 'can subscribe to the incoming COUNTER_INC operation on a LiveCounter',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              counter.subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { amount: 1 },
                    'Check counter subscription callback is called with an expected update object for COUNTER_INC operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.counterIncRestOp({
                objectId: sampleCounterObjectId,
                number: 1,
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can subscribe to multiple incoming operations on a LiveCounter',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

            const counter = root.get(sampleCounterKey);
            const expectedCounterIncrements = [100, -100, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
            let currentUpdateIndex = 0;

            const subscriptionPromise = new Promise((resolve, reject) =>
              counter.subscribe((update) => {
                try {
                  const expectedInc = expectedCounterIncrements[currentUpdateIndex];
                  expect(update?.update).to.deep.equal(
                    { amount: expectedInc },
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
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.counterIncRestOp({
                  objectId: sampleCounterObjectId,
                  number: increment,
                }),
              );
            }

            await subscriptionPromise;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can subscribe to the incoming MAP_SET operation on a LiveMap',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { stringKey: 'updated' },
                    'Check map subscription callback is called with an expected update object for MAP_SET operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({
                objectId: sampleMapObjectId,
                key: 'stringKey',
                value: { string: 'stringValue' },
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can subscribe to the incoming MAP_REMOVE operation on a LiveMap',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
                    { stringKey: 'removed' },
                    'Check map subscription callback is called with an expected update object for MAP_REMOVE operation',
                  );
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapRemoveRestOp({
                objectId: sampleMapObjectId,
                key: 'stringKey',
              }),
            );

            await subscriptionPromise;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'subscription update object contains the client metadata of the client who made the update',
          action: async (ctx) => {
            const { root, objectsHelper, channel, channelName, sampleMapKey, sampleCounterKey, helper } = ctx;
            const publishClientId = 'publish-clientId';
            const publishClient = RealtimeWithObjects(helper, { clientId: publishClientId });

            // get the connection ID from the publish client once connected
            let publishConnectionId;

            const createCheckUpdateClientMetadataPromise = (subscribeFn, msg) => {
              return new Promise((resolve, reject) =>
                subscribeFn((update) => {
                  try {
                    expect(update.clientId).to.equal(publishClientId, msg);
                    expect(update.connectionId).to.equal(publishConnectionId, msg);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                }),
              );
            };

            // check client metadata is surfaced for mutation ops
            const mutationOpsPromises = Promise.all([
              createCheckUpdateClientMetadataPromise(
                (cb) => root.get(sampleCounterKey).subscribe(cb),
                'Check counter subscription callback has client metadata for COUNTER_INC operation',
              ),
              createCheckUpdateClientMetadataPromise(
                (cb) =>
                  root.get(sampleMapKey).subscribe((update) => {
                    if (update.update.foo === 'updated') {
                      cb(update);
                    }
                  }),
                'Check map subscription callback has client metadata for MAP_SET operation',
              ),
              createCheckUpdateClientMetadataPromise(
                (cb) =>
                  root.get(sampleMapKey).subscribe((update) => {
                    if (update.update.foo === 'removed') {
                      cb(update);
                    }
                  }),
                'Check map subscription callback has client metadata for MAP_REMOVE operation',
              ),
            ]);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              const publishChannel = publishClient.channels.get(channelName, channelOptionsWithObjects());
              await publishChannel.attach();
              const publishRoot = await publishChannel.object.get();

              // capture the connection ID once the client is connected
              publishConnectionId = publishClient.connection.id;

              await publishRoot.get(sampleCounterKey).increment(1);
              await publishRoot.get(sampleMapKey).set('foo', 'bar');
              await publishRoot.get(sampleMapKey).remove('foo');
            }, publishClient);

            await mutationOpsPromises;

            // check client metadata is surfaced for create ops.
            // first need to create non-initialized objects and then publish create ops for them
            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'nonInitializedCounter'),
              waitForMapKeyUpdate(root, 'nonInitializedMap'),
            ]);

            const fakeCounterObjectId = objectsHelper.fakeCounterObjectId();
            const fakeMapObjectId = objectsHelper.fakeMapObjectId();

            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [
                objectsHelper.mapSetOp({
                  objectId: 'root',
                  key: 'nonInitializedCounter',
                  data: { objectId: fakeCounterObjectId },
                }),
              ],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 0),
              siteCode: 'aaa',
              state: [
                objectsHelper.mapSetOp({
                  objectId: 'root',
                  key: 'nonInitializedMap',
                  data: { objectId: fakeMapObjectId },
                }),
              ],
            });

            await objectsCreatedPromise;

            const createOpsPromises = Promise.all([
              createCheckUpdateClientMetadataPromise(
                (cb) => root.get('nonInitializedCounter').subscribe(cb),
                'Check counter subscription callback has client metadata for COUNTER_CREATE operation',
              ),
              createCheckUpdateClientMetadataPromise(
                (cb) => root.get('nonInitializedMap').subscribe(cb),
                'Check map subscription callback has client metadata for MAP_CREATE operation',
              ),
            ]);

            // and now post create operations which will trigger subscription callbacks
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 1),
              siteCode: 'aaa',
              clientId: publishClientId,
              connectionId: publishConnectionId,
              state: [objectsHelper.counterCreateOp({ objectId: fakeCounterObjectId, count: 1 })],
            });
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 1, 1),
              siteCode: 'aaa',
              clientId: publishClientId,
              connectionId: publishConnectionId,
              state: [
                objectsHelper.mapCreateOp({
                  objectId: fakeMapObjectId,
                  entries: { foo: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { string: 'bar' } } },
                }),
              ],
            });

            await createOpsPromises;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'can subscribe to multiple incoming operations on a LiveMap',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

            const map = root.get(sampleMapKey);
            const expectedMapUpdates = [
              { foo: 'updated' },
              { bar: 'updated' },
              { foo: 'removed' },
              { baz: 'updated' },
              { bar: 'removed' },
            ];
            let currentUpdateIndex = 0;

            const subscriptionPromise = new Promise((resolve, reject) =>
              map.subscribe((update) => {
                try {
                  expect(update?.update).to.deep.equal(
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

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({
                objectId: sampleMapObjectId,
                key: 'foo',
                value: { string: 'something' },
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({
                objectId: sampleMapObjectId,
                key: 'bar',
                value: { string: 'something' },
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapRemoveRestOp({
                objectId: sampleMapObjectId,
                key: 'foo',
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({
                objectId: sampleMapObjectId,
                key: 'baz',
                value: { string: 'something' },
              }),
            );

            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapRemoveRestOp({
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
            const { root, objectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

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
              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.counterIncRestOp({
                  objectId: sampleCounterObjectId,
                  number: 1,
                }),
              );
              await counterUpdatedPromise;
            }

            await subscriptionPromise;

            expect(counter.value()).to.equal(3, 'Check counter has final expected value after all increments');
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can unsubscribe from LiveCounter updates via LiveCounter.unsubscribe() call',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

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
              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.counterIncRestOp({
                  objectId: sampleCounterObjectId,
                  number: 1,
                }),
              );
              await counterUpdatedPromise;
            }

            await subscriptionPromise;

            expect(counter.value()).to.equal(3, 'Check counter has final expected value after all increments');
            expect(callbackCalled).to.equal(1, 'Check subscription callback was only called once');
          },
        },

        {
          description: 'can remove all LiveCounter update listeners via LiveCounter.unsubscribeAll() call',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleCounterKey, sampleCounterObjectId } = ctx;

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
              const counterUpdatedPromise = waitForCounterUpdate(counter);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.counterIncRestOp({
                  objectId: sampleCounterObjectId,
                  number: 1,
                }),
              );
              await counterUpdatedPromise;

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
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

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
              const mapUpdatedPromise = waitForMapKeyUpdate(map, `foo-${i}`);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.mapSetRestOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  value: { string: 'exists' },
                }),
              );
              await mapUpdatedPromise;
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
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

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
              const mapUpdatedPromise = waitForMapKeyUpdate(map, `foo-${i}`);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.mapSetRestOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  value: { string: 'exists' },
                }),
              );
              await mapUpdatedPromise;
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
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

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
              const mapUpdatedPromise = waitForMapKeyUpdate(map, `foo-${i}`);
              await objectsHelper.operationRequest(
                channelName,
                objectsHelper.mapSetRestOp({
                  objectId: sampleMapObjectId,
                  key: `foo-${i}`,
                  value: { string: 'exists' },
                }),
              );
              await mapUpdatedPromise;

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

      /** @nospec */
      forScenarios(this, subscriptionCallbacksScenarios, async function (helper, scenario, clientOptions, channelName) {
        const objectsHelper = new ObjectsHelper(helper);
        const client = RealtimeWithObjects(helper, clientOptions);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get(channelName, channelOptionsWithObjects());

          await channel.attach();
          const root = await channel.object.get();

          const sampleMapKey = 'sampleMap';
          const sampleCounterKey = 'sampleCounter';

          const objectsCreatedPromise = Promise.all([
            waitForMapKeyUpdate(root, sampleMapKey),
            waitForMapKeyUpdate(root, sampleCounterKey),
          ]);
          // prepare map and counter objects for use by the scenario
          const { objectId: sampleMapObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
            mapObjectId: 'root',
            key: sampleMapKey,
            createOp: objectsHelper.mapCreateRestOp(),
          });
          const { objectId: sampleCounterObjectId } = await objectsHelper.createAndSetOnMap(channelName, {
            mapObjectId: 'root',
            key: sampleCounterKey,
            createOp: objectsHelper.counterCreateRestOp(),
          });
          await objectsCreatedPromise;

          await scenario.action({
            root,
            objectsHelper,
            channelName,
            channel,
            sampleMapKey,
            sampleMapObjectId,
            sampleCounterKey,
            sampleCounterObjectId,
            helper,
          });
        }, client);
      });

      it('gcGracePeriod is set from connectionDetails.objectsGCGracePeriod', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          await client.connection.once('connected');

          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const realtimeObject = channel.object;
          const connectionManager = client.connection.connectionManager;
          const connectionDetails = connectionManager.connectionDetails;

          // gcGracePeriod should be set after the initial connection
          helper.recordPrivateApi('read.RealtimeObject.gcGracePeriod');
          expect(
            realtimeObject.gcGracePeriod,
            'Check gcGracePeriod is set after initial connection from connectionDetails.objectsGCGracePeriod',
          ).to.exist;
          helper.recordPrivateApi('read.RealtimeObject.gcGracePeriod');
          expect(realtimeObject.gcGracePeriod).to.equal(
            connectionDetails.objectsGCGracePeriod,
            'Check gcGracePeriod is set to equal connectionDetails.objectsGCGracePeriod',
          );

          const connectionDetailsPromise = connectionManager.once('connectiondetails');

          helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
          helper.recordPrivateApi('call.transport.onProtocolMessage');
          helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
          connectionManager.activeProtocol.getTransport().onProtocolMessage(
            createPM({
              action: 4, // CONNECTED
              connectionDetails: {
                ...connectionDetails,
                objectsGCGracePeriod: 999,
              },
            }),
          );

          helper.recordPrivateApi('listen.connectionManager.connectiondetails');
          await connectionDetailsPromise;
          // wait for next tick to ensure the connectionDetails event was processed by Objects plugin
          await new Promise((res) => nextTick(res));

          helper.recordPrivateApi('read.RealtimeObject.gcGracePeriod');
          expect(realtimeObject.gcGracePeriod).to.equal(999, 'Check gcGracePeriod is updated on new CONNECTED event');
        }, client);
      });

      it('gcGracePeriod has a default value if connectionDetails.objectsGCGracePeriod is missing', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          await client.connection.once('connected');

          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const realtimeObject = channel.object;
          const connectionManager = client.connection.connectionManager;
          const connectionDetails = connectionManager.connectionDetails;

          helper.recordPrivateApi('read.RealtimeObject._DEFAULTS.gcGracePeriod');
          helper.recordPrivateApi('write.RealtimeObject.gcGracePeriod');
          // set gcGracePeriod to a value different from the default
          realtimeObject.gcGracePeriod = ObjectsPlugin.RealtimeObject._DEFAULTS.gcGracePeriod + 1;

          const connectionDetailsPromise = connectionManager.once('connectiondetails');

          // send a CONNECTED event without objectsGCGracePeriod, it should use the default value instead
          helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
          helper.recordPrivateApi('call.transport.onProtocolMessage');
          helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
          connectionManager.activeProtocol.getTransport().onProtocolMessage(
            createPM({
              action: 4, // CONNECTED
              connectionDetails,
            }),
          );

          helper.recordPrivateApi('listen.connectionManager.connectiondetails');
          await connectionDetailsPromise;
          // wait for next tick to ensure the connectionDetails event was processed by Objects plugin
          await new Promise((res) => nextTick(res));

          helper.recordPrivateApi('read.RealtimeObject._DEFAULTS.gcGracePeriod');
          helper.recordPrivateApi('read.RealtimeObject.gcGracePeriod');
          expect(realtimeObject.gcGracePeriod).to.equal(
            ObjectsPlugin.RealtimeObject._DEFAULTS.gcGracePeriod,
            'Check gcGracePeriod is set to a default value if connectionDetails.objectsGCGracePeriod is missing',
          );
        }, client);
      });

      const tombstonesGCScenarios = [
        // for the next tests we need to access the private API of Objects plugin in order to verify that tombstoned entities were indeed deleted after the GC grace period.
        // public API hides that kind of information from the user and returns undefined for tombstoned entities even if realtime client still keeps a reference to them.
        {
          description: 'tombstoned object is removed from the pool after the GC grace period',
          action: async (ctx) => {
            const { objectsHelper, channelName, channel, realtimeObject, helper, waitForGCCycles, client } = ctx;

            const counterCreatedPromise = waitForObjectOperation(helper, client, ObjectsHelper.ACTIONS.COUNTER_CREATE);
            // send a CREATE op, this adds an object to the pool
            const { objectId } = await objectsHelper.operationRequest(
              channelName,
              objectsHelper.counterCreateRestOp({ number: 1 }),
            );
            await counterCreatedPromise;

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            expect(realtimeObject._objectsPool.get(objectId), 'Check object exists in the pool after creation').to
              .exist;

            // inject OBJECT_DELETE for the object. this should tombstone the object and make it inaccessible to the end user, but still keep it in memory in the local pool
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId })],
            });

            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            expect(
              realtimeObject._objectsPool.get(objectId),
              'Check object exists in the pool immediately after OBJECT_DELETE',
            ).to.exist;
            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            helper.recordPrivateApi('call.LiveObject.isTombstoned');
            expect(realtimeObject._objectsPool.get(objectId).isTombstoned()).to.equal(
              true,
              `Check object's "tombstone" flag is set to "true" after OBJECT_DELETE`,
            );

            // we expect 2 cycles to guarantee that grace period has expired, which will always be true based on the test config used
            await waitForGCCycles(2);

            // object should be removed from the local pool entirely now, as the GC grace period has passed
            helper.recordPrivateApi('call.RealtimeObject._objectsPool.get');
            expect(
              realtimeObject._objectsPool.get(objectId),
              'Check object exists does not exist in the pool after the GC grace period expiration',
            ).to.not.exist;
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'tombstoned map entry is removed from the LiveMap after the GC grace period',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, helper, waitForGCCycles } = ctx;

            const keyUpdatedPromise = waitForMapKeyUpdate(root, 'foo');
            // set a key on a root
            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapSetRestOp({ objectId: 'root', key: 'foo', value: { string: 'bar' } }),
            );
            await keyUpdatedPromise;

            expect(root.get('foo')).to.equal('bar', 'Check key "foo" exists on root after MAP_SET');

            const keyUpdatedPromise2 = waitForMapKeyUpdate(root, 'foo');
            // remove the key from the root. this should tombstone the map entry and make it inaccessible to the end user, but still keep it in memory in the underlying map
            await objectsHelper.operationRequest(
              channelName,
              objectsHelper.mapRemoveRestOp({ objectId: 'root', key: 'foo' }),
            );
            await keyUpdatedPromise2;

            expect(root.get('foo'), 'Check key "foo" is inaccessible via public API on root after MAP_REMOVE').to.not
              .exist;
            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            expect(
              root._dataRef.data.get('foo'),
              'Check map entry for "foo" exists on root in the underlying data immediately after MAP_REMOVE',
            ).to.exist;
            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            expect(
              root._dataRef.data.get('foo').tombstone,
              'Check map entry for "foo" on root has "tombstone" flag set to "true" after MAP_REMOVE',
            ).to.exist;

            // we expect 2 cycles to guarantee that grace period has expired, which will always be true based on the test config used
            await waitForGCCycles(2);

            // the entry should be removed from the underlying map now
            helper.recordPrivateApi('read.LiveMap._dataRef.data');
            expect(
              root._dataRef.data.get('foo'),
              'Check map entry for "foo" does not exist on root in the underlying data after the GC grace period expiration',
            ).to.not.exist;
          },
        },
      ];

      /** @nospec */
      forScenarios(this, tombstonesGCScenarios, async function (helper, scenario, clientOptions, channelName) {
        try {
          helper.recordPrivateApi('write.RealtimeObject._DEFAULTS.gcInterval');
          ObjectsPlugin.RealtimeObject._DEFAULTS.gcInterval = 500;

          const objectsHelper = new ObjectsHelper(helper);
          const client = RealtimeWithObjects(helper, clientOptions);

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            const channel = client.channels.get(channelName, channelOptionsWithObjects());
            const realtimeObject = channel.object;

            await channel.attach();
            const root = await channel.object.get();

            helper.recordPrivateApi('read.RealtimeObject.gcGracePeriod');
            const gcGracePeriodOriginal = realtimeObject.gcGracePeriod;
            helper.recordPrivateApi('write.RealtimeObject.gcGracePeriod');
            realtimeObject.gcGracePeriod = 250;

            // helper function to spy on the GC interval callback and wait for a specific number of GC cycles.
            // returns a promise which will resolve when required number of cycles have happened.
            const waitForGCCycles = (cycles) => {
              const onGCIntervalOriginal = realtimeObject._objectsPool._onGCInterval;
              let gcCalledTimes = 0;
              return new Promise((resolve) => {
                helper.recordPrivateApi('replace.RealtimeObject._objectsPool._onGCInterval');
                realtimeObject._objectsPool._onGCInterval = function () {
                  helper.recordPrivateApi('call.RealtimeObject._objectsPool._onGCInterval');
                  onGCIntervalOriginal.call(this);

                  gcCalledTimes++;
                  if (gcCalledTimes >= cycles) {
                    resolve();
                    realtimeObject._objectsPool._onGCInterval = onGCIntervalOriginal;
                  }
                };
              });
            };

            await scenario.action({
              client,
              root,
              objectsHelper,
              channelName,
              channel,
              realtimeObject,
              helper,
              waitForGCCycles,
            });

            helper.recordPrivateApi('write.RealtimeObject.gcGracePeriod');
            realtimeObject.gcGracePeriod = gcGracePeriodOriginal;
          }, client);
        } finally {
          helper.recordPrivateApi('write.RealtimeObject._DEFAULTS.gcInterval');
          ObjectsPlugin.RealtimeObject._DEFAULTS.gcInterval = gcIntervalOriginal;
        }
      });

      const expectAccessApiToThrow = async ({ realtimeObject, map, counter, errorMsg }) => {
        await expectToThrowAsync(async () => realtimeObject.get(), errorMsg);

        expect(() => counter.value()).to.throw(errorMsg);

        expect(() => map.get()).to.throw(errorMsg);
        expect(() => map.size()).to.throw(errorMsg);
        expect(() => [...map.entries()]).to.throw(errorMsg);
        expect(() => [...map.keys()]).to.throw(errorMsg);
        expect(() => [...map.values()]).to.throw(errorMsg);

        for (const obj of [map, counter]) {
          expect(() => obj.subscribe()).to.throw(errorMsg);
          expect(() => obj.unsubscribe(() => {})).not.to.throw(); // this should not throw
          expect(() => obj.unsubscribeAll()).not.to.throw(); // this should not throw
        }
      };

      const expectWriteApiToThrow = async ({ realtimeObject, map, counter, errorMsg }) => {
        await expectToThrowAsync(async () => realtimeObject.batch(), errorMsg);
        await expectToThrowAsync(async () => realtimeObject.createMap(), errorMsg);
        await expectToThrowAsync(async () => realtimeObject.createCounter(), errorMsg);

        await expectToThrowAsync(async () => counter.increment(), errorMsg);
        await expectToThrowAsync(async () => counter.decrement(), errorMsg);

        await expectToThrowAsync(async () => map.set(), errorMsg);
        await expectToThrowAsync(async () => map.remove(), errorMsg);

        for (const obj of [map, counter]) {
          expect(() => obj.unsubscribe(() => {})).not.to.throw(); // this should not throw
          expect(() => obj.unsubscribeAll()).not.to.throw(); // this should not throw
        }
      };

      /** Make sure to call this inside the batch method as batch objects can't be interacted with outside the batch callback */
      const expectAccessBatchApiToThrow = ({ ctx, map, counter, errorMsg }) => {
        expect(() => ctx.get()).to.throw(errorMsg);

        expect(() => counter.value()).to.throw(errorMsg);

        expect(() => map.get()).to.throw(errorMsg);
        expect(() => map.size()).to.throw(errorMsg);
        expect(() => [...map.entries()]).to.throw(errorMsg);
        expect(() => [...map.keys()]).to.throw(errorMsg);
        expect(() => [...map.values()]).to.throw(errorMsg);
      };

      /** Make sure to call this inside the batch method as batch objects can't be interacted with outside the batch callback */
      const expectWriteBatchApiToThrow = ({ ctx, map, counter, errorMsg }) => {
        expect(() => counter.increment()).to.throw(errorMsg);
        expect(() => counter.decrement()).to.throw(errorMsg);

        expect(() => map.set()).to.throw(errorMsg);
        expect(() => map.remove()).to.throw(errorMsg);
      };

      const clientConfigurationScenarios = [
        {
          description: 'public API throws missing object modes error when attached without correct modes',
          action: async (ctx) => {
            const { realtimeObject, channel, map, counter } = ctx;

            // obtain batch context with valid modes first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate missing modes
              channel.modes = [];

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_subscribe" channel mode' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_publish" channel mode' });
            });

            await expectAccessApiToThrow({ realtimeObject, map, counter, errorMsg: '"object_subscribe" channel mode' });
            await expectWriteApiToThrow({ realtimeObject, map, counter, errorMsg: '"object_publish" channel mode' });
          },
        },

        {
          description:
            'public API throws missing object modes error when not yet attached but client options are missing correct modes',
          action: async (ctx) => {
            const { realtimeObject, channel, map, counter, helper } = ctx;

            // obtain batch context with valid modes first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate a situation where we're not yet attached/modes are not received on ATTACHED event
              channel.modes = undefined;
              helper.recordPrivateApi('write.channel.channelOptions.modes');
              channel.channelOptions.modes = [];

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_subscribe" channel mode' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_publish" channel mode' });
            });

            await expectAccessApiToThrow({ realtimeObject, map, counter, errorMsg: '"object_subscribe" channel mode' });
            await expectWriteApiToThrow({ realtimeObject, map, counter, errorMsg: '"object_publish" channel mode' });
          },
        },

        {
          description: 'public API throws invalid channel state error when channel DETACHED',
          action: async (ctx) => {
            const { realtimeObject, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('detached');

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is detached' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is detached' });
            });

            await expectAccessApiToThrow({
              realtimeObject,
              map,
              counter,
              errorMsg: 'failed as channel state is detached',
            });
            await expectWriteApiToThrow({
              realtimeObject,
              map,
              counter,
              errorMsg: 'failed as channel state is detached',
            });
          },
        },

        {
          description: 'public API throws invalid channel state error when channel FAILED',
          action: async (ctx) => {
            const { realtimeObject, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('failed');

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is failed' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is failed' });
            });

            await expectAccessApiToThrow({
              realtimeObject,
              map,
              counter,
              errorMsg: 'failed as channel state is failed',
            });
            await expectWriteApiToThrow({
              realtimeObject,
              map,
              counter,
              errorMsg: 'failed as channel state is failed',
            });
          },
        },

        {
          description: 'public write API throws invalid channel state error when channel SUSPENDED',
          action: async (ctx) => {
            const { realtimeObject, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('suspended');

              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is suspended' });
            });

            await expectWriteApiToThrow({
              realtimeObject,
              map,
              counter,
              errorMsg: 'failed as channel state is suspended',
            });
          },
        },

        {
          description: 'public write API throws invalid channel option when "echoMessages" is disabled',
          action: async (ctx) => {
            const { realtimeObject, client, map, counter, helper } = ctx;

            // obtain batch context with valid client options first
            await realtimeObject.batch((ctx) => {
              const map = ctx.get().get('map');
              const counter = ctx.get().get('counter');
              // now simulate echoMessages was disabled
              helper.recordPrivateApi('write.realtime.options.echoMessages');
              client.options.echoMessages = false;

              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: '"echoMessages" client option' });
            });

            await expectWriteApiToThrow({ realtimeObject, map, counter, errorMsg: '"echoMessages" client option' });
          },
        },
      ];

      /** @nospec */
      forScenarios(this, clientConfigurationScenarios, async function (helper, scenario, clientOptions, channelName) {
        const objectsHelper = new ObjectsHelper(helper);
        const client = RealtimeWithObjects(helper, clientOptions);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          // attach with correct channel modes so we can create Objects on the root for testing.
          // some scenarios will modify the underlying modes array to test specific behavior
          const channel = client.channels.get(channelName, channelOptionsWithObjects());
          const realtimeObject = channel.object;

          await channel.attach();
          const root = await channel.object.get();

          const objectsCreatedPromise = Promise.all([
            waitForMapKeyUpdate(root, 'map'),
            waitForMapKeyUpdate(root, 'counter'),
          ]);
          const map = await realtimeObject.createMap();
          const counter = await realtimeObject.createCounter();
          await root.set('map', map);
          await root.set('counter', counter);
          await objectsCreatedPromise;

          await scenario.action({
            realtimeObject,
            objectsHelper,
            channelName,
            channel,
            root,
            map,
            counter,
            helper,
            client,
          });
        }, client);
      });

      /**
       * @spec TO3l8
       * @spec RSL1i
       */
      it('object message publish respects connectionDetails.maxMessageSize', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          await client.connection.once('connected');

          const connectionManager = client.connection.connectionManager;
          const connectionDetails = connectionManager.connectionDetails;
          const connectionDetailsPromise = connectionManager.once('connectiondetails');

          helper.recordPrivateApi('write.connectionManager.connectionDetails.maxMessageSize');
          connectionDetails.maxMessageSize = 64;

          helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
          helper.recordPrivateApi('call.transport.onProtocolMessage');
          helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
          // forge lower maxMessageSize
          connectionManager.activeProtocol.getTransport().onProtocolMessage(
            createPM({
              action: 4, // CONNECTED
              connectionDetails,
            }),
          );

          helper.recordPrivateApi('listen.connectionManager.connectiondetails');
          await connectionDetailsPromise;

          const channel = client.channels.get('channel', channelOptionsWithObjects());

          await channel.attach();
          const root = await channel.object.get();

          const data = new Array(100).fill('a').join('');
          const error = await expectToThrowAsync(
            async () => root.set('key', data),
            'Maximum size of object messages that can be published at once exceeded',
          );

          expect(error.code).to.equal(40009, 'Check maximum size of messages error has correct error code');
        }, client);
      });

      describe('ObjectMessage message size', () => {
        const objectMessageSizeScenarios = [
          {
            description: 'client id',
            message: objectMessageFromValues({
              clientId: 'my-client',
            }),
            expected: Utils.dataSizeBytes('my-client'),
          },
          {
            description: 'extras',
            message: objectMessageFromValues({
              extras: { foo: 'bar' },
            }),
            expected: Utils.dataSizeBytes('{"foo":"bar"}'),
          },
          {
            description: 'object id',
            message: objectMessageFromValues({
              operation: { objectId: 'object-id' },
            }),
            expected: 0,
          },
          {
            description: 'nonce',
            message: objectMessageFromValues({
              operation: { nonce: '1234567890' },
            }),
            expected: 0,
          },
          {
            description: 'initial value',
            message: objectMessageFromValues({
              operation: { initialValue: JSON.stringify({ counter: { count: 1 } }) },
            }),
            expected: 0,
          },
          {
            description: 'map create op no payload',
            message: objectMessageFromValues({
              operation: { action: 0, objectId: 'object-id' },
            }),
            expected: 0,
          },
          {
            description: 'map create op with object id payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: { 'key-1': { tombstone: false, data: { objectId: 'another-object-id' } } },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1'),
          },
          {
            description: 'map create op with string payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: { semantics: 0, entries: { 'key-1': { tombstone: false, data: { value: 'a string' } } } },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes('a string'),
          },
          {
            description: 'map create op with bytes payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: { 'key-1': { tombstone: false, data: { value: BufferUtils.utf8Encode('my-value') } } },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes(BufferUtils.utf8Encode('my-value')),
          },
          {
            description: 'map create op with boolean payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: {
                    'key-1': { tombstone: false, data: { value: true } },
                    'key-2': { tombstone: false, data: { value: false } },
                  },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes('key-2') + 2,
          },
          {
            description: 'map create op with double payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: {
                    'key-1': { tombstone: false, data: { value: 123.456 } },
                    'key-2': { tombstone: false, data: { value: 0 } },
                  },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes('key-2') + 16,
          },
          {
            description: 'map create op with object payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: { 'key-1': { tombstone: false, data: { value: { foo: 'bar' } } } },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + JSON.stringify({ foo: 'bar' }).length,
          },
          {
            description: 'map create op with array payload',
            message: objectMessageFromValues({
              operation: {
                action: 0,
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: { 'key-1': { tombstone: false, data: { value: ['foo', 'bar', 'baz'] } } },
                },
              },
            }),
            expected: Utils.dataSizeBytes('key-1') + JSON.stringify(['foo', 'bar', 'baz']).length,
          },
          {
            description: 'map remove op',
            message: objectMessageFromValues({
              operation: { action: 2, objectId: 'object-id', mapOp: { key: 'my-key' } },
            }),
            expected: Utils.dataSizeBytes('my-key'),
          },
          {
            description: 'map set operation value=objectId',
            message: objectMessageFromValues({
              operation: {
                action: 1,
                objectId: 'object-id',
                mapOp: { key: 'my-key', data: { objectId: 'another-object-id' } },
              },
            }),
            expected: Utils.dataSizeBytes('my-key'),
          },
          {
            description: 'map set operation value=string',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: 'my-value' } } },
            }),
            expected: Utils.dataSizeBytes('my-key') + Utils.dataSizeBytes('my-value'),
          },
          {
            description: 'map set operation value=bytes',
            message: objectMessageFromValues({
              operation: {
                action: 1,
                objectId: 'object-id',
                mapOp: { key: 'my-key', data: { value: BufferUtils.utf8Encode('my-value') } },
              },
            }),
            expected: Utils.dataSizeBytes('my-key') + Utils.dataSizeBytes(BufferUtils.utf8Encode('my-value')),
          },
          {
            description: 'map set operation value=boolean true',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: true } } },
            }),
            expected: Utils.dataSizeBytes('my-key') + 1,
          },
          {
            description: 'map set operation value=boolean false',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: false } } },
            }),
            expected: Utils.dataSizeBytes('my-key') + 1,
          },
          {
            description: 'map set operation value=double',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: 123.456 } } },
            }),
            expected: Utils.dataSizeBytes('my-key') + 8,
          },
          {
            description: 'map set operation value=double 0',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: 0 } } },
            }),
            expected: Utils.dataSizeBytes('my-key') + 8,
          },
          {
            description: 'map set operation value=json-object',
            message: objectMessageFromValues({
              operation: {
                action: 1,
                objectId: 'object-id',
                mapOp: { key: 'my-key', data: { value: { foo: 'bar' } } },
              },
            }),
            expected: Utils.dataSizeBytes('my-key') + JSON.stringify({ foo: 'bar' }).length,
          },
          {
            description: 'map set operation value=json-array',
            message: objectMessageFromValues({
              operation: {
                action: 1,
                objectId: 'object-id',
                mapOp: { key: 'my-key', data: { value: ['foo', 'bar', 'baz'] } },
              },
            }),
            expected: Utils.dataSizeBytes('my-key') + JSON.stringify(['foo', 'bar', 'baz']).length,
          },
          {
            description: 'map object',
            message: objectMessageFromValues({
              object: {
                objectId: 'object-id',
                map: {
                  semantics: 0,
                  entries: {
                    'key-1': { tombstone: false, data: { value: 'a string' } },
                    'key-2': { tombstone: true, data: { value: 'another string' } },
                  },
                },
                createOp: {
                  action: 0,
                  objectId: 'object-id',
                  map: { semantics: 0, entries: { 'key-3': { tombstone: false, data: { value: 'third string' } } } },
                },
                siteTimeserials: { aaa: lexicoTimeserial('aaa', 111, 111, 1) }, // shouldn't be counted
                tombstone: false,
              },
            }),
            expected:
              Utils.dataSizeBytes('key-1') +
              Utils.dataSizeBytes('a string') +
              Utils.dataSizeBytes('key-2') +
              Utils.dataSizeBytes('another string') +
              Utils.dataSizeBytes('key-3') +
              Utils.dataSizeBytes('third string'),
          },
          {
            description: 'counter create op no payload',
            message: objectMessageFromValues({
              operation: { action: 3, objectId: 'object-id' },
            }),
            expected: 0,
          },
          {
            description: 'counter create op with payload',
            message: objectMessageFromValues({
              operation: { action: 3, objectId: 'object-id', counter: { count: 1234567 } },
            }),
            expected: 8,
          },
          {
            description: 'counter inc op',
            message: objectMessageFromValues({
              operation: { action: 4, objectId: 'object-id', counterOp: { amount: 123.456 } },
            }),
            expected: 8,
          },
          {
            description: 'counter object',
            message: objectMessageFromValues({
              object: {
                objectId: 'object-id',
                counter: { count: 1234567 },
                createOp: {
                  action: 3,
                  objectId: 'object-id',
                  counter: { count: 9876543 },
                },
                siteTimeserials: { aaa: lexicoTimeserial('aaa', 111, 111, 1) }, // shouldn't be counted
                tombstone: false,
              },
            }),
            expected: 8 + 8,
          },
        ];

        /** @nospec */
        forScenarios(this, objectMessageSizeScenarios, function (helper, scenario) {
          const client = RealtimeWithObjects(helper, { autoConnect: false });
          helper.recordPrivateApi('call.ObjectMessage.encode');
          const encodedMessage = scenario.message.encode(client);
          helper.recordPrivateApi('call.BufferUtils.utf8Encode'); // was called by a scenario to create buffers
          helper.recordPrivateApi('call.ObjectMessage.fromValues'); // was called by a scenario to create an ObjectMessage instance
          helper.recordPrivateApi('call.Utils.dataSizeBytes'); // was called by a scenario to calculated the expected byte size
          helper.recordPrivateApi('call.ObjectMessage.getMessageSize');
          expect(encodedMessage.getMessageSize()).to.equal(scenario.expected);
        });
      });
    });

    /** @nospec */
    it('can attach to channel with object modes', async function () {
      const helper = this.test.helper;
      const client = helper.AblyRealtime();

      await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
        const objectsModes = ['object_subscribe', 'object_publish'];
        const channelOptions = { modes: objectsModes };
        const channel = client.channels.get('channel', channelOptions);

        await channel.attach();

        helper.recordPrivateApi('read.channel.channelOptions');
        expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check expected channel options');
        expect(channel.modes).to.deep.equal(objectsModes, 'Check expected modes');
      }, client);
    });

    /** @nospec */
    describe('Sync events', () => {
      /**
       * Helper function to inject an ATTACHED protocol message with or without HAS_OBJECTS flag
       */
      async function injectAttachedMessage(helper, channel, hasObjects) {
        helper.recordPrivateApi('call.connectionManager.activeProtocol.getTransport');
        helper.recordPrivateApi('call.transport.onProtocolMessage');
        helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
        const transport = channel.client.connection.connectionManager.activeProtocol.getTransport();
        const pm = createPM({
          action: 11, // ATTACHED
          channel: channel.name,
          flags: hasObjects ? 1 << 7 : 0, // HAS_OBJECTS flag is bit 7
        });
        await transport.onProtocolMessage(pm);
      }

      const syncEventsScenarios = [
        // 1. ATTACHED with HAS_OBJECTS false

        {
          description:
            'The first ATTACHED should always provoke a SYNCING even when HAS_OBJECTS is false, so that the SYNCED is preceded by SYNCING',
          channelEvents: [{ type: 'attached', hasObjects: false }],
          expectedSyncEvents: ['syncing', 'synced'],
        },

        {
          description: 'ATTACHED with HAS_OBJECTS false once SYNCED emits SYNCING and then SYNCED',
          channelEvents: [
            { type: 'attached', hasObjects: false },
            { type: 'attached', hasObjects: false },
          ],
          expectedSyncEvents: [
            'syncing',
            'synced', // The initial SYNCED
            'syncing',
            'synced', // From the subsequent ATTACHED
          ],
        },

        {
          description:
            "If we're in SYNCING awaiting an OBJECT_SYNC but then instead get an ATTACHED with HAS_OBJECTS false, we should emit a SYNCED",
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'attached', hasObjects: false },
          ],
          expectedSyncEvents: ['syncing', 'synced'],
        },

        // 2. ATTACHED with HAS_OBJECTS true

        {
          description: 'An initial ATTACHED with HAS_OBJECTS true provokes a SYNCING',
          channelEvents: [{ type: 'attached', hasObjects: true }],
          expectedSyncEvents: ['syncing'],
        },

        {
          description:
            "ATTACHED with HAS_OBJECTS true when SYNCED should provoke another SYNCING, because we're waiting to receive the updated objects in an OBJECT_SYNC",
          channelEvents: [
            { type: 'attached', hasObjects: false },
            { type: 'attached', hasObjects: true },
          ],
          expectedSyncEvents: ['syncing', 'synced', 'syncing'],
        },

        {
          description:
            "If we're in SYNCING awaiting an OBJECT_SYNC but then instead get another ATTACHED with HAS_OBJECTS true, we should remain SYNCING (i.e. not emit another event)",
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'attached', hasObjects: true },
          ],
          expectedSyncEvents: ['syncing'],
        },

        // 3. OBJECT_SYNC straight after ATTACHED

        {
          description: 'A complete multi-message OBJECT_SYNC sequence after ATTACHED emits SYNCING and then SYNCED',
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'objectSync', channelSerial: 'foo:1' },
            { type: 'objectSync', channelSerial: 'foo:2' },
            { type: 'objectSync', channelSerial: 'foo:' },
          ],
          expectedSyncEvents: ['syncing', 'synced'],
        },

        {
          description: 'A complete single-message OBJECT_SYNC after ATTACHED emits SYNCING and then SYNCED',
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'objectSync', channelSerial: 'foo:' },
          ],
          expectedSyncEvents: ['syncing', 'synced'],
        },

        {
          description: 'SYNCED is not emitted midway through a multi-message OBJECT_SYNC sequence',
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'objectSync', channelSerial: 'foo:1' },
            { type: 'objectSync', channelSerial: 'foo:2' },
          ],
          expectedSyncEvents: ['syncing'],
        },

        // 4. OBJECT_SYNC when already SYNCED

        {
          description:
            'A complete multi-message OBJECT_SYNC sequence when already SYNCED emits SYNCING and then SYNCED',
          channelEvents: [
            { type: 'attached', hasObjects: false }, // to get us to SYNCED
            { type: 'objectSync', channelSerial: 'foo:1' },
            { type: 'objectSync', channelSerial: 'foo:2' },
            { type: 'objectSync', channelSerial: 'foo:' },
          ],
          expectedSyncEvents: [
            'syncing',
            'synced', // The initial SYNCED
            'syncing',
            'synced', // From the complete OBJECT_SYNC
          ],
        },

        {
          description: 'A complete single-message OBJECT_SYNC when already SYNCED emits SYNCING and then SYNCED',
          channelEvents: [
            { type: 'attached', hasObjects: false }, // to get us to SYNCED
            { type: 'objectSync', channelSerial: 'foo:' },
          ],
          expectedSyncEvents: [
            'syncing',
            'synced', // The initial SYNCED
            'syncing',
            'synced', // From the complete OBJECT_SYNC
          ],
        },

        // 5. New sync sequence in the middle of a sync sequence

        {
          description: 'A new OBJECT_SYNC sequence in the middle of a sync sequence does not provoke another SYNCING',
          channelEvents: [
            { type: 'attached', hasObjects: true },
            { type: 'objectSync', channelSerial: 'foo:1' },
            { type: 'objectSync', channelSerial: 'foo:2' },
            { type: 'objectSync', channelSerial: 'bar:1' },
          ],
          expectedSyncEvents: ['syncing'],
        },
      ];

      forScenarios(this, syncEventsScenarios, async function (helper, scenario, clientOptions, channelName) {
        const client = RealtimeWithObjects(helper, clientOptions);
        const objectsHelper = new ObjectsHelper(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          await client.connection.whenState('connected');

          // Note that we don't attach the channel, so that the only ProtocolMessages the channel receives are those specified by the test scenario.

          const channel = client.channels.get(channelName, channelOptionsWithObjects());
          const objects = channel.objects;

          // Track received sync events
          const receivedSyncEvents = [];

          // Subscribe to syncing and synced events
          objects.on('syncing', () => {
            receivedSyncEvents.push('syncing');
          });
          objects.on('synced', () => {
            receivedSyncEvents.push('synced');
          });

          // Apply the sequence of channel events described by the scenario
          for (const channelEvent of scenario.channelEvents) {
            if (channelEvent.type === 'attached') {
              await injectAttachedMessage(helper, channel, channelEvent.hasObjects);
            } else if (channelEvent.type === 'objectSync') {
              await objectsHelper.processObjectStateMessageOnChannel({
                channel,
                syncSerial: channelEvent.channelSerial,
              });
            }
          }

          // Verify the expected sequence of sync events
          expect(receivedSyncEvents).to.deep.equal(
            scenario.expectedSyncEvents,
            'Check sync events match expected sequence',
          );
        }, client);
      });
    });
  });
});
