import { LiveObjects } from './liveobjects';

interface LiveObjectData {
  data: any;
}

export abstract class LiveObject<T extends LiveObjectData = LiveObjectData> {
  protected _dataRef: T;
  protected _objectId: string;

  constructor(
    protected _liveObjects: LiveObjects,
    initialData?: T | null,
    objectId?: string,
  ) {
    this._dataRef = initialData ?? this._getZeroValueData();
    this._objectId = objectId ?? this._createObjectId();
  }

  /**
   * @internal
   */
  getObjectId(): string {
    return this._objectId;
  }

  private _createObjectId(): string {
    // TODO: implement object id generation based on live object type and initial value
    return Math.random().toString().substring(2);
  }

  protected abstract _getZeroValueData(): T;
}
