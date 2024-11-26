import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';
import { StateMessage, StateOperationAction } from './statemessage';

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
        zeroValueObject = LiveMap.zeroValue(this._liveObjects, objectId);
        break;
      }

      case 'counter':
        zeroValueObject = LiveCounter.zeroValue(this._liveObjects, objectId);
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
        case StateOperationAction.MAP_SET:
        case StateOperationAction.MAP_REMOVE:
        case StateOperationAction.COUNTER_INC:
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we can create a zero-value object for the provided object id and apply the operation to that zero-value object.
          // this also means that all objects are capable of applying the corresponding *_CREATE ops on themselves,
          // since they need to be able to eventually initialize themselves from that *_CREATE op.
          // so to simplify operations handling, we always try to create a zero-value object in the pool first,
          // and then we can always apply the operation on the existing object in the pool.
          this.createZeroValueObjectIfNotExists(stateOperation.objectId);
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
    const root = LiveMap.zeroValue(this._liveObjects, ROOT_OBJECT_ID);
    pool.set(root.getObjectId(), root);
    return pool;
  }
}
