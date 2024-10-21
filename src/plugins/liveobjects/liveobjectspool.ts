import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';
import { MapSemantics, StateMessage, StateOperation, StateOperationAction } from './statemessage';

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
    let zeroValueObject: LiveObject;
    switch (parsedObjectId.type) {
      case 'map': {
        zeroValueObject = new LiveMap(this._liveObjects, MapSemantics.LWW, null, objectId);
        break;
      }

      case 'counter':
        zeroValueObject = new LiveCounter(this._liveObjects, false, null, objectId);
        break;
    }

    this.set(objectId, zeroValueObject);
  }

  applyStateMessages(stateMessages: StateMessage[]): void {
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
            // TODO: invoke subscription callbacks for an object when applied
            this.get(stateOperation.objectId)!.applyOperation(stateOperation, stateMessage);
            break;
          }

          // otherwise we can create new objects in the pool
          if (stateOperation.counter) {
            this._handleCounterCreate(stateOperation);
          } else if (stateOperation.map) {
            this._handleMapCreate(stateOperation);
          } else {
            this._client.Logger.logAction(
              this._client.logger,
              this._client.Logger.LOG_MAJOR,
              'LiveObjects.LiveObjectsPool.applyStateMessages()',
              `received unsupported operation in state operation message, expected 'counter' or 'map' to be present, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
            );
          }
          break;

        case StateOperationAction.MAP_SET:
        case StateOperationAction.MAP_REMOVE:
        case StateOperationAction.COUNTER_INC:
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we create a zero-value object for the provided object id, and apply operation for that zero-value object.
          // when we eventually receive a corresponding *_CREATE op for that object, its application will be handled by that zero-value object.
          this.createZeroValueObjectIfNotExists(stateOperation.objectId);
          // TODO: invoke subscription callbacks for an object when applied
          this.get(stateOperation.objectId)!.applyOperation(stateOperation, stateMessage);
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

  private _getInitialPool(): Map<string, LiveObject> {
    const pool = new Map<string, LiveObject>();
    const root = new LiveMap(this._liveObjects, MapSemantics.LWW, null, ROOT_OBJECT_ID);
    pool.set(root.getObjectId(), root);
    return pool;
  }

  private _handleCounterCreate(stateOperation: StateOperation): void {
    const counter = stateOperation.counter!;
    this.set(
      stateOperation.objectId,
      new LiveCounter(this._liveObjects, true, { data: counter.count ?? 0 }, stateOperation.objectId),
    );
  }

  private _handleMapCreate(stateOperation: StateOperation): void {
    const map = stateOperation.map!;
    const objectData = LiveMap.liveMapDataFromMapEntries(this._client, map.entries ?? {});

    this.set(
      stateOperation.objectId,
      new LiveMap(this._liveObjects, map.semantics ?? MapSemantics.LWW, objectData, stateOperation.objectId),
    );
  }
}
