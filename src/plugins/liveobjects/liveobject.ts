import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateOperation } from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

enum LiveObjectEvents {
  Updated = 'Updated',
}

export interface LiveObjectData {
  data: any;
}

export interface LiveObjectUpdate {
  update: any;
}

export interface LiveObjectUpdateNoop {
  // have optional update field with undefined type so it's not possible to create a noop object with a meaningful update property.
  update?: undefined;
  noop: true;
}

export interface SubscribeResponse {
  unsubscribe(): void;
}

export abstract class LiveObject<
  TData extends LiveObjectData = LiveObjectData,
  TUpdate extends LiveObjectUpdate = LiveObjectUpdate,
> {
  protected _client: BaseClient;
  protected _eventEmitter: EventEmitter;
  protected _dataRef: TData;
  protected _objectId: string;
  protected _regionalTimeserial: Timeserial;

  constructor(
    protected _liveObjects: LiveObjects,
    initialData?: TData | null,
    objectId?: string,
    regionalTimeserial?: Timeserial,
  ) {
    this._client = this._liveObjects.getClient();
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._dataRef = initialData ?? this._getZeroValueData();
    this._objectId = objectId ?? this._createObjectId();
    // use zero value timeserial by default, so any future operation can be applied for this object
    this._regionalTimeserial = regionalTimeserial ?? DefaultTimeserial.zeroValueTimeserial(this._client);
  }

  subscribe(listener: (update: TUpdate) => void): SubscribeResponse {
    this._eventEmitter.on(LiveObjectEvents.Updated, listener);

    const unsubscribe = () => {
      this._eventEmitter.off(LiveObjectEvents.Updated, listener);
    };

    return { unsubscribe };
  }

  unsubscribe(listener: (update: TUpdate) => void): void {
    // current implementation of the EventEmitter will remove all listeners if .off is called without arguments or with nullish arguments.
    // or when called with just an event argument, it will remove all listeners for the event.
    // thus we need to check that listener does actually exist before calling .off.
    if (this._client.Utils.isNil(listener)) {
      return;
    }

    this._eventEmitter.off(LiveObjectEvents.Updated, listener);
  }

  unsubscribeAll(): void {
    this._eventEmitter.off(LiveObjectEvents.Updated);
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
   * Sets a new data reference for the LiveObject and returns an update object that describes the changes applied based on the object's previous value.
   *
   * @internal
   */
  setData(newDataRef: TData): TUpdate {
    const update = this._updateFromDataDiff(this._dataRef, newDataRef);
    this._dataRef = newDataRef;
    return update;
  }

  /**
   * @internal
   */
  setRegionalTimeserial(regionalTimeserial: Timeserial): void {
    this._regionalTimeserial = regionalTimeserial;
  }

  /**
   * @internal
   */
  notifyUpdated(update: TUpdate | LiveObjectUpdateNoop): void {
    // should not emit update event if update was noop
    if ((update as LiveObjectUpdateNoop).noop) {
      return;
    }

    this._eventEmitter.emit(LiveObjectEvents.Updated, update);
  }

  private _createObjectId(): string {
    // TODO: implement object id generation based on live object type and initial value
    return Math.random().toString().substring(2);
  }

  /**
   * @internal
   */
  abstract applyOperation(op: StateOperation, msg: StateMessage, opRegionalTimeserial: Timeserial): void;
  protected abstract _getZeroValueData(): TData;
  /**
   * Calculate the update object based on the current Live Object data and incoming new data.
   */
  protected abstract _updateFromDataDiff(currentDataRef: TData, newDataRef: TData): TUpdate;
}
