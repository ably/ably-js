import type BaseClient from 'common/lib/client/baseclient';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';

export const ROOT_OBJECT_ID = 'root';

/**
 * @internal
 */
export class LiveObjectsPool {
  private _client: BaseClient;
  private _pool: Map<string, LiveObject>;

  constructor(private _liveObjects: LiveObjects) {
    this._client = this._liveObjects.getClient();
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

  private _getInitialPool(): Map<string, LiveObject> {
    const pool = new Map<string, LiveObject>();
    const root = LiveMap.zeroValue(this._liveObjects, ROOT_OBJECT_ID);
    pool.set(root.getObjectId(), root);
    return pool;
  }
}
