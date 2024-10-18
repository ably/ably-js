import { LiveObject, LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';

export interface LiveCounterData extends LiveObjectData {
  data: number;
}

export class LiveCounter extends LiveObject<LiveCounterData> {
  constructor(
    liveObjects: LiveObjects,
    private _created: boolean,
    initialData?: LiveCounterData | null,
    objectId?: string,
  ) {
    super(liveObjects, initialData, objectId);
  }

  value(): number {
    return this._dataRef.data;
  }

  /**
   * @internal
   */
  isCreated(): boolean {
    return this._created;
  }

  /**
   * @internal
   */
  setCreated(created: boolean): void {
    this._created = created;
  }

  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }
}
