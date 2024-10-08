import { LiveObject } from './liveobject';

export interface LiveCounterData {
  data: number;
}

export class LiveCounter extends LiveObject<LiveCounterData> {
  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }
}
