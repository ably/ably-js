import { LiveObject, LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import { MapSemantics, StateValue } from './statemessage';
import { Timeserial } from './timeserial';

export interface ObjectIdStateData {
  /** A reference to another state object, used to support composable state objects. */
  objectId: string;
}

export interface ValueStateData {
  /**
   * The encoding the client should use to interpret the value.
   * Analogous to the `encoding` field on the `Message` and `PresenceMessage` types.
   */
  encoding?: string;
  /** A concrete leaf value in the state object graph. */
  value: StateValue;
}

export type StateData = ObjectIdStateData | ValueStateData;

export interface MapEntry {
  tombstone: boolean;
  timeserial: Timeserial;
  data: StateData | undefined;
}

export interface LiveMapData extends LiveObjectData {
  data: Map<string, MapEntry>;
}

export class LiveMap extends LiveObject<LiveMapData> {
  constructor(
    liveObjects: LiveObjects,
    private _semantics: MapSemantics,
    initialData?: LiveMapData | null,
    objectId?: string,
  ) {
    super(liveObjects, initialData, objectId);
  }

  /**
   * Returns the value associated with the specified key in the underlying Map object.
   * If no element is associated with the specified key, undefined is returned.
   * If the value that is associated to the provided key is an objectId string of another Live Object,
   * then you will get a reference to that Live Object if it exists in the local pool, or undefined otherwise.
   * If the value is not an objectId, then you will get that value.
   */
  get(key: string): LiveObject | StateValue | undefined {
    const element = this._dataRef.data.get(key);

    if (element === undefined) {
      return undefined;
    }

    if (element.tombstone === true) {
      return undefined;
    }

    // data exists for non-tombstoned elements
    const data = element.data!;

    if ('value' in data) {
      return data.value;
    } else {
      return this._liveObjects.getPool().get(data.objectId);
    }
  }

  size(): number {
    let size = 0;
    for (const value of this._dataRef.data.values()) {
      if (value.tombstone === true) {
        // should not count deleted entries
        continue;
      }

      size++;
    }

    return size;
  }

  protected _getZeroValueData(): LiveMapData {
    return { data: new Map<string, MapEntry>() };
  }
}
