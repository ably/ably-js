import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjects } from './liveobjects';

export type ObjectId = string;
export const ROOT_OBJECT_ID = 'root';

export class LiveObjectsPool {
  private _pool: Map<ObjectId, LiveObject>;

  constructor(private _liveObjects: LiveObjects) {
    this._pool = this._getInitialPool();
  }

  get(objectId: ObjectId): LiveObject | undefined {
    return this._pool.get(objectId);
  }

  private _getInitialPool(): Map<ObjectId, LiveObject> {
    const pool = new Map<ObjectId, LiveObject>();
    const root = new LiveMap(this._liveObjects, null, ROOT_OBJECT_ID);
    pool.set(root.getObjectId(), root);
    return pool;
  }
}
