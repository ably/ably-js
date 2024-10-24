import type BaseClient from 'common/lib/client/baseclient';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateOperation } from './statemessage';
import { Timeserial } from './timeserial';

export interface LiveObjectData {
  data: any;
}

export abstract class LiveObject<T extends LiveObjectData = LiveObjectData> {
  protected _client: BaseClient;
  protected _dataRef: T;
  protected _objectId: string;

  constructor(
    protected _liveObjects: LiveObjects,
    protected _regionalTimeserial: Timeserial,
    initialData?: T | null,
    objectId?: string,
  ) {
    this._client = this._liveObjects.getClient();
    this._dataRef = initialData ?? this._getZeroValueData();
    this._objectId = objectId ?? this._createObjectId();
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
