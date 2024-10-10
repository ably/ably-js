import { LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import { MapSemantics } from './statemessage';

export interface LiveObjectDataEntry {
  objectData: LiveObjectData;
  regionalTimeserial: string;
  objectType: 'LiveMap' | 'LiveCounter';
}

export interface LiveCounterDataEntry extends LiveObjectDataEntry {
  created: boolean;
  objectType: 'LiveCounter';
}

export interface LiveMapDataEntry extends LiveObjectDataEntry {
  objectType: 'LiveMap';
  semantics: MapSemantics;
}

export type AnyDataEntry = LiveCounterDataEntry | LiveMapDataEntry;

/**
 * @internal
 */
export class SyncLiveObjectsDataPool {
  private _pool: Map<string, AnyDataEntry>;

  constructor(private _liveObjects: LiveObjects) {
    this._pool = new Map<string, AnyDataEntry>();
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
    this._pool = new Map<string, AnyDataEntry>();
  }
}
