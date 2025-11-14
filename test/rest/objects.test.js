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
  const objectsFixturesChannel = 'objects_fixtures';
  const waitFixtureChannelIsReady = ObjectsHelper.waitFixtureChannelIsReady;

  function RealtimeWithObjects(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { Objects: ObjectsPlugin } });
  }

  function RestWithObjects(helper, options) {
    return helper.AblyRest({ ...options, plugins: { Objects: ObjectsPlugin } });
  }

  function expectInstanceOf(object, className, msg) {
    // esbuild changes the name for classes with static method to include an underscore as prefix.
    // so LiveMap becomes _LiveMap. we account for it here.
    expect(object.constructor.name).to.match(new RegExp(`_?${className}`), msg);
  }

  describe('rest/objects', function () {
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

    describe('Rest without Objects plugin', () => {
      /** @nospec */
      it("throws an error when attempting to access the channel's `object` property", function () {
        const helper = this.test.helper;
        const client = helper.AblyRest();
        const channel = client.channels.get('channel');
        expect(() => channel.object).to.throw('Objects plugin not provided');
      });
    });

    describe('Rest with Objects plugin', () => {
      /** @nospec */
      it("returns RestObject class instance when accessing channel's `object` property", function () {
        const helper = this.test.helper;
        const client = RestWithObjects(helper);
        const channel = client.channels.get('channel');
        expectInstanceOf(channel.object, 'RestObject');
      });

      describe('RestObject.get()', () => {
        /** @nospec */
        it('should return undefined for non-existent object ID or path', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get('non-existent');
          const obj = await channel.object.get({ objectId: 'non-existent-id' });
          expect(obj).to.be.undefined;
          const obj2 = await channel.object.get({ path: 'non-existent-path' });
          expect(obj2).to.be.undefined;
        });

        /** @nospec */
        it('should get root object by default', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get(objectsFixturesChannel);

          await waitFixtureChannelIsReady(RealtimeWithObjects(helper), objectsFixturesChannel);

          const root = await channel.object.get();
          expect(root).to.exist;
          expect(root.initialValueCounter).to.equal(10);
        });

        /** @nospec */
        it('should get object with compact=true by default', async function () {
          const helper = this.test.helper;
          const objectsHelper = new ObjectsHelper(helper);
          const client = RestWithObjects(helper);
          const channelName = 'compact-by-default';
          const channel = client.channels.get(channelName);

          await objectsHelper.createAndSetOnMap(channelName, {
            mapObjectId: 'root',
            key: 'foo',
            createOp: objectsHelper.counterCreateRestOp({ number: 5 }),
          });

          const root = await channel.object.get();
          expect(root).to.exist;
          expect(root.foo).to.equal(5);
        });

        /** @nospec */
        it('should get object with compact=false returning expanded structure', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get(objectsFixturesChannel);

          await waitFixtureChannelIsReady(RealtimeWithObjects(helper), objectsFixturesChannel);

          const root = await channel.object.get({ compact: false });

          expect(root).to.exist;
          expect(root.objectId).to.equal('root');
          expect(root.map?.semantics).to.equal('LWW');
          expect(root.map?.entries?.initialValueCounter?.data?.objectId).to.exist;
          expect(root.map?.entries?.initialValueCounter?.data?.counter?.data?.number).to.equal(10);
        });

        /** @nospec */
        it('should get object by specific objectId', async function () {
          const helper = this.test.helper;
          const objectsHelper = new ObjectsHelper(helper);
          const client = RestWithObjects(helper);
          const channelName = 'get-by-objectId';
          const channel = client.channels.get(channelName);

          const { objectId } = await objectsHelper.operationRequest(
            channelName,
            objectsHelper.counterCreateRestOp({ number: 5 }),
          );

          const result = await channel.object.get({ objectId, compact: false });
          expect(result).to.exist;
          expect(result.objectId).to.equal(objectId);
          expect(result.counter).to.exist;
          expect(result.counter.data.number).to.equal(5);
        });

        /** @nospec */
        it('should get object with path parameter', async function () {
          const helper = this.test.helper;
          const objectsHelper = new ObjectsHelper(helper);
          const client = RestWithObjects(helper);
          const channelName = 'get-by-path';
          const channel = client.channels.get(channelName);

          const { objectId } = await objectsHelper.createAndSetOnMap(channelName, {
            mapObjectId: 'root',
            key: 'some-path',
            createOp: objectsHelper.mapCreateRestOp({
              data: {
                foo: { string: 'bar' },
              },
            }),
          });

          const result = await channel.object.get({ path: 'some-path', compact: false });
          expect(result).to.exist;
          expect(result.objectId).to.equal(objectId);
          expect(result.map.entries.foo.data.string).to.equal('bar');
        });

        /** @nospec */
        it('should handle different primitive data types', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get(objectsFixturesChannel);

          await waitFixtureChannelIsReady(RealtimeWithObjects(helper), objectsFixturesChannel);

          const root = await channel.object.get();

          expect(root.emptyCounter).to.equal(0);
          expect(root.initialValueCounter).to.equal(10);
          expect(root.emptyMap).to.deep.equal({});
          expect(root.valuesMap).to.deep.include({
            stringKey: 'stringValue',
            emptyStringKey: '',
            maxSafeIntegerKey: 9007199254740991,
            negativeMaxSafeIntegerKey: -9007199254740991,
            numberKey: 1,
            zeroKey: 0,
            trueKey: true,
            falseKey: false,
            objectKey: '{"foo":"bar"}',
            arrayKey: '["foo","bar","baz"]',
          });

          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(BufferUtils.areBuffersEqual(root.valuesMap.emptyBytesKey, BufferUtils.base64Decode(''))).to.be.true;

          helper.recordPrivateApi('call.BufferUtils.base64Decode');
          helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
          expect(
            BufferUtils.areBuffersEqual(
              root.valuesMap.bytesKey,
              BufferUtils.base64Decode('eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9'),
            ),
          ).to.be.true;
        });
      });

      describe('RestObject.publish()', () => {
        /** @nospec */
        it('should publish single MAP_SET operation', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get('publish-map-set');

          const operation = {
            operation: 'map.set',
            path: 'testKey',
            value: 'testValue',
          };

          const result = await channel.object.publish(operation);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal('publish-map-set');
          expect(result.objectIds).to.be.an('array');
        });

        /** @nospec */
        it('should publish single MAP_CREATE operation', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get('publish-map-create');

          const operation = {
            operation: 'map.create',
            path: 'newMap',
            entries: {
              key1: 'value1',
              key2: 42,
              key3: true,
            },
          };

          const result = await channel.object.publish(operation);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal('publish-map-create');
          expect(result.objectIds).to.be.an('array');
          expect(result.objectIds.length).to.be.greaterThan(0);
        });

        /** @nospec */
        it('should publish single MAP_REMOVE operation', async function () {
          const helper = this.test.helper;
          const objectsHelper = new ObjectsHelper(helper);
          const client = RestWithObjects(helper);
          const channelName = 'publish-map-remove';
          const channel = client.channels.get(channelName);

          // First create a key to remove
          await objectsHelper.operationRequest(
            channelName,
            objectsHelper.mapSetRestOp({
              objectId: 'root',
              key: 'keyToRemove',
              value: { string: 'willBeRemoved' },
            }),
          );

          const operation = {
            operation: 'map.remove',
            objectId: 'root',
            key: 'keyToRemove',
          };

          const result = await channel.object.publish(operation);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal(channelName);
          expect(result.objectIds).to.be.an('array');
        });

        /** @nospec */
        it('should publish single COUNTER_CREATE operation', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get('publish-counter-create');

          const operation = {
            operation: 'counter.create',
            path: 'newCounter',
            count: 10,
          };

          const result = await channel.object.publish(operation);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal('publish-counter-create');
          expect(result.objectIds).to.be.an('array');
          expect(result.objectIds.length).to.be.greaterThan(0);
        });

        /** @nospec */
        it('should publish single COUNTER_INC operation', async function () {
          const helper = this.test.helper;
          const objectsHelper = new ObjectsHelper(helper);
          const client = RestWithObjects(helper);
          const channelName = 'publish-counter-inc';
          const channel = client.channels.get(channelName);

          const { objectId } = await objectsHelper.operationRequest(
            channelName,
            objectsHelper.counterCreateRestOp({ number: 5 }),
          );

          const operation = {
            operation: 'counter.inc',
            objectId: objectId,
            amount: 3,
          };

          const result = await channel.object.publish(operation);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal(channelName);
          expect(result.objectIds).to.be.an('array');
        });

        /** @nospec */
        it('should publish array of operations', async function () {
          const helper = this.test.helper;
          const client = RestWithObjects(helper);
          const channel = client.channels.get('publish-batch');

          const operations = [
            {
              operation: 'map.set',
              path: 'key1',
              value: 'value1',
            },
            {
              operation: 'map.set',
              path: 'key2',
              value: 42,
            },
            {
              operation: 'counter.create',
              path: 'counter1',
              count: 0,
            },
          ];

          const result = await channel.object.publish(operations);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal('publish-batch');
          expect(result.objectIds).to.be.an('array');
        });
      });

      /** @nospec */
      it('should publish multiple operations and verify state changes', async function () {
        const helper = this.test.helper;
        const client = RestWithObjects(helper);
        const channelName = 'publish-retrieve';
        const channel = client.channels.get(channelName);

        const createOperation = {
          operation: 'counter.create',
          path: 'testCounter',
          count: 0,
        };

        const createResult = await channel.object.publish(createOperation);
        const counterObjectId = createResult.objectIds[0];

        const incOperation = {
          operation: 'counter.inc',
          objectId: counterObjectId,
          amount: 5,
        };

        await channel.object.publish(incOperation);

        const operation = {
          operation: 'map.set',
          path: 'integrationKey',
          value: 'integrationValue',
        };

        await channel.object.publish(operation);

        const counterResult = await channel.object.get({
          objectId: counterObjectId,
          compact: false,
        });
        expect(counterResult).to.exist;
        expect(counterResult.counter.data.number).to.equal(5);

        // Get root object to verify counter reference
        const rootResult = await channel.object.get();
        expect(rootResult).to.exist;
        expect(rootResult.testCounter).to.exist;
        expect(rootResult.testCounter.objectId).to.equal(counterObjectId);

        expect(result).to.exist;
        expect(result.integrationKey).to.equal('integrationValue');
      });

      /** @nospec */
      it('should handle complex object operations workflow', async function () {
        const helper = this.test.helper;
        const client = RestWithObjects(helper);
        const channelName = 'integration-3';
        const channel = client.channels.get(channelName);

        // Create a map with initial data
        const mapCreateOperation = {
          operation: 'map.create',
          path: 'complexMap',
          entries: {
            name: 'Test Map',
            version: 1,
            active: true,
          },
        };

        const mapResult = await channel.object.publish(mapCreateOperation);
        const mapObjectId = mapResult.objectIds[0];

        // Add more data to the map
        const mapSetOperation = {
          operation: 'map.set',
          objectId: mapObjectId,
          key: 'description',
          value: 'A test map for complex operations',
        };

        await channel.object.publish(mapSetOperation);

        // Create a counter and reference it in the map
        const counterCreateOperation = {
          operation: 'counter.create',
          path: 'usageCounter',
          count: 1,
        };

        const counterResult = await channel.object.publish(counterCreateOperation);
        const counterObjectId = counterResult.objectIds[0];

        const mapSetCounterRefOperation = {
          operation: 'map.set',
          objectId: mapObjectId,
          key: 'counter',
          value: { objectId: counterObjectId },
        };

        await channel.object.publish(mapSetCounterRefOperation);

        // Verify the complex structure
        const finalResult = await channel.object.get();
        expect(finalResult).to.exist;
        expect(finalResult.complexMap).to.exist;
        expect(finalResult.usageCounter).to.exist;

        const mapContent = await channel.object.get({
          objectId: mapObjectId,
          compact: false,
        });
        expect(mapContent.map.entries.name.data.string).to.equal('Test Map');
        expect(mapContent.map.entries.description.data.string).to.equal('A test map for complex operations');
        expect(mapContent.map.entries.counter.data.objectId).to.equal(counterObjectId);
      });
    });
  });
});
