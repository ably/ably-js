import { LiveObject, LiveObjectData } from './liveobject';

export interface LiveCounterData extends LiveObjectData {
  data: number;
}

export class LiveCounter extends LiveObject<LiveCounterData> {
  value(): number {
    return this._dataRef.data;
  }

  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }
}
