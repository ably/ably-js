import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateOperation } from './statemessage';
import { Timeserial } from './timeserial';

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
  protected _siteTimeserials: Record<string, Timeserial>;

  constructor(
    protected _liveObjects: LiveObjects,
    initialData?: TData | null,
    objectId?: string,
    siteTimeserials?: Record<string, Timeserial>,
  ) {
    this._client = this._liveObjects.getClient();
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._dataRef = initialData ?? this._getZeroValueData();
    this._objectId = objectId ?? this._createObjectId();
    // use empty timeserials vector by default, so any future operation can be applied to this object
    this._siteTimeserials = siteTimeserials ?? {};
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
  setSiteTimeserials(siteTimeserials: Record<string, Timeserial>): void {
    this._siteTimeserials = siteTimeserials;
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

  /**
   * Returns true if the given origin timeserial indicates that the operation to which it belongs should be applied to the object.
   *
   * An operation should be applied if the origin timeserial is strictly greater than the timeserial in the site timeserials for the same site.
   * If the site timeserials do not contain a timeserial for the site of the origin timeserial, the operation should be applied.
   */
  protected _canApplyOperation(opOriginTimeserial: Timeserial): boolean {
    const siteTimeserial = this._siteTimeserials[opOriginTimeserial.siteCode];
    return !siteTimeserial || opOriginTimeserial.after(siteTimeserial);
  }

  private _createObjectId(): string {
    // TODO: implement object id generation based on live object type and initial value
    return Math.random().toString().substring(2);
  }

  /**
   * @internal
   */
  abstract applyOperation(op: StateOperation, msg: StateMessage): void;
  protected abstract _getZeroValueData(): TData;
  /**
   * Calculate the update object based on the current Live Object data and incoming new data.
   */
  protected abstract _updateFromDataDiff(currentDataRef: TData, newDataRef: TData): TUpdate;
}
