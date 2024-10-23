'use strict';

/**
 * LiveObjects helper to create pre-determined state tree on channels
 */
define(['shared_helper'], function (Helper) {
  const ACTIONS = {
    MAP_CREATE: 0,
    MAP_SET: 1,
    MAP_REMOVE: 2,
    COUNTER_CREATE: 3,
    COUNTER_INC: 4,
  };

  function nonce() {
    return Helper.randomString();
  }

  class LiveObjectsHelper {
    constructor(helper) {
      this._rest = helper.AblyRest({ useBinaryProtocol: false });
    }

    /**
     * Creates next LiveObjects state tree on a provided channel name:
     *
     * root "emptyMap" -> Map#1 {} -- empty map
     * root "referencedMap" -> Map#2 { "counterKey": <object id Counter#3> }
     * root "valuesMap" -> Map#3 { "stringKey": "stringValue", "emptyStringKey": "", "bytesKey": <byte array for "{"productId": "001", "productName": "car"}", encoded in base64>, "emptyBytesKey": <empty byte array>, "numberKey": 1, "zeroKey": 0, "trueKey": true, "falseKey": false, "mapKey": <objectId of Map#2> }
     * root "emptyCounter" -> Counter#1 -- no initial value counter, should be 0
     * root "initialValueCounter" -> Counter#2 count=10
     * root "referencedCounter" -> Counter#3 count=20
     */
    async initForChannel(channelName) {
      const emptyCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'emptyCounter',
        createOp: this.counterCreateOp(),
      });
      const initialValueCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'initialValueCounter',
        createOp: this.counterCreateOp({ count: 10 }),
      });
      const referencedCounter = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'referencedCounter',
        createOp: this.counterCreateOp({ count: 20 }),
      });

      const emptyMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'emptyMap',
        createOp: this.mapCreateOp(),
      });
      const referencedMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'referencedMap',
        createOp: this.mapCreateOp({ entries: { counterKey: { data: { objectId: referencedCounter.objectId } } } }),
      });
      const valuesMap = await this.createAndSetOnMap(channelName, {
        mapObjectId: 'root',
        key: 'valuesMap',
        createOp: this.mapCreateOp({
          entries: {
            stringKey: { data: { value: 'stringValue' } },
            emptyStringKey: { data: { value: '' } },
            bytesKey: {
              data: { value: 'eyJwcm9kdWN0SWQiOiAiMDAxIiwgInByb2R1Y3ROYW1lIjogImNhciJ9', encoding: 'base64' },
            },
            emptyBytesKey: { data: { value: '', encoding: 'base64' } },
            numberKey: { data: { value: 1 } },
            zeroKey: { data: { value: 0 } },
            trueKey: { data: { value: true } },
            falseKey: { data: { value: false } },
            mapKey: { data: { objectId: referencedMap.objectId } },
          },
        }),
      });
    }

    async createAndSetOnMap(channelName, opts) {
      const { mapObjectId, key, createOp } = opts;

      const createResult = await this.stateRequest(channelName, createOp);
      await this.stateRequest(
        channelName,
        this.mapSetOp({ objectId: mapObjectId, key, data: { objectId: createResult.objectId } }),
      );

      return createResult;
    }

    mapCreateOp(opts) {
      const { objectId, entries } = opts ?? {};
      const op = {
        operation: {
          action: ACTIONS.MAP_CREATE,
          nonce: nonce(),
          objectId,
        },
      };

      if (entries) {
        op.operation.map = { entries };
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

    async stateRequest(channelName, opBody) {
      if (Array.isArray(opBody)) {
        throw new Error(`Only single object state requests are supported`);
      }

      const method = 'post';
      const path = `/channels/${channelName}/state`;

      const response = await this._rest.request(method, path, 3, null, opBody, null);

      if (response.success) {
        console.log(`${method}: ${path} SUCCESS; operation = ${JSON.stringify(opBody)}; items =`, response.items);
        // only one operation in request, so need only first item.
        const result = response.items[0];
        // extract object id if present
        result.objectId = result.objectIds?.[0];
        return result;
      }

      throw new Error(
        `${method}: ${path} FAILED; http code = ${response.statusCode}, error code = ${response.errorCode}, message = ${response.errorMessage}; operation = ${JSON.stringify(opBody)}`,
      );
    }
  }

  return (module.exports = LiveObjectsHelper);
});
