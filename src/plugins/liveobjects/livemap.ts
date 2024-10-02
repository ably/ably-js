import { LiveObject } from './liveobject';

export type StateValue = string | number | boolean | Uint8Array;

export interface ObjectIdStateData {
  /**
   * A reference to another state object, used to support composable state objects.
   */
  objectId: string;
}

export interface ValueStateData {
  /**
   * A concrete leaf value in the state object graph.
   */
  value: StateValue;
}

export type StateData = ObjectIdStateData | ValueStateData;

export interface MapEntry {
  // TODO: add tombstone, timeserial
  data: StateData;
}

export interface LiveMapData {
  data: Map<string, MapEntry>;
}

export class LiveMap extends LiveObject<LiveMapData> {
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

    if ('value' in element.data) {
      return element.data.value;
    } else {
      return this._liveObjects.getPool().get(element.data.objectId);
    }
  }

  protected _getZeroValueData(): LiveMapData {
    return { data: new Map<string, MapEntry>() };
  }
}
