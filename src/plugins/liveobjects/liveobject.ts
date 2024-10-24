import type BaseClient from 'common/lib/client/baseclient';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateOperation } from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

export interface LiveObjectData {
  data: any;
}

export abstract class LiveObject<T extends LiveObjectData = LiveObjectData> {
  protected _client: BaseClient;
  protected _dataRef: T;
  protected _objectId: string;
  protected _regionalTimeserial: Timeserial;

  constructor(
    protected _liveObjects: LiveObjects,
    initialData?: T | null,
    objectId?: string,
    regionalTimeserial?: Timeserial,
  ) {
    this._client = this._liveObjects.getClient();
    this._dataRef = initialData ?? this._getZeroValueData();
    this._objectId = objectId ?? this._createObjectId();
    // use zero value timeserial by default, so any future operation can be applied for this object
    this._regionalTimeserial = regionalTimeserial ?? DefaultTimeserial.zeroValueTimeserial(this._client);
  }

  /**
   * @internal
   */
  getObjectId(): string {
    return this._objectId;
  }

  /**
   * @internal
   */
  getRegionalTimeserial(): Timeserial {
    return this._regionalTimeserial;
  }

  /**
   * @internal
   */
  setData(newDataRef: T): void {
    this._dataRef = newDataRef;
  }

  /**
   * @internal
   */
  setRegionalTimeserial(regionalTimeserial: Timeserial): void {
    this._regionalTimeserial = regionalTimeserial;
  }

  private _createObjectId(): string {
    // TODO: implement object id generation based on live object type and initial value
    return Math.random().toString().substring(2);
  }

  /**
   * @internal
   */
  abstract applyOperation(op: StateOperation, msg: StateMessage, opRegionalTimeserial: Timeserial): void;
  protected abstract _getZeroValueData(): T;
}
