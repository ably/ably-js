import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { BufferedStateMessage, LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';
import { MapSemantics, StateMessage, StateOperation, StateOperationAction } from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

export const ROOT_OBJECT_ID = 'root';

/**
 * @internal
 */
export class LiveObjectsPool {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _pool: Map<string, LiveObject>;

  constructor(private _liveObjects: LiveObjects) {
    this._client = this._liveObjects.getClient();
    this._channel = this._liveObjects.getChannel();
    this._pool = this._getInitialPool();
  }

  get(objectId: string): LiveObject | undefined {
    return this._pool.get(objectId);
  }

  /**
   * Deletes objects from the pool for which object ids are not found in the provided array of ids.
   */
  deleteExtraObjectIds(objectIds: string[]): void {
    const poolObjectIds = [...this._pool.keys()];
    const extraObjectIds = poolObjectIds.filter((x) => !objectIds.includes(x));

    extraObjectIds.forEach((x) => this._pool.delete(x));
  }

  set(objectId: string, liveObject: LiveObject): void {
    this._pool.set(objectId, liveObject);
  }

  reset(): void {
    this._pool = this._getInitialPool();
  }

  createZeroValueObjectIfNotExists(objectId: string): void {
    if (this.get(objectId)) {
      return;
    }

    const parsedObjectId = ObjectId.fromString(this._client, objectId);
    // use zero value timeserial, so any operation can be applied for this object
    const regionalTimeserial = DefaultTimeserial.zeroValueTimeserial(this._client);
    let zeroValueObject: LiveObject;
    switch (parsedObjectId.type) {
      case 'map': {
        zeroValueObject = LiveMap.zeroValue(this._liveObjects, objectId, regionalTimeserial);
        break;
      }

      case 'counter':
        zeroValueObject = LiveCounter.zeroValue(this._liveObjects, false, objectId, regionalTimeserial);
        break;
    }

    this.set(objectId, zeroValueObject);
  }

  applyStateMessages(stateMessages: StateMessage[], regionalTimeserial: Timeserial): void {
    for (const stateMessage of stateMessages) {
      if (!stateMessage.operation) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'LiveObjects.LiveObjectsPool.applyStateMessages()',
          `state operation message is received without 'operation' field, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const stateOperation = stateMessage.operation;

      switch (stateOperation.action) {
        case StateOperationAction.MAP_CREATE:
        case StateOperationAction.COUNTER_CREATE:
          if (this.get(stateOperation.objectId)) {
            // object wich such id already exists (we may have created a zero-value object before, or this is a duplicate *_CREATE op),
            // so delegate application of the op to that object
            this.get(stateOperation.objectId)!.applyOperation(stateOperation, stateMessage, regionalTimeserial);
            break;
          }

          // otherwise we can create new objects in the pool
          if (stateOperation.action === StateOperationAction.MAP_CREATE) {
            this._handleMapCreate(stateOperation, regionalTimeserial);
          }

          if (stateOperation.action === StateOperationAction.COUNTER_CREATE) {
            this._handleCounterCreate(stateOperation, regionalTimeserial);
          }
          break;

        case StateOperationAction.MAP_SET:
        case StateOperationAction.MAP_REMOVE:
        case StateOperationAction.COUNTER_INC:
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we create a zero-value object for the provided object id, and apply operation for that zero-value object.
          // when we eventually receive a corresponding *_CREATE op for that object, its application will be handled by that zero-value object.
          this.createZeroValueObjectIfNotExists(stateOperation.objectId);
          this.get(stateOperation.objectId)!.applyOperation(stateOperation, stateMessage, regionalTimeserial);
          break;

        default:
          this._client.Logger.logAction(
            this._client.logger,
            this._client.Logger.LOG_MAJOR,
            'LiveObjects.LiveObjectsPool.applyStateMessages()',
            `received unsupported action in state operation message: ${stateOperation.action}, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
          );
      }
    }
  }

  applyBufferedStateMessages(bufferedStateMessages: BufferedStateMessage[]): void {
    // since we receive state operation messages concurrently with the SYNC sequence,
    // we must determine which operation messages should be applied to the now local copy of the object pool, and the rest will be skipped.
    // since messages are delivered in regional order to the client, we can inspect the regional timeserial
    // of each state operation message to know whether it has reached a point in the message stream
    // that is no longer included in the state object snapshot we received from SYNC sequence.
    for (const { regionalTimeserial, stateMessage } of bufferedStateMessages) {
      if (!stateMessage.operation) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'LiveObjects.LiveObjectsPool.applyBufferedStateMessages()',
          `state operation message is received without 'operation' field, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const existingObject = this.get(stateMessage.operation.objectId);
      if (!existingObject) {
        // for object ids we haven't seen yet we can apply operation immediately
        this.applyStateMessages([stateMessage], regionalTimeserial);
        continue;
      }

      // otherwise we need to compare regional timeserials
      if (
        regionalTimeserial.before(existingObject.getRegionalTimeserial()) ||
        regionalTimeserial.equal(existingObject.getRegionalTimeserial())
      ) {
        // the operation's regional timeserial <= the object's timeserial, ignore the operation.
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MICRO,
          'LiveObjects.LiveObjectsPool.applyBufferedStateMessages()',
          `skipping buffered state operation message: op regional timeserial ${regionalTimeserial.toString()} <= object regional timeserial ${existingObject.getRegionalTimeserial().toString()}; objectId=${stateMessage.operation.objectId}, message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      this.applyStateMessages([stateMessage], regionalTimeserial);
    }
  }

  private _getInitialPool(): Map<string, LiveObject> {
    const pool = new Map<string, LiveObject>();
    const root = LiveMap.zeroValue(this._liveObjects, ROOT_OBJECT_ID);
    pool.set(root.getObjectId(), root);
    return pool;
  }

  private _handleCounterCreate(stateOperation: StateOperation, opRegionalTimeserial: Timeserial): void {
    let counter: LiveCounter;
    if (this._client.Utils.isNil(stateOperation.counter)) {
      // if a counter object is missing for the COUNTER_CREATE op, the initial value is implicitly a zero-value counter.
      counter = LiveCounter.zeroValue(this._liveObjects, true, stateOperation.objectId, opRegionalTimeserial);
    } else {
      counter = new LiveCounter(
        this._liveObjects,
        true,
        { data: stateOperation.counter.count ?? 0 },
        stateOperation.objectId,
        opRegionalTimeserial,
      );
    }

    this.set(stateOperation.objectId, counter);
  }

  private _handleMapCreate(stateOperation: StateOperation, opRegionalTimeserial: Timeserial): void {
    let map: LiveMap;
    if (this._client.Utils.isNil(stateOperation.map)) {
      // if a map object is missing for the MAP_CREATE op, the initial value is implicitly a zero-value map.
      map = LiveMap.zeroValue(this._liveObjects, stateOperation.objectId, opRegionalTimeserial);
    } else {
      const objectData = LiveMap.liveMapDataFromMapEntries(this._client, stateOperation.map.entries ?? {});
      map = new LiveMap(
        this._liveObjects,
        stateOperation.map.semantics ?? MapSemantics.LWW,
        objectData,
        stateOperation.objectId,
        opRegionalTimeserial,
      );
    }

    this.set(stateOperation.objectId, map);
  }
}
