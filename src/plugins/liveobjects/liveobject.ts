import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateObject, StateOperation } from './statemessage';

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
  protected _objectId: string;
  /**
   * Represents an aggregated value for an object, which combines the initial value for an object from the create operation,
   * and all state operations applied to the object.
   */
  protected _dataRef: TData;
  protected _siteTimeserials: Record<string, string>;
  protected _createOperationIsMerged: boolean;
  private _tombstone: boolean;
  /**
   * Even though the `timeserial` from the operation that deleted the object contains the timestamp value,
   * the `timeserial` should be treated as an opaque string on the client, meaning we should not attempt to parse it.
   *
   * Therefore, we need to set our own timestamp using local clock when the object is deleted client-side.
   * Strictly speaking, this does make an assumption about the client clock not being too heavily skewed behind the server,
   * but it is an acceptable compromise for the time being, as the likelihood of encountering a race here is pretty low given the grace periods we use.
   */
  private _tombstonedAt: number | undefined;

  protected constructor(
    protected _liveObjects: LiveObjects,
    objectId: string,
  ) {
    this._client = this._liveObjects.getClient();
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._objectId = objectId;
    this._dataRef = this._getZeroValueData();
    // use empty timeserials vector by default, so any future operation can be applied to this object
    this._siteTimeserials = {};
    this._createOperationIsMerged = false;
    this._tombstone = false;
  }

  subscribe(listener: (update: TUpdate) => void): SubscribeResponse {
    this._liveObjects.throwIfMissingStateSubscribeMode();

    this._eventEmitter.on(LiveObjectEvents.Updated, listener);

    const unsubscribe = () => {
      this._eventEmitter.off(LiveObjectEvents.Updated, listener);
    };

    return { unsubscribe };
  }

  unsubscribe(listener: (update: TUpdate) => void): void {
    // can allow calling this public method without checking for state modes on the channel as the result of this method is not dependant on them

    // current implementation of the EventEmitter will remove all listeners if .off is called without arguments or with nullish arguments.
    // or when called with just an event argument, it will remove all listeners for the event.
    // thus we need to check that listener does actually exist before calling .off.
    if (this._client.Utils.isNil(listener)) {
      return;
    }

    this._eventEmitter.off(LiveObjectEvents.Updated, listener);
  }

  unsubscribeAll(): void {
    // can allow calling this public method without checking for state modes on the channel as the result of this method is not dependant on them
    this._eventEmitter.off(LiveObjectEvents.Updated);
  }

  /**
   * @internal
   */
  getObjectId(): string {
    return this._objectId;
  }

  /**
   * Emits the {@link LiveObjectEvents.Updated} event with provided update object if it isn't a noop.
   *
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
   * Clears the object's state, cancels any buffered operations and sets the tombstone flag to `true`.
   *
   * @internal
   */
  tombstone(): void {
    this._tombstone = true;
    this._tombstonedAt = Date.now();
    this._dataRef = this._getZeroValueData();
    // TODO: emit "deleted" event so that end users get notified about this object getting deleted
  }

  /**
   * @internal
   */
  isTombstoned(): boolean {
    return this._tombstone;
  }

  /**
   * @internal
   */
  tombstonedAt(): number | undefined {
    return this._tombstonedAt;
  }

  /**
   * Returns true if the given origin timeserial indicates that the operation to which it belongs should be applied to the object.
   *
   * An operation should be applied if the origin timeserial is strictly greater than the timeserial in the site timeserials for the same site.
   * If the site timeserials do not contain a timeserial for the site of the origin timeserial, the operation should be applied.
   */
  protected _canApplyOperation(opOriginTimeserial: string | undefined, opSiteCode: string | undefined): boolean {
    if (!opOriginTimeserial) {
      throw new this._client.ErrorInfo(`Invalid timeserial: ${opOriginTimeserial}`, 50000, 500);
    }

    if (!opSiteCode) {
      throw new this._client.ErrorInfo(`Invalid site code: ${opSiteCode}`, 50000, 500);
    }

    const siteTimeserial = this._siteTimeserials[opSiteCode];
    return !siteTimeserial || opOriginTimeserial > siteTimeserial;
  }

  protected _applyObjectDelete(): TUpdate {
    const previousDataRef = this._dataRef;
    this.tombstone();
    return this._updateFromDataDiff(previousDataRef, this._dataRef);
  }

  /**
   * Apply state operation message on live object.
   *
   * @internal
   */
  abstract applyOperation(op: StateOperation, msg: StateMessage): void;
  /**
   * Overrides internal data for live object with data from the given state object.
   * Provided state object should hold a valid data for current live object, e.g. counter data for LiveCounter, map data for LiveMap.
   *
   * State objects are received during SYNC sequence, and SYNC sequence is a source of truth for the current state of the objects,
   * so we can use the data received from the SYNC sequence directly and override any data values or site timeserials this live object has
   * without the need to merge them.
   *
   * Returns an update object that describes the changes applied based on the object's previous value.
   *
   * @internal
   */
  abstract overrideWithStateObject(stateObject: StateObject): TUpdate | LiveObjectUpdateNoop;
  /**
   * @internal
   */
  abstract onGCInterval(): void;

  protected abstract _getZeroValueData(): TData;
  /**
   * Calculate the update object based on the current Live Object data and incoming new data.
   */
  protected abstract _updateFromDataDiff(prevDataRef: TData, newDataRef: TData): TUpdate;
  /**
   * Merges the initial data from the create operation into the live object state.
   *
   * Client SDKs do not need to keep around the state operation that created the object,
   * so we can merge the initial data the first time we receive it for the object,
   * and work with aggregated value after that.
   *
   * This saves us from needing to merge the initial value with operations applied to
   * the object every time the object is read.
   */
  protected abstract _mergeInitialDataFromCreateOperation(stateOperation: StateOperation): TUpdate;
}
