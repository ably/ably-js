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
  const gcIntervalOriginal = ObjectsPlugin.Objects._DEFAULTS.gcInterval;
  const gcGracePeriodOriginal = ObjectsPlugin.Objects._DEFAULTS.gcGracePeriod;

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

  async function expectToThrowAsync(fn, errorStr) {
    let savedError;
    try {
      await fn();
    } catch (error) {
      expect(error.message).to.have.string(errorStr);
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

  /**
   * The channel with fixture data may not yet be populated by REST API requests made by ObjectsHelper.
   * This function waits for a channel to have all keys set.
   */
  async function waitFixtureChannelIsReady(client) {
    const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
    const objects = channel.objects;
    const expectedKeys = ObjectsHelper.fixtureRootKeys();

    await channel.attach();
    const root = await objects.getRoot();

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
      it("throws an error when attempting to access the channel's `objects` property", async function () {
        const helper = this.test.helper;
        const client = helper.AblyRealtime({ autoConnect: false });
        const channel = client.channels.get('channel');
        expect(() => channel.objects).to.throw('Objects plugin not provided');
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
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'stringKey', data: { value: 'stringValue' } })],
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
      it("returns Objects class instance when accessing channel's `objects` property", async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper, { autoConnect: false });
        const channel = client.channels.get('channel');
        expectInstanceOf(channel.objects, 'Objects');
      });

      /** @nospec */
      it('getRoot() returns LiveMap instance', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

          expectInstanceOf(root, 'LiveMap', 'root object should be of LiveMap type');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns LiveObject with id "root"', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

          helper.recordPrivateApi('call.LiveObject.getObjectId');
          expect(root.getObjectId()).to.equal('root', 'root object should have an object id "root"');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns empty root when no objects exist on a channel', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

          expect(root.size()).to.equal(0, 'Check root has no keys');
        }, client);
      });

      /** @nospec */
      it('getRoot() waits for initial OBJECT_SYNC to be completed before resolving', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          const getRootPromise = objects.getRoot();

          let getRootResolved = false;
          getRootPromise.then(() => {
            getRootResolved = true;
          });

          // give a chance for getRoot() to resolve and proc its handler. it should not
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));
          expect(getRootResolved, 'Check getRoot() is not resolved until OBJECT_SYNC sequence is completed').to.be
            .false;

          await channel.attach();

          // should resolve eventually after attach
          await getRootPromise;
        }, client);
      });

      /** @nospec */
      it('getRoot() resolves immediately when OBJECT_SYNC sequence is completed', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          // wait for sync sequence to complete by accessing root for the first time
          await objects.getRoot();

          let resolvedImmediately = false;
          objects.getRoot().then(() => {
            resolvedImmediately = true;
          });

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(resolvedImmediately, 'Check getRoot() is resolved on next tick').to.be.true;
        }, client);
      });

      /** @nospec */
      it('getRoot() waits for OBJECT_SYNC with empty cursor before resolving', async function () {
        const helper = this.test.helper;
        const objectsHelper = new ObjectsHelper(helper);
        const client = RealtimeWithObjects(helper);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          const channel = client.channels.get('channel', channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          // wait for initial sync sequence to complete
          await objects.getRoot();

          // inject OBJECT_SYNC message to emulate start of a new sequence
          await objectsHelper.processObjectStateMessageOnChannel({
            channel,
            // have cursor so client awaits for additional OBJECT_SYNC messages
            syncSerial: 'serial:cursor',
          });

          let getRootResolved = false;
          let root;
          objects.getRoot().then((value) => {
            getRootResolved = true;
            root = value;
          });

          // wait for next tick to check that getRoot() promise handler didn't proc
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is not resolved while OBJECT_SYNC is in progress').to.be.false;

          // inject final OBJECT_SYNC message
          await objectsHelper.processObjectStateMessageOnChannel({
            channel,
            // no cursor to indicate the end of OBJECT_SYNC messages
            syncSerial: 'serial:',
            state: [
              objectsHelper.mapObject({
                objectId: 'root',
                siteTimeserials: { aaa: lexicoTimeserial('aaa', 0, 0) },
                initialEntries: { key: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 1 } } },
              }),
            ],
          });

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(getRootResolved, 'Check getRoot() is resolved when OBJECT_SYNC sequence has ended').to.be.true;
          expect(root.get('key')).to.equal(1, 'Check new root after OBJECT_SYNC sequence has expected key');
        }, client);
      });

      /** @nospec */
      Helper.testOnAllTransportsAndProtocols(
        this,
        'builds object tree from OBJECT_SYNC sequence on channel attachment',
        function (options, channelName) {
          return async function () {
            const helper = this.test.helper;
            const client = RealtimeWithObjects(helper, options);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              await waitFixtureChannelIsReady(client);

              const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
              const objects = channel.objects;

              await channel.attach();
              const root = await objects.getRoot();

              const counterKeys = ['emptyCounter', 'initialValueCounter', 'referencedCounter'];
              const mapKeys = ['emptyMap', 'referencedMap', 'valuesMap'];
              const rootKeysCount = counterKeys.length + mapKeys.length;

              expect(root, 'Check getRoot() is resolved when OBJECT_SYNC sequence ends').to.exist;
              expect(root.size()).to.equal(rootKeysCount, 'Check root has correct number of keys');

              counterKeys.forEach((key) => {
                const counter = root.get(key);
                expect(counter, `Check counter at key="${key}" in root exists`).to.exist;
                expectInstanceOf(
                  counter,
                  'LiveCounter',
                  `Check counter at key="${key}" in root is of type LiveCounter`,
                );
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
          };
        },
      );

      /** @nospec */
      Helper.testOnAllTransportsAndProtocols(
        this,
        'LiveCounter is initialized with initial value from OBJECT_SYNC sequence',
        function (options, channelName) {
          return async function () {
            const helper = this.test.helper;
            const client = RealtimeWithObjects(helper, options);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              await waitFixtureChannelIsReady(client);

              const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
              const objects = channel.objects;

              await channel.attach();
              const root = await objects.getRoot();

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
          };
        },
      );

      /** @nospec */
      Helper.testOnAllTransportsAndProtocols(
        this,
        'LiveMap is initialized with initial value from OBJECT_SYNC sequence',
        function (options, channelName) {
          return async function () {
            const helper = this.test.helper;
            const client = RealtimeWithObjects(helper, options);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              await waitFixtureChannelIsReady(client);

              const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
              const objects = channel.objects;

              await channel.attach();
              const root = await objects.getRoot();

              const emptyMap = root.get('emptyMap');
              expect(emptyMap.size()).to.equal(0, 'Check empty map in root has no keys');

              const referencedMap = root.get('referencedMap');
              expect(referencedMap.size()).to.equal(1, 'Check referenced map in root has correct number of keys');

              const counterFromReferencedMap = referencedMap.get('counterKey');
              expect(counterFromReferencedMap.value()).to.equal(20, 'Check nested counter has correct value');

              const valuesMap = root.get('valuesMap');
              expect(valuesMap.size()).to.equal(9, 'Check values map in root has correct number of keys');

              expect(valuesMap.get('stringKey')).to.equal(
                'stringValue',
                'Check values map has correct string value key',
              );
              expect(valuesMap.get('emptyStringKey')).to.equal(
                '',
                'Check values map has correct empty string value key',
              );
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
              expect(valuesMap.get('numberKey')).to.equal(1, 'Check values map has correct number value key');
              expect(valuesMap.get('zeroKey')).to.equal(0, 'Check values map has correct zero number value key');
              expect(valuesMap.get('trueKey')).to.equal(true, `Check values map has correct 'true' value key`);
              expect(valuesMap.get('falseKey')).to.equal(false, `Check values map has correct 'false' value key`);

              const mapFromValuesMap = valuesMap.get('mapKey');
              expect(mapFromValuesMap.size()).to.equal(1, 'Check nested map has correct number of keys');
            }, client);
          };
        },
      );

      /** @nospec */
      Helper.testOnAllTransportsAndProtocols(
        this,
        'LiveMap can reference the same object in their keys',
        function (options, channelName) {
          return async function () {
            const helper = this.test.helper;
            const client = RealtimeWithObjects(helper, options);

            await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
              await waitFixtureChannelIsReady(client);

              const channel = client.channels.get(objectsFixturesChannel, channelOptionsWithObjects());
              const objects = channel.objects;

              await channel.attach();
              const root = await objects.getRoot();

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
          };
        },
      );

      const primitiveKeyData = [
        { key: 'stringKey', data: { value: 'stringValue' }, restData: { string: 'stringValue' } },
        { key: 'emptyStringKey', data: { value: '' }, restData: { string: '' } },
        {
          key: 'bytesKey',
          data: { value: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9', encoding: 'base64' },
          restData: { bytes: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9' },
        },
        { key: 'emptyBytesKey', data: { value: '', encoding: 'base64' }, restData: { bytes: '' } },
        {
          key: 'maxSafeIntegerKey',
          data: { value: Number.MAX_SAFE_INTEGER },
          restData: { number: Number.MAX_SAFE_INTEGER },
        },
        {
          key: 'negativeMaxSafeIntegerKey',
          data: { value: -Number.MAX_SAFE_INTEGER },
          restData: { number: -Number.MAX_SAFE_INTEGER },
        },
        { key: 'numberKey', data: { value: 1 }, restData: { number: 1 } },
        { key: 'zeroKey', data: { value: 0 }, restData: { number: 0 } },
        { key: 'trueKey', data: { value: true }, restData: { boolean: true } },
        { key: 'falseKey', data: { value: false }, restData: { boolean: false } },
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
            acc[v.key] = v.restData;
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
          description: 'OBJECT_SYNC sequence with object state "tombstone" property creates tombstoned object',
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
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'bar' } },
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
          description: 'OBJECT_SYNC sequence with object state "tombstone" property deletes existing object',
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
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'bar' } },
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
            'OBJECT_SYNC sequence with object state "tombstone" property triggers subscription callback for existing object',
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
                  expect(update).to.deep.equal(
                    { update: { amount: -1 } },
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
                if (keyData.data.encoding) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
                  expect(
                    BufferUtils.areBuffersEqual(mapObj.get(key), BufferUtils.base64Decode(keyData.data.value)),
                    `Check map "${mapKey}" has correct value for "${key}" key`,
                  ).to.be.true;
                } else {
                  expect(mapObj.get(key)).to.equal(
                    keyData.data.value,
                    `Check map "${mapKey}" has correct value for "${key}" key`,
                  );
                }
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
                  state: [objectsHelper.mapSetOp({ objectId: mapId, key: 'foo', data: { value: 'bar' } })],
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
                      baz: { timeserial: serial, data: { value: 'qux' } },
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
                    value: keyData.restData,
                  }),
                ),
              ),
            );
            await keysUpdatedPromise;

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
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
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
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
                state: [objectsHelper.mapSetOp({ objectId: mapId, key: `foo${i + 1}`, data: { value: 'baz' } })],
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
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
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
                  expect(update).to.deep.equal(
                    { update: { foo: 'removed', baz: 'removed' } },
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
                  expect(update).to.deep.equal(
                    { update: { amount: -1 } },
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
              state: [objectsHelper.mapSetOp({ objectId: mapId1, key: 'baz', data: { value: 'qux' } })],
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
            const { root, objectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, it should not be applied as sync is in progress
            await Promise.all(
              primitiveKeyData.map((keyData) =>
                objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', 0, 0),
                  siteCode: 'aaa',
                  // copy data object as library will modify it
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: { ...keyData.data } })],
                }),
              ),
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
            const { root, objectsHelper, channel, helper } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map((keyData, i) =>
                objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  // copy data object as library will modify it
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: { ...keyData.data } })],
                }),
              ),
            );

            // end the sync with empty cursor
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:',
            });

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
                );
              }
            });
          },
        },

        {
          description: 'buffered object operation messages are discarded when new OBJECT_SYNC sequence starts',
          action: async (ctx) => {
            const { root, objectsHelper, channel } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, expect them to be discarded when sync with new sequence id starts
            await Promise.all(
              primitiveKeyData.map((keyData, i) =>
                objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  // copy data object as library will modify it
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: { ...keyData.data } })],
                }),
              ),
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
              state: [objectsHelper.mapSetOp({ objectId: 'root', key: 'foo', data: { value: 'bar' } })],
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
                    foo1: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo2: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo3: { timeserial: lexicoTimeserial('ccc', 5, 0), data: { value: 'bar' } },
                    foo4: { timeserial: lexicoTimeserial('bbb', 0, 0), data: { value: 'bar' } },
                    foo5: { timeserial: lexicoTimeserial('bbb', 2, 0), data: { value: 'bar' } },
                    foo6: { timeserial: lexicoTimeserial('ccc', 2, 0), data: { value: 'bar' } },
                    foo7: { timeserial: lexicoTimeserial('ccc', 0, 0), data: { value: 'bar' } },
                    foo8: { timeserial: lexicoTimeserial('ccc', 0, 0), data: { value: 'bar' } },
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
                state: [objectsHelper.mapSetOp({ objectId: mapId, key: `foo${i + 1}`, data: { value: 'baz' } })],
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
            const { root, objectsHelper, channel, channelName, helper } = ctx;

            // start new sync sequence with a cursor so client will wait for the next OBJECT_SYNC messages
            await objectsHelper.processObjectStateMessageOnChannel({
              channel,
              syncSerial: 'serial:cursor',
            });

            // inject operations, they should be applied when sync ends
            await Promise.all(
              primitiveKeyData.map((keyData, i) =>
                objectsHelper.processObjectOperationMessageOnChannel({
                  channel,
                  serial: lexicoTimeserial('aaa', i, 0),
                  siteCode: 'aaa',
                  // copy data object as library will modify it
                  state: [objectsHelper.mapSetOp({ objectId: 'root', key: keyData.key, data: { ...keyData.data } })],
                }),
              ),
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
              if (keyData.data.encoding) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after OBJECT_SYNC has ended and buffered operations are applied`,
                );
              }
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
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                const value = keyData.data.encoding ? BufferUtils.base64Decode(keyData.data.value) : keyData.data.value;
                await root.set(keyData.key, value);
              }),
            );
            await keysUpdatedPromise;

            // check everything is applied correctly
            primitiveKeyData.forEach((keyData) => {
              if (keyData.data.encoding) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
                expect(
                  BufferUtils.areBuffersEqual(root.get(keyData.key), BufferUtils.base64Decode(keyData.data.value)),
                  `Check root has correct value for "${keyData.key}" key after LiveMap.set call`,
                ).to.be.true;
              } else {
                expect(root.get(keyData.key)).to.equal(
                  keyData.data.value,
                  `Check root has correct value for "${keyData.key}" key after LiveMap.set call`,
                );
              }
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
            await expectToThrowAsync(async () => map.set('key', {}), 'Map value data type is unsupported');
            await expectToThrowAsync(async () => map.set('key', []), 'Map value data type is unsupported');
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
          description: 'Objects.createCounter sends COUNTER_CREATE operation',
          action: async (ctx) => {
            const { objects } = ctx;

            const counters = await Promise.all(countersFixtures.map(async (x) => objects.createCounter(x.count)));

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
          description: 'LiveCounter created with Objects.createCounter can be assigned to the object tree',
          action: async (ctx) => {
            const { root, objects } = ctx;

            const counterCreatedPromise = waitForMapKeyUpdate(root, 'counter');
            const counter = await objects.createCounter(1);
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
            'Objects.createCounter can return LiveCounter with initial value without applying CREATE operation',
          action: async (ctx) => {
            const { objects, helper } = ctx;

            // prevent publishing of ops to realtime so we guarantee that the initial value doesn't come from a CREATE op
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = () => {};

            const counter = await objects.createCounter(1);
            expect(counter.value()).to.equal(1, `Check counter has expected initial value`);
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'Objects.createCounter can return LiveCounter with initial value from applied CREATE operation',
          action: async (ctx) => {
            const { objects, objectsHelper, helper, channel } = ctx;

            // instead of sending CREATE op to the realtime, echo it immediately to the client
            // with forged initial value so we can check that counter gets initialized with a value from a CREATE op
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = async (objectMessages) => {
              const counterId = objectMessages[0].operation.objectId;
              // this should result execute regular operation application procedure and create an object in the pool with forged initial value
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial: lexicoTimeserial('aaa', 1, 1),
                siteCode: 'aaa',
                state: [objectsHelper.counterCreateOp({ objectId: counterId, count: 10 })],
              });
            };

            const counter = await objects.createCounter(1);

            // counter should be created with forged initial value instead of the actual one
            expect(counter.value()).to.equal(
              10,
              'Check counter value has the expected initial value from a CREATE operation',
            );
          },
        },

        {
          description:
            'initial value is not double counted for LiveCounter from Objects.createCounter when CREATE op is received',
          action: async (ctx) => {
            const { objects, objectsHelper, helper, channel } = ctx;

            // prevent publishing of ops to realtime so we can guarantee order of operations
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = () => {};

            // create counter locally, should have an initial value set
            const counter = await objects.createCounter(1);
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
          description: 'Objects.createCounter throws on invalid input',
          action: async (ctx) => {
            const { root, objects } = ctx;

            await expectToThrowAsync(async () => objects.createCounter(null), 'Counter value should be a valid number');
            await expectToThrowAsync(
              async () => objects.createCounter(Number.NaN),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => objects.createCounter(Number.POSITIVE_INFINITY),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => objects.createCounter(Number.NEGATIVE_INFINITY),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => objects.createCounter('foo'),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(
              async () => objects.createCounter(BigInt(1)),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(async () => objects.createCounter(true), 'Counter value should be a valid number');
            await expectToThrowAsync(
              async () => objects.createCounter(Symbol()),
              'Counter value should be a valid number',
            );
            await expectToThrowAsync(async () => objects.createCounter({}), 'Counter value should be a valid number');
            await expectToThrowAsync(async () => objects.createCounter([]), 'Counter value should be a valid number');
            await expectToThrowAsync(async () => objects.createCounter(root), 'Counter value should be a valid number');
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'Objects.createMap sends MAP_CREATE operation with primitive values',
          action: async (ctx) => {
            const { objects, helper } = ctx;

            const maps = await Promise.all(
              primitiveMapsFixtures.map(async (mapFixture) => {
                const entries = mapFixture.entries
                  ? Object.entries(mapFixture.entries).reduce((acc, [key, keyData]) => {
                      helper.recordPrivateApi('call.BufferUtils.base64Decode');
                      const value = keyData.data.encoding
                        ? BufferUtils.base64Decode(keyData.data.value)
                        : keyData.data.value;
                      acc[key] = value;
                      return acc;
                    }, {})
                  : undefined;

                return objects.createMap(entries);
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
                if (keyData.data.encoding) {
                  helper.recordPrivateApi('call.BufferUtils.base64Decode');
                  helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
                  expect(
                    BufferUtils.areBuffersEqual(map.get(key), BufferUtils.base64Decode(keyData.data.value)),
                    `Check map #${i + 1} has correct value for "${key}" key`,
                  ).to.be.true;
                } else {
                  expect(map.get(key)).to.equal(
                    keyData.data.value,
                    `Check map #${i + 1} has correct value for "${key}" key`,
                  );
                }
              });
            }
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'Objects.createMap sends MAP_CREATE operation with reference to another LiveObject',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, objects } = ctx;

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

            const newMap = await objects.createMap({ counter, map });

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
          description: 'LiveMap created with Objects.createMap can be assigned to the object tree',
          action: async (ctx) => {
            const { root, objects } = ctx;

            const mapCreatedPromise = waitForMapKeyUpdate(root, 'map');
            const counter = await objects.createCounter();
            const map = await objects.createMap({ foo: 'bar', baz: counter });
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
          description: 'Objects.createMap can return LiveMap with initial value without applying CREATE operation',
          action: async (ctx) => {
            const { objects, helper } = ctx;

            // prevent publishing of ops to realtime so we guarantee that the initial value doesn't come from a CREATE op
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = () => {};

            const map = await objects.createMap({ foo: 'bar' });
            expect(map.get('foo')).to.equal('bar', `Check map has expected initial value`);
          },
        },

        {
          allTransportsAndProtocols: true,
          description: 'Objects.createMap can return LiveMap with initial value from applied CREATE operation',
          action: async (ctx) => {
            const { objects, objectsHelper, helper, channel } = ctx;

            // instead of sending CREATE op to the realtime, echo it immediately to the client
            // with forged initial value so we can check that map gets initialized with a value from a CREATE op
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = async (objectMessages) => {
              const mapId = objectMessages[0].operation.objectId;
              // this should result execute regular operation application procedure and create an object in the pool with forged initial value
              await objectsHelper.processObjectOperationMessageOnChannel({
                channel,
                serial: lexicoTimeserial('aaa', 1, 1),
                siteCode: 'aaa',
                state: [
                  objectsHelper.mapCreateOp({
                    objectId: mapId,
                    entries: { baz: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { value: 'qux' } } },
                  }),
                ],
              });
            };

            const map = await objects.createMap({ foo: 'bar' });

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
            'initial value is not double counted for LiveMap from Objects.createMap when CREATE op is received',
          action: async (ctx) => {
            const { objects, objectsHelper, helper, channel } = ctx;

            // prevent publishing of ops to realtime so we can guarantee order of operations
            helper.recordPrivateApi('replace.Objects.publish');
            objects.publish = () => {};

            // create map locally, should have an initial value set
            const map = await objects.createMap({ foo: 'bar' });
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
                    foo: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { value: 'qux' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 1, 1), data: { value: 'qux' } },
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
          description: 'Objects.createMap throws on invalid input',
          action: async (ctx) => {
            const { root, objects } = ctx;

            await expectToThrowAsync(async () => objects.createMap(null), 'Map entries should be a key-value object');
            await expectToThrowAsync(async () => objects.createMap('foo'), 'Map entries should be a key-value object');
            await expectToThrowAsync(async () => objects.createMap(1), 'Map entries should be a key-value object');
            await expectToThrowAsync(
              async () => objects.createMap(BigInt(1)),
              'Map entries should be a key-value object',
            );
            await expectToThrowAsync(async () => objects.createMap(true), 'Map entries should be a key-value object');
            await expectToThrowAsync(
              async () => objects.createMap(Symbol()),
              'Map entries should be a key-value object',
            );

            await expectToThrowAsync(
              async () => objects.createMap({ key: undefined }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => objects.createMap({ key: null }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => objects.createMap({ key: BigInt(1) }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(
              async () => objects.createMap({ key: Symbol() }),
              'Map value data type is unsupported',
            );
            await expectToThrowAsync(async () => objects.createMap({ key: {} }), 'Map value data type is unsupported');
            await expectToThrowAsync(async () => objects.createMap({ key: [] }), 'Map value data type is unsupported');
          },
        },

        {
          description: 'batch API getRoot method is synchronous',
          action: async (ctx) => {
            const { objects } = ctx;

            await objects.batch((ctx) => {
              const root = ctx.getRoot();
              expect(root, 'Check getRoot method in a BatchContext returns root object synchronously').to.exist;
              expectInstanceOf(root, 'LiveMap', 'root object obtained from a BatchContext is a LiveMap');
            });
          },
        },

        {
          description: 'batch API .get method on a map returns BatchContext* wrappers for objects',
          action: async (ctx) => {
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ innerCounter: counter });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await objects.batch((ctx) => {
              const ctxRoot = ctx.getRoot();
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await objects.batch((ctx) => {
              const ctxRoot = ctx.getRoot();
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await objects.batch((ctx) => {
              const ctxRoot = ctx.getRoot();
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            await objects.batch((ctx) => {
              const ctxRoot = ctx.getRoot();
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
            const { objects } = ctx;

            let caughtError;
            try {
              await objects.batch((ctx) => {});
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            const cancelError = new Error('cancel batch');
            let caughtError;
            try {
              await objects.batch((ctx) => {
                const ctxRoot = ctx.getRoot();
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            let savedCtx;
            let savedCtxCounter;
            let savedCtxMap;

            await objects.batch((ctx) => {
              const ctxRoot = ctx.getRoot();
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
            const { root, objects } = ctx;

            const objectsCreatedPromise = Promise.all([
              waitForMapKeyUpdate(root, 'counter'),
              waitForMapKeyUpdate(root, 'map'),
            ]);
            const counter = await objects.createCounter(1);
            const map = await objects.createMap({ foo: 'bar' });
            await root.set('counter', counter);
            await root.set('map', map);
            await objectsCreatedPromise;

            let savedCtx;
            let savedCtxCounter;
            let savedCtxMap;

            let caughtError;
            try {
              await objects.batch((ctx) => {
                const ctxRoot = ctx.getRoot();
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
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'bar' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'qux' }, tombstone: true },
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
            const { root, objectsHelper, channel, objects } = ctx;

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
                    foo: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'bar' } },
                    baz: { timeserial: lexicoTimeserial('aaa', 0, 0), data: { value: 'qux' }, tombstone: true },
                  },
                }),
              ],
            });

            const counter1 = await root.get('counter1');

            await objects.batch(async (ctx) => {
              const ctxRoot = ctx.getRoot();

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

      /** @nospec */
      forScenarios(
        this,
        [
          ...objectSyncSequenceScenarios,
          ...applyOperationsScenarios,
          ...applyOperationsDuringSyncScenarios,
          ...writeApiScenarios,
          ...liveMapEnumerationScenarios,
        ],
        async function (helper, scenario, clientOptions, channelName) {
          const objectsHelper = new ObjectsHelper(helper);
          const client = RealtimeWithObjects(helper, clientOptions);

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            const channel = client.channels.get(channelName, channelOptionsWithObjects());
            const objects = channel.objects;

            await channel.attach();
            const root = await objects.getRoot();

            await scenario.action({ objects, root, objectsHelper, channelName, channel, client, helper });
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
                  expect(update).to.deep.equal(
                    { update: { amount: 1 } },
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
                  expect(update).to.deep.equal(
                    { update: { amount: expectedInc } },
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
          description: 'can subscribe to multiple incoming operations on a LiveMap',
          action: async (ctx) => {
            const { root, objectsHelper, channelName, sampleMapKey, sampleMapObjectId } = ctx;

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
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

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
          });
        }, client);
      });

      const tombstonesGCScenarios = [
        // for the next tests we need to access the private API of Objects plugin in order to verify that tombstoned entities were indeed deleted after the GC grace period.
        // public API hides that kind of information from the user and returns undefined for tombstoned entities even if realtime client still keeps a reference to them.
        {
          description: 'tombstoned object is removed from the pool after the GC grace period',
          action: async (ctx) => {
            const { objectsHelper, channelName, channel, objects, helper, waitForGCCycles, client } = ctx;

            const counterCreatedPromise = waitForObjectOperation(helper, client, ObjectsHelper.ACTIONS.COUNTER_CREATE);
            // send a CREATE op, this adds an object to the pool
            const { objectId } = await objectsHelper.operationRequest(
              channelName,
              objectsHelper.counterCreateRestOp({ number: 1 }),
            );
            await counterCreatedPromise;

            helper.recordPrivateApi('call.Objects._objectsPool.get');
            expect(objects._objectsPool.get(objectId), 'Check object exists in the pool after creation').to.exist;

            // inject OBJECT_DELETE for the object. this should tombstone the object and make it inaccessible to the end user, but still keep it in memory in the local pool
            await objectsHelper.processObjectOperationMessageOnChannel({
              channel,
              serial: lexicoTimeserial('aaa', 0, 0),
              siteCode: 'aaa',
              state: [objectsHelper.objectDeleteOp({ objectId })],
            });

            helper.recordPrivateApi('call.Objects._objectsPool.get');
            expect(
              objects._objectsPool.get(objectId),
              'Check object exists in the pool immediately after OBJECT_DELETE',
            ).to.exist;
            helper.recordPrivateApi('call.Objects._objectsPool.get');
            helper.recordPrivateApi('call.LiveObject.isTombstoned');
            expect(objects._objectsPool.get(objectId).isTombstoned()).to.equal(
              true,
              `Check object's "tombstone" flag is set to "true" after OBJECT_DELETE`,
            );

            // we expect 2 cycles to guarantee that grace period has expired, which will always be true based on the test config used
            await waitForGCCycles(2);

            // object should be removed from the local pool entirely now, as the GC grace period has passed
            helper.recordPrivateApi('call.Objects._objectsPool.get');
            expect(
              objects._objectsPool.get(objectId),
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
          helper.recordPrivateApi('write.Objects._DEFAULTS.gcInterval');
          ObjectsPlugin.Objects._DEFAULTS.gcInterval = 500;
          helper.recordPrivateApi('write.Objects._DEFAULTS.gcGracePeriod');
          ObjectsPlugin.Objects._DEFAULTS.gcGracePeriod = 250;

          const objectsHelper = new ObjectsHelper(helper);
          const client = RealtimeWithObjects(helper, clientOptions);

          await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
            const channel = client.channels.get(channelName, channelOptionsWithObjects());
            const objects = channel.objects;

            await channel.attach();
            const root = await objects.getRoot();

            // helper function to spy on the GC interval callback and wait for a specific number of GC cycles.
            // returns a promise which will resolve when required number of cycles have happened.
            const waitForGCCycles = (cycles) => {
              const onGCIntervalOriginal = objects._objectsPool._onGCInterval;
              let gcCalledTimes = 0;
              return new Promise((resolve) => {
                helper.recordPrivateApi('replace.Objects._objectsPool._onGCInterval');
                objects._objectsPool._onGCInterval = function () {
                  helper.recordPrivateApi('call.Objects._objectsPool._onGCInterval');
                  onGCIntervalOriginal.call(this);

                  gcCalledTimes++;
                  if (gcCalledTimes >= cycles) {
                    resolve();
                    objects._objectsPool._onGCInterval = onGCIntervalOriginal;
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
              objects,
              helper,
              waitForGCCycles,
            });
          }, client);
        } finally {
          helper.recordPrivateApi('write.Objects._DEFAULTS.gcInterval');
          ObjectsPlugin.Objects._DEFAULTS.gcInterval = gcIntervalOriginal;
          helper.recordPrivateApi('write.Objects._DEFAULTS.gcGracePeriod');
          ObjectsPlugin.Objects._DEFAULTS.gcGracePeriod = gcGracePeriodOriginal;
        }
      });

      const expectAccessApiToThrow = async ({ objects, map, counter, errorMsg }) => {
        await expectToThrowAsync(async () => objects.getRoot(), errorMsg);

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

      const expectWriteApiToThrow = async ({ objects, map, counter, errorMsg }) => {
        await expectToThrowAsync(async () => objects.batch(), errorMsg);
        await expectToThrowAsync(async () => objects.createMap(), errorMsg);
        await expectToThrowAsync(async () => objects.createCounter(), errorMsg);

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
        expect(() => ctx.getRoot()).to.throw(errorMsg);

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

      const channelConfigurationScenarios = [
        {
          description: 'public API throws missing object modes error when attached without correct modes',
          action: async (ctx) => {
            const { objects, channel, map, counter } = ctx;

            // obtain batch context with valid modes first
            await objects.batch((ctx) => {
              const map = ctx.getRoot().get('map');
              const counter = ctx.getRoot().get('counter');
              // now simulate missing modes
              channel.modes = [];

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_subscribe" channel mode' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_publish" channel mode' });
            });

            await expectAccessApiToThrow({ objects, map, counter, errorMsg: '"object_subscribe" channel mode' });
            await expectWriteApiToThrow({ objects, map, counter, errorMsg: '"object_publish" channel mode' });
          },
        },

        {
          description:
            'public API throws missing object modes error when not yet attached but client options are missing correct modes',
          action: async (ctx) => {
            const { objects, channel, map, counter, helper } = ctx;

            // obtain batch context with valid modes first
            await objects.batch((ctx) => {
              const map = ctx.getRoot().get('map');
              const counter = ctx.getRoot().get('counter');
              // now simulate a situation where we're not yet attached/modes are not received on ATTACHED event
              channel.modes = undefined;
              helper.recordPrivateApi('write.channel.channelOptions.modes');
              channel.channelOptions.modes = [];

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_subscribe" channel mode' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: '"object_publish" channel mode' });
            });

            await expectAccessApiToThrow({ objects, map, counter, errorMsg: '"object_subscribe" channel mode' });
            await expectWriteApiToThrow({ objects, map, counter, errorMsg: '"object_publish" channel mode' });
          },
        },

        {
          description: 'public API throws invalid channel state error when channel DETACHED',
          action: async (ctx) => {
            const { objects, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await objects.batch((ctx) => {
              const map = ctx.getRoot().get('map');
              const counter = ctx.getRoot().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('detached');

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is detached' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is detached' });
            });

            await expectAccessApiToThrow({
              objects,
              map,
              counter,
              errorMsg: 'failed as channel state is detached',
            });
            await expectWriteApiToThrow({ objects, map, counter, errorMsg: 'failed as channel state is detached' });
          },
        },

        {
          description: 'public API throws invalid channel state error when channel FAILED',
          action: async (ctx) => {
            const { objects, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await objects.batch((ctx) => {
              const map = ctx.getRoot().get('map');
              const counter = ctx.getRoot().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('failed');

              expectAccessBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is failed' });
              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is failed' });
            });

            await expectAccessApiToThrow({
              objects,
              map,
              counter,
              errorMsg: 'failed as channel state is failed',
            });
            await expectWriteApiToThrow({ objects, map, counter, errorMsg: 'failed as channel state is failed' });
          },
        },

        {
          description: 'public write API throws invalid channel state error when channel SUSPENDED',
          action: async (ctx) => {
            const { objects, channel, map, counter, helper } = ctx;

            // obtain batch context with valid channel state first
            await objects.batch((ctx) => {
              const map = ctx.getRoot().get('map');
              const counter = ctx.getRoot().get('counter');
              // now simulate channel state change
              helper.recordPrivateApi('call.channel.requestState');
              channel.requestState('suspended');

              expectWriteBatchApiToThrow({ ctx, map, counter, errorMsg: 'failed as channel state is suspended' });
            });

            await expectWriteApiToThrow({
              objects,
              map,
              counter,
              errorMsg: 'failed as channel state is suspended',
            });
          },
        },
      ];

      /** @nospec */
      forScenarios(this, channelConfigurationScenarios, async function (helper, scenario, clientOptions, channelName) {
        const objectsHelper = new ObjectsHelper(helper);
        const client = RealtimeWithObjects(helper, clientOptions);

        await helper.monitorConnectionThenCloseAndFinishAsync(async () => {
          // attach with correct channel modes so we can create Objects on the root for testing.
          // some scenarios will modify the underlying modes array to test specific behavior
          const channel = client.channels.get(channelName, channelOptionsWithObjects());
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

          const objectsCreatedPromise = Promise.all([
            waitForMapKeyUpdate(root, 'map'),
            waitForMapKeyUpdate(root, 'counter'),
          ]);
          const map = await objects.createMap();
          const counter = await objects.createCounter();
          await root.set('map', map);
          await root.set('counter', counter);
          await objectsCreatedPromise;

          await scenario.action({ objects, objectsHelper, channelName, channel, root, map, counter, helper });
        }, client);
      });

      /**
       * @spec TO3l8
       * @spec RSL1i
       */
      it('object message publish respects connectionDetails.maxMessageSize', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithObjects(helper, { clientId: 'test' });

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
          const objects = channel.objects;

          await channel.attach();
          const root = await objects.getRoot();

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
            description: 'map create op no payload',
            message: objectMessageFromValues({
              operation: { action: 0, objectId: 'object-id' },
            }),
            expected: 0,
          },
          {
            description: 'map create op with object payload',
            message: objectMessageFromValues(
              {
                operation: {
                  action: 0,
                  objectId: 'object-id',
                  map: {
                    semantics: 0,
                    entries: { 'key-1': { tombstone: false, data: { objectId: 'another-object-id' } } },
                  },
                },
              },
              MessageEncoding,
            ),
            expected: Utils.dataSizeBytes('key-1'),
          },
          {
            description: 'map create op with string payload',
            message: objectMessageFromValues(
              {
                operation: {
                  action: 0,
                  objectId: 'object-id',
                  map: { semantics: 0, entries: { 'key-1': { tombstone: false, data: { value: 'a string' } } } },
                },
              },
              MessageEncoding,
            ),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes('a string'),
          },
          {
            description: 'map create op with bytes payload',
            message: objectMessageFromValues(
              {
                operation: {
                  action: 0,
                  objectId: 'object-id',
                  map: {
                    semantics: 0,
                    entries: { 'key-1': { tombstone: false, data: { value: BufferUtils.utf8Encode('my-value') } } },
                  },
                },
              },
              MessageEncoding,
            ),
            expected: Utils.dataSizeBytes('key-1') + Utils.dataSizeBytes(BufferUtils.utf8Encode('my-value')),
          },
          {
            description: 'map create op with boolean payload',
            message: objectMessageFromValues(
              {
                operation: {
                  action: 0,
                  objectId: 'object-id',
                  map: { semantics: 0, entries: { 'key-1': { tombstone: false, data: { value: true } } } },
                },
              },
              MessageEncoding,
            ),
            expected: Utils.dataSizeBytes('key-1') + 1,
          },
          {
            description: 'map remove op',
            message: objectMessageFromValues({
              operation: { action: 2, objectId: 'object-id', mapOp: { key: 'my-key' } },
            }),
            expected: Utils.dataSizeBytes('my-key'),
          },
          {
            description: 'map set operation value=object',
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
            description: 'map set operation value=boolean',
            message: objectMessageFromValues({
              operation: { action: 1, objectId: 'object-id', mapOp: { key: 'my-key', data: { value: true } } },
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
          helper.recordPrivateApi('call.ObjectMessage.encode');
          ObjectsPlugin.ObjectMessage.encode(scenario.message);
          helper.recordPrivateApi('call.BufferUtils.utf8Encode'); // was called by a scenario to create buffers
          helper.recordPrivateApi('call.ObjectMessage.fromValues'); // was called by a scenario to create an ObjectMessage instance
          helper.recordPrivateApi('call.Utils.dataSizeBytes'); // was called by a scenario to calculated the expected byte size
          helper.recordPrivateApi('call.ObjectMessage.getMessageSize');
          expect(scenario.message.getMessageSize()).to.equal(scenario.expected);
        });
      });
    });

    /** @nospec */
    it('can attach to channel with Objects modes', async function () {
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
  });
});
