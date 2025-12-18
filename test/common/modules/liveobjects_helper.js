'use strict';

/**
 * Helper class to create pre-determined objects tree on channels and create object messages.
 */
define(['ably', 'shared_helper', 'liveobjects'], function (Ably, Helper, LiveObjectsPlugin) {
  const createPM = Ably.makeProtocolMessageFromDeserialized({ LiveObjectsPlugin });

  const ACTIONS = {
    MAP_CREATE: 0,
    MAP_SET: 1,
    MAP_REMOVE: 2,
    COUNTER_CREATE: 3,
    COUNTER_INC: 4,
    OBJECT_DELETE: 5,
  };
  const ACTION_STRINGS = {
    MAP_CREATE: 'MAP_CREATE',
    MAP_SET: 'MAP_SET',
    MAP_REMOVE: 'MAP_REMOVE',
    COUNTER_CREATE: 'COUNTER_CREATE',
    COUNTER_INC: 'COUNTER_INC',
    OBJECT_DELETE: 'OBJECT_DELETE',
  };

  function nonce() {
    return Helper.randomString();
  }

  class LiveObjectsHelper {
    constructor(helper) {
      this._helper = helper;
      this._rest = helper.AblyRest({ useBinaryProtocol: false });
    }

    static ACTIONS = ACTIONS;

    static fixtureRootKeys() {
      return ['emptyCounter', 'initialValueCounter', 'referencedCounter', 'emptyMap', 'referencedMap', 'valuesMap'];
    }

    /**
     * Sends Objects REST API requests to create objects tree on a provided channel:
     *
     * root "emptyMap" -> Map#1 {} -- empty map
     * root "referencedMap" -> Map#2 { "counterKey": <object id Counter#3> }
     * root "valuesMap" -> Map#3 { "stringKey": "stringValue", "emptyStringKey": "", "bytesKey": <byte array for "{"productId": "001", "productName": "car"}", encoded in base64>, "emptyBytesKey": <empty byte array>, "maxSafeIntegerKey": Number.MAX_SAFE_INTEGER, "negativeMaxSafeIntegerKey": -Number.MAX_SAFE_INTEGER, "numberKey": 1, "zeroKey": 0, "trueKey": true, "falseKey": false, "objectKey": { "foo": "bar" }, "arrayKey": ["foo", "bar", "baz"], "mapKey": <objectId of Map#2> }
     * root "emptyCounter" -> Counter#1 -- no initial value counter, should be 0
     * root "initialValueCounter" -> Counter#2 count=10
     * root "referencedCounter" -> Counter#3 count=20
     */
    async initForChannel(channelName) {
      const emptyCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'emptyCounter',
        createOp: this.counterCreateRestOp(),
      });
      const initialValueCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'initialValueCounter',
        createOp: this.counterCreateRestOp({ number: 10 }),
      });
      const referencedCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'referencedCounter',
        createOp: this.counterCreateRestOp({ number: 20 }),
      });

      const emptyMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'emptyMap',
        createOp: this.mapCreateRestOp(),
      });
      const referencedMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'referencedMap',
        createOp: this.mapCreateRestOp({ data: { counterKey: { objectId: referencedCounter.objectId } } }),
      });
      const valuesMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'valuesMap',
        createOp: this.mapCreateRestOp({
          data: {
            stringKey: { string: 'stringValue' },
            emptyStringKey: { string: '' },
            bytesKey: { bytes: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9' },
            emptyBytesKey: { bytes: '' },
            maxSafeIntegerKey: { number: Number.MAX_SAFE_INTEGER },
            negativeMaxSafeIntegerKey: { number: -Number.MAX_SAFE_INTEGER },
            numberKey: { number: 1 },
            zeroKey: { number: 0 },
            trueKey: { boolean: true },
            falseKey: { boolean: false },
            objectKey: { json: JSON.stringify({ foo: 'bar' }) },
            arrayKey: { json: JSON.stringify(['foo', 'bar', 'baz']) },
            mapKey: { objectId: referencedMap.objectId },
          },
        }),
      });
    }

    // #region Wire Object Messages

    mapCreateOp(opts) {
      const { objectId, entries } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.MAP_CREATE,
          nonce: nonce(),
          objectId,
          map: {
            semantics: 0,
          },
        },
      };

      if (entries) {
        op.operation.map = {
          ...op.operation.map,
          entries,
        };
      }

      return op;
    }

    mapSetOp(opts) {
      const { objectId, key, data } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.MAP_SET,
          objectId,
          mapOp: {
            key,
            data,
          },
        },
      };

      return op;
    }

    mapRemoveOp(opts) {
      const { objectId, key } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.MAP_REMOVE,
          objectId,
          mapOp: {
            key,
          },
        },
      };

      return op;
    }

    counterCreateOp(opts) {
      const { objectId, count } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.COUNTER_CREATE,
          nonce: nonce(),
          objectId,
        },
      };

      if (count != null) {
        op.operation.counter = { count };
      }

      return op;
    }

    counterIncOp(opts) {
      const { objectId, amount } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.COUNTER_INC,
          objectId,
          counterOp: {
            amount,
          },
        },
      };

      return op;
    }

    objectDeleteOp(opts) {
      const { objectId } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.OBJECT_DELETE,
          objectId,
        },
      };

      return op;
    }

    mapObject(opts) {
      const { objectId, siteTimeserials, initialEntries, materialisedEntries, tombstone } = opts;
      const obj = {
        object: {
          objectId,
          siteTimeserials,
          tombstone: tombstone === true,
          map: {
            semantics: 0,
            entries: materialisedEntries,
          },
        },
      };

      if (initialEntries) {
        obj.object.createOp = this.mapCreateOp({ objectId, entries: initialEntries }).operation;
      }

      return obj;
    }

    counterObject(opts) {
      const { objectId, siteTimeserials, initialCount, materialisedCount, tombstone } = opts;
      const obj = {
        object: {
          objectId,
          siteTimeserials,
          tombstone: tombstone === true,
          counter: {
            count: materialisedCount,
          },
        },
      };

      if (initialCount != null) {
        obj.object.createOp = this.counterCreateOp({ objectId, count: initialCount }).operation;
      }

      return obj;
    }

    objectOperationMessage(opts) {
      const { channelName, serial, serialTimestamp, siteCode, state, clientId, connectionId } = opts;

      state?.forEach((objectMessage, i) => {
        objectMessage.serial = serial;
        objectMessage.serialTimestamp = serialTimestamp;
        objectMessage.siteCode = siteCode;
        objectMessage.clientId = clientId;
      });

      return {
        action: 19, // OBJECT
        channel: channelName,
        channelSerial: serial,
        connectionId,
        state: state ?? [],
      };
    }

    objectStateMessage(opts) {
      const { channelName, syncSerial, state, serialTimestamp } = opts;

      state?.forEach((objectMessage, i) => {
        objectMessage.serialTimestamp = serialTimestamp;
      });

      return {
        action: 20, // OBJECT_SYNC
        channel: channelName,
        channelSerial: syncSerial,
        state: state ?? [],
      };
    }

    async processObjectOperationMessageOnChannel(opts) {
      const { channel, ...rest } = opts;

      this._helper.recordPrivateApi('call.channel.processMessage');
      this._helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
      await channel.processMessage(
        createPM(
          this.objectOperationMessage({
            ...rest,
            channelName: channel.name,
          }),
        ),
      );
    }

    async processObjectStateMessageOnChannel(opts) {
      const { channel, ...rest } = opts;

      this._helper.recordPrivateApi('call.channel.processMessage');
      this._helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
      await channel.processMessage(
        createPM(
          this.objectStateMessage({
            ...rest,
            channelName: channel.name,
          }),
        ),
      );
    }

    // #endregion

    // #region REST API Operations

    async createAndSetOnMap(channelName, opts) {
      const { mapObjectId, key, createOp } = opts;

      const createResult = await this.operationRequest(channelName, createOp);
      const objectId = createResult.objectId;
      await this.operationRequest(channelName, this.mapSetRestOp({ objectId: mapObjectId, key, value: { objectId } }));

      return createResult;
    }

    mapCreateRestOp(opts) {
      const { objectId, nonce, data } = opts ?? {};
      const opBody = {
        operation: ACTION_STRINGS.MAP_CREATE,
      };

      if (data) {
        opBody.data = data;
      }

      if (objectId != null) {
        opBody.objectId = objectId;
        opBody.nonce = nonce;
      }

      return opBody;
    }

    mapSetRestOp(opts) {
      const { objectId, key, value } = opts ?? {};
      const opBody = {
        operation: ACTION_STRINGS.MAP_SET,
        objectId,
        data: {
          key,
          value,
        },
      };

      return opBody;
    }

    mapRemoveRestOp(opts) {
      const { objectId, key } = opts ?? {};
      const opBody = {
        operation: ACTION_STRINGS.MAP_REMOVE,
        objectId,
        data: {
          key,
        },
      };

      return opBody;
    }

    counterCreateRestOp(opts) {
      const { objectId, nonce, number } = opts ?? {};
      const opBody = {
        operation: ACTION_STRINGS.COUNTER_CREATE,
      };

      if (number != null) {
        opBody.data = { number };
      }

      if (objectId != null) {
        opBody.objectId = objectId;
        opBody.nonce = nonce;
      }

      return opBody;
    }

    counterIncRestOp(opts) {
      const { objectId, number } = opts ?? {};
      const opBody = {
        operation: ACTION_STRINGS.COUNTER_INC,
        objectId,
        data: { number },
      };

      return opBody;
    }

    async operationRequest(channelName, opBody) {
      if (Array.isArray(opBody)) {
        throw new Error(`Only single object operation requests are supported`);
      }

      const method = 'post';
      const path = `/channels/${channelName}/objects`;

      const response = await this._rest.request(method, path, 3, null, opBody, null);

      if (response.success) {
        // only one operation in the request, so need only the first item.
        const result = response.items[0];
        // extract objectId if present
        result.objectId = result.objectIds?.[0];
        return result;
      }

      throw new Error(
        `${method}: ${path} FAILED; http code = ${response.statusCode}, error code = ${response.errorCode}, message = ${response.errorMessage}; operation = ${JSON.stringify(opBody)}`,
      );
    }

    // #endregion

    fakeMapObjectId() {
      return `map:${Helper.randomString()}@${Date.now()}`;
    }

    fakeCounterObjectId() {
      return `counter:${Helper.randomString()}@${Date.now()}`;
    }
  }

  return (module.exports = LiveObjectsHelper);
});
