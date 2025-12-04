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

  function checkKeyDataOnExpandedObject({ helper, keyData, obj, msg }) {
    const { key, data } = keyData;
    if (data.bytes != null) {
      helper.recordPrivateApi('call.BufferUtils.base64Decode');
      helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
      expect(BufferUtils.areBuffersEqual(obj.map.entries[key].data.bytes, BufferUtils.base64Decode(data.bytes)), msg).to
        .be.true;
    } else if (data.json != null) {
      const expectedObject = JSON.parse(data.json);
      expect(obj.map.entries[key].data.json).to.deep.equal(expectedObject, msg);
    } else if (data.string != null) {
      expect(obj.map.entries[key].data.string).to.deep.equal(data.string, msg);
    } else if (data.number != null) {
      expect(obj.map.entries[key].data.number).to.deep.equal(data.number, msg);
    } else if (data.boolean != null) {
      expect(obj.map.entries[key].data.boolean).to.deep.equal(data.boolean, msg);
    }
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
      Helper.testOnJsonMsgpack(
        "throws an error when attempting to access the channel's `object` property",
        async function (options, channelName, helper) {
          const client = helper.AblyRest(options);
          const channel = client.channels.get(channelName);
          expect(() => channel.object).to.throw('Objects plugin not provided');
        },
      );
    });

    describe('Rest with Objects plugin', () => {
      /** @nospec */
      Helper.testOnJsonMsgpack(
        "returns RestObject class instance when accessing channel's `object` property",
        async function (options, channelName, helper) {
          const client = RestWithObjects(helper, options);
          const channel = client.channels.get(channelName);
          expectInstanceOf(channel.object, 'RestObject');
        },
      );

      describe('RestObject.get()', () => {
        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should return undefined for non-existent object ID or path',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);
            const obj = await channel.object.get({ objectId: 'non-existent-id' });
            expect(obj).to.be.undefined;
            const obj2 = await channel.object.get({ path: 'non-existent-path' });
            expect(obj2).to.be.undefined;
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack('should get root object by default', async function (options, channelName, helper) {
          const client = RestWithObjects(helper, options);
          const channel = client.channels.get(objectsFixturesChannel);

          await waitFixtureChannelIsReady(RealtimeWithObjects(helper, options), objectsFixturesChannel);

          const root = await channel.object.get();
          expect(root).to.exist;
          expect(root.initialValueCounter).to.equal(10);
        });

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should get object with compact=true by default',
          async function (options, channelName, helper) {
            const objectsHelper = new ObjectsHelper(helper);
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

            await objectsHelper.createAndSetOnMap(channelName, {
              mapObjectId: 'root',
              key: 'foo',
              createOp: objectsHelper.counterCreateRestOp({ number: 5 }),
            });

            const root = await channel.object.get();
            expect(root).to.exist;
            expect(root.foo).to.equal(5);
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should get object with compact=false returning expanded structure',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(objectsFixturesChannel);

            await waitFixtureChannelIsReady(RealtimeWithObjects(helper, options), objectsFixturesChannel);

            const root = await channel.object.get({ compact: false });

            expect(root).to.exist;
            expect(root.objectId).to.equal('root');
            expect(root.map?.semantics).to.equal('lww');
            expect(root.map?.entries?.initialValueCounter?.data?.objectId).to.exist;
            expect(root.map?.entries?.initialValueCounter?.data?.counter?.data?.number).to.equal(10);
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should get object by specific objectId',
          async function (options, channelName, helper) {
            const objectsHelper = new ObjectsHelper(helper);
            const client = RestWithObjects(helper, options);
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
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should get object with path parameter',
          async function (options, channelName, helper) {
            const objectsHelper = new ObjectsHelper(helper);
            const client = RestWithObjects(helper, options);
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
            expect(result.map.semantics).to.equal('lww');
            expect(result.map.entries.foo.data.string).to.equal('bar');
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should handle different data types for compact objects',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(objectsFixturesChannel);

            await waitFixtureChannelIsReady(RealtimeWithObjects(helper, options), objectsFixturesChannel);

            const obj = await channel.object.get();

            expect(obj.emptyCounter).to.equal(0);
            expect(obj.initialValueCounter).to.equal(10);
            expect(obj.emptyMap).to.deep.equal({});
            expect(obj.valuesMap).to.deep.include({
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

            if (options.useBinaryProtocol === false) {
              // bytes are represented as base64-encoded strings in text protocol
              expect(obj.valuesMap.emptyBytesKey).to.equal('');
              expect(obj.valuesMap.bytesKey).to.equal('eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9');
            } else {
              // bytes are parsed as buffers when using binary protocol
              helper.recordPrivateApi('call.BufferUtils.base64Decode');
              helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
              expect(BufferUtils.areBuffersEqual(obj.valuesMap.emptyBytesKey, BufferUtils.base64Decode(''))).to.be.true;

              helper.recordPrivateApi('call.BufferUtils.base64Decode');
              helper.recordPrivateApi('call.BufferUtils.areBuffersEqual');
              expect(
                BufferUtils.areBuffersEqual(
                  obj.valuesMap.bytesKey,
                  BufferUtils.base64Decode('eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9'),
                ),
              ).to.be.true;
            }
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should handle different data types for expanded objects',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(objectsFixturesChannel);

            await waitFixtureChannelIsReady(RealtimeWithObjects(helper, options), objectsFixturesChannel);

            const obj = await channel.object.get({ compact: false });

            // check primitive data types
            for (const keyData of primitiveKeyData) {
              checkKeyDataOnExpandedObject({
                helper,
                keyData,
                obj: obj.map.entries.valuesMap.data,
                msg: `Check data for key "${keyData.key}" is retrieved correctly in expanded object`,
              });
            }

            // check referenced objects
            expect(obj.map.entries.emptyCounter.data.counter.data.number).to.equal(0);
            expect(obj.map.entries.initialValueCounter.data.counter.data.number).to.equal(10);
            expect(obj.map.entries.emptyMap.data.map.entries).to.deep.equal({});
          },
        );
      });

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

      describe('RestObject.publish()', () => {
        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should publish single MAP_SET operation',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

            const operation = {
              operation: 'map.set',
              path: '',
              key: 'testKey',
              value: 'testValue',
            };

            const result = await channel.object.publish(operation);
            expect(result).to.exist;
            expect(result.messageId).to.exist;
            expect(result.channel).to.equal(channelName);
            expect(result.objectIds).to.be.an('array');

            const obj = await channel.object.get();
            expect(obj).to.exist;
            expect(obj.testKey).to.equal('testValue');
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should handle different data types in MAP_SET operation',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

            // first test primitive data types
            for (const keyData of primitiveKeyData) {
              const { key, data } = keyData;
              let value;
              if (data.bytes != null) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                value = BufferUtils.base64Decode(data.bytes);
              } else if (data.json != null) {
                value = JSON.parse(data.json);
              } else {
                value = data.number ?? data.string ?? data.boolean;
              }

              const operation = {
                operation: 'map.set',
                path: '',
                key,
                value: value,
              };

              const result = await channel.object.publish(operation);
              expect(result).to.exist;
              expect(result.messageId).to.exist;
              expect(result.channel).to.equal(channelName);
              expect(result.objectIds).to.be.an('array');

              // verify value was set correctly
              const obj = await channel.object.get({ compact: false });
              checkKeyDataOnExpandedObject({
                helper,
                keyData,
                obj,
                msg: `Check data was set for a key "${key}" via MAP_SET`,
              });
            }

            // test setting reference to another object
            const counterCreateOperation = {
              operation: 'counter.create',
              path: 'counterRef1',
              count: 1,
            };
            const counterCreateResult = await channel.object.publish(counterCreateOperation);
            const counterObjectId = counterCreateResult.objectIds[0];

            const mapSetCounterRefOperation = {
              operation: 'map.set',
              path: '',
              key: 'counterRef2',
              value: { objectId: counterObjectId },
            };

            await channel.object.publish(mapSetCounterRefOperation);

            const obj = await channel.object.get({ compact: false });

            expect(obj.map.entries.counterRef1.data.objectId).to.equal(
              counterObjectId,
              'Check first counter reference has correct objectId',
            );
            expect(obj.map.entries.counterRef1.data.counter.data.number).to.equal(
              1,
              'Check first counter reference has correct value',
            );

            expect(obj.map.entries.counterRef2.data.objectId).to.equal(
              counterObjectId,
              'Check second counter reference has correct objectId',
            );
            expect(obj.map.entries.counterRef2.data.counter.data.number).to.equal(
              1,
              'Check second counter reference has correct value',
            );

            const compactObj = await channel.object.get();
            expect(compactObj.counterRef1).to.equal(1, 'Check first counter reference value in compact form');
            expect(compactObj.counterRef2).to.equal(1, 'Check second counter reference value in compact form');
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should publish single MAP_CREATE operation',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

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
            expect(result.channel).to.equal(channelName);
            expect(result.objectIds).to.be.an('array');
            expect(result.objectIds.length).to.be.greaterThan(0);
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should handle different data types in MAP_CREATE operation',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

            // first test primitive data types
            const entries = primitiveKeyData.reduce((acc, keyData) => {
              const { key, data } = keyData;
              let value;
              if (data.bytes != null) {
                helper.recordPrivateApi('call.BufferUtils.base64Decode');
                value = BufferUtils.base64Decode(data.bytes);
              } else if (data.json != null) {
                value = JSON.parse(data.json);
              } else {
                value = data.number ?? data.string ?? data.boolean;
              }

              acc[key] = value;
              return acc;
            }, {});

            const operation = {
              operation: 'map.create',
              path: 'map',
              entries,
            };

            const result = await channel.object.publish(operation);
            expect(result).to.exist;
            expect(result.messageId).to.exist;
            expect(result.channel).to.equal(channelName);
            expect(result.objectIds).to.be.an('array');

            // verify values were set correctly
            for (const keyData of primitiveKeyData) {
              const obj = await channel.object.get({ objectId: result.objectIds[0], compact: false });
              checkKeyDataOnExpandedObject({
                helper,
                keyData,
                obj,
                msg: `Check data was set for a key "${keyData.key}" via MAP_CREATE`,
              });
            }

            // test setting reference to another object
            const counterCreateOperation = {
              operation: 'counter.create',
              path: 'counter',
              count: 1,
            };
            const counterCreateResult = await channel.object.publish(counterCreateOperation);
            const counterObjectId = counterCreateResult.objectIds[0];

            const mapCreateCounterRefOperation = {
              operation: 'map.create',
              path: 'mapRef',
              entries: {
                counterRef: { objectId: counterObjectId },
              },
            };
            const mapCreateResult = await channel.object.publish(mapCreateCounterRefOperation);

            const obj = await channel.object.get({ objectId: mapCreateResult.objectIds[0], compact: false });

            expect(obj.map.entries.counterRef.data.objectId).to.equal(
              counterObjectId,
              'Check counter reference has correct objectId',
            );
            expect(obj.map.entries.counterRef.data.counter.data.number).to.equal(
              1,
              'Check counter reference has correct value',
            );
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should publish single MAP_REMOVE operation',
          async function (options, channelName, helper) {
            const objectsHelper = new ObjectsHelper(helper);
            const client = RestWithObjects(helper, options);
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
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should publish single COUNTER_CREATE operation',
          async function (options, channelName, helper) {
            const client = RestWithObjects(helper, options);
            const channel = client.channels.get(channelName);

            const operation = {
              operation: 'counter.create',
              path: 'newCounter',
              count: 10,
            };

            const result = await channel.object.publish(operation);
            expect(result).to.exist;
            expect(result.messageId).to.exist;
            expect(result.channel).to.equal(channelName);
            expect(result.objectIds).to.be.an('array');
            expect(result.objectIds.length).to.be.greaterThan(0);
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack(
          'should publish single COUNTER_INC operation',
          async function (options, channelName, helper) {
            const objectsHelper = new ObjectsHelper(helper);
            const client = RestWithObjects(helper, options);
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
          },
        );

        /** @nospec */
        Helper.testOnJsonMsgpack('should publish array of operations', async function (options, channelName, helper) {
          const client = RestWithObjects(helper, options);
          const channel = client.channels.get(channelName);

          const operations = [
            {
              operation: 'map.set',
              path: '',
              key: 'key1',
              value: 'value1',
            },
            {
              operation: 'map.set',
              path: '',
              key: 'key2',
              value: 42,
            },
            {
              operation: 'counter.create',
              path: 'counter1',
              count: 99,
            },
          ];

          const result = await channel.object.publish(operations);
          expect(result).to.exist;
          expect(result.messageId).to.exist;
          expect(result.channel).to.equal(channelName);
          expect(result.objectIds).to.be.an('array');

          const obj = await channel.object.get();
          expect(obj).to.exist;
          expect(obj.key1).to.equal('value1');
          expect(obj.key2).to.equal(42);
          expect(obj.counter1).to.equal(99);
        });
      });

      /** @nospec */
      Helper.testOnJsonMsgpack(
        'should handle complex object operations workflow',
        async function (options, channelName, helper) {
          const client = RestWithObjects(helper, options);
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
            path: 'counter',
            count: 1,
          };

          const counterResult = await channel.object.publish(counterCreateOperation);
          const counterObjectId = counterResult.objectIds[0];

          const counterIncOperation = {
            operation: 'counter.inc',
            objectId: counterObjectId,
            amount: 10,
          };

          await channel.object.publish(counterIncOperation);

          const mapSetCounterRefOperation = {
            operation: 'map.set',
            objectId: mapObjectId,
            key: 'innerCounter',
            value: { objectId: counterObjectId },
          };

          await channel.object.publish(mapSetCounterRefOperation);

          // Verify the complex structure
          const finalResult = await channel.object.get();
          expect(finalResult).to.exist;
          expect(finalResult).to.deep.include({
            complexMap: {
              name: 'Test Map',
              version: 1,
              active: true,
              description: 'A test map for complex operations',
              innerCounter: 11,
            },
            counter: 11,
          });

          const mapObj = await channel.object.get({
            objectId: mapObjectId,
            compact: false,
          });
          expect(mapObj.map.semantics).to.equal('lww', 'Check map semantics value');
          expect(mapObj.map.entries.name.data.string).to.equal('Test Map', 'Check "name" property has correct value');
          expect(mapObj.map.entries.description.data.string).to.equal(
            'A test map for complex operations',
            'Check "description" property has correct value',
          );
          expect(mapObj.map.entries.innerCounter.data.objectId).to.equal(
            counterObjectId,
            'Check counter reference has correct objectId',
          );
          expect(mapObj.map.entries.innerCounter.data.counter.data.number).to.equal(
            11,
            'Check counter reference has correct value',
          );

          const counterObj = await channel.object.get({
            objectId: counterObjectId,
            compact: false,
          });
          expect(counterObj.counter.data.number).to.equal(11, 'Check counter has correct value');
        },
      );
    });
  });
});
