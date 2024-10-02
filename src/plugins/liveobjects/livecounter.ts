import { LiveObject } from './liveobject';

export interface LiveCounterData {
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
