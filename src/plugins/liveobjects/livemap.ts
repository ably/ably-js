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
  protected _getZeroValueData(): LiveMapData {
    return { data: new Map<string, MapEntry>() };
  }
}
