import type BaseClient from 'common/lib/client/baseclient';
import { DEFAULTS } from './defaults';
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
  private _gcInterval: ReturnType<typeof setInterval>;

  constructor(private _liveObjects: LiveObjects) {
    this._client = this._liveObjects.getClient();
    this._pool = this._getInitialPool();
    this._gcInterval = setInterval(() => {
      this._onGCInterval();
    }, DEFAULTS.gcInterval);
    // call nodejs's Timeout.unref to not require Node.js event loop to remain active due to this interval. see https://nodejs.org/api/timers.html#timeoutunref
    this._gcInterval.unref?.();
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

  private _onGCInterval(): void {
    const toDelete: string[] = [];
    for (const [objectId, obj] of this._pool.entries()) {
      // tombstoned objects should be removed from the pool if they have been tombstoned for longer than grace period.
      // by removing them from the local pool, LiveObjects plugin no longer keeps a reference to those objects, allowing JS's
      // Garbage Collection to eventually free the memory for those objects, provided the user no longer references them either.
      if (obj.isTombstoned() && Date.now() - obj.tombstonedAt()! >= DEFAULTS.gcGracePeriod) {
        toDelete.push(objectId);
        continue;
      }

      obj.onGCInterval();
    }

    toDelete.forEach((x) => this._pool.delete(x));
  }
}
