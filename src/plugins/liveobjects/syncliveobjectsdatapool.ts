import { LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';

export interface LiveObjectDataEntry {
  objectData: LiveObjectData;
  regionalTimeserial: string;
  objectType: 'LiveMap' | 'LiveCounter';
}

/**
 * @internal
 */
export class SyncLiveObjectsDataPool {
  private _pool: Map<string, LiveObjectDataEntry>;

  constructor(private _liveObjects: LiveObjects) {
    this._pool = new Map<string, LiveObjectDataEntry>();
  }

  entries() {
    return this._pool.entries();
  }

  size(): number {
    return this._pool.size;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  reset(): void {
    this._pool = new Map<string, LiveObjectDataEntry>();
  }
}
