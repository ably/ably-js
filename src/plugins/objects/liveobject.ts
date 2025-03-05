import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { Objects } from './objects';
import { StateMessage, StateObject, StateOperation } from './statemessage';

export enum LiveObjectSubscriptionEvent {
  updated = 'updated',
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

export enum LiveObjectLifecycleEvent {
  deleted = 'deleted',
}

export type LiveObjectLifecycleEventCallback = () => void;

export interface OnLiveObjectLifecycleEventResponse {
  off(): void;
}

export abstract class LiveObject<
  TData extends LiveObjectData = LiveObjectData,
  TUpdate extends LiveObjectUpdate = LiveObjectUpdate,
> {
  protected _client: BaseClient;
  protected _subscriptions: EventEmitter;
  protected _lifecycleEvents: EventEmitter;
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
    protected _objects: Objects,
    objectId: string,
  ) {
    this._client = this._objects.getClient();
    this._subscriptions = new this._client.EventEmitter(this._client.logger);
    this._lifecycleEvents = new this._client.EventEmitter(this._client.logger);
    this._objectId = objectId;
    this._dataRef = this._getZeroValueData();
    // use empty timeserials vector by default, so any future operation can be applied to this object
    this._siteTimeserials = {};
    this._createOperationIsMerged = false;
    this._tombstone = false;
  }

  subscribe(listener: (update: TUpdate) => void): SubscribeResponse {
    this._objects.throwIfInvalidAccessApiConfiguration();

    this._subscriptions.on(LiveObjectSubscriptionEvent.updated, listener);

    const unsubscribe = () => {
      this._subscriptions.off(LiveObjectSubscriptionEvent.updated, listener);
    };

    return { unsubscribe };
  }

  unsubscribe(listener: (update: TUpdate) => void): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.

    // current implementation of the EventEmitter will remove all listeners if .off is called without arguments or with nullish arguments.
    // or when called with just an event argument, it will remove all listeners for the event.
    // thus we need to check that listener does actually exist before calling .off.
    if (this._client.Utils.isNil(listener)) {
      return;
    }

    this._subscriptions.off(LiveObjectSubscriptionEvent.updated, listener);
  }

  unsubscribeAll(): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._subscriptions.off(LiveObjectSubscriptionEvent.updated);
  }

  on(event: LiveObjectLifecycleEvent, callback: LiveObjectLifecycleEventCallback): OnLiveObjectLifecycleEventResponse {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._lifecycleEvents.on(event, callback);

    const off = () => {
      this._lifecycleEvents.off(event, callback);
    };

    return { off };
  }

  off(event: LiveObjectLifecycleEvent, callback: LiveObjectLifecycleEventCallback): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.

    // prevent accidentally calling .off without any arguments on an EventEmitter and removing all callbacks
    if (this._client.Utils.isNil(event) && this._client.Utils.isNil(callback)) {
      return;
    }

    this._lifecycleEvents.off(event, callback);
  }

  offAll(): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._lifecycleEvents.off();
  }

  /**
   * @internal
   */
  getObjectId(): string {
    return this._objectId;
  }

  /**
   * Emits the {@link LiveObjectSubscriptionEvent.updated} event with provided update object if it isn't a noop.
   *
   * @internal
   */
  notifyUpdated(update: TUpdate | LiveObjectUpdateNoop): void {
    // should not emit update event if update was noop
    if ((update as LiveObjectUpdateNoop).noop) {
      return;
    }

    this._subscriptions.emit(LiveObjectSubscriptionEvent.updated, update);
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
    this._lifecycleEvents.emit(LiveObjectLifecycleEvent.deleted);
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
      throw new this._client.ErrorInfo(`Invalid timeserial: ${opOriginTimeserial}`, 92000, 500);
    }

    if (!opSiteCode) {
      throw new this._client.ErrorInfo(`Invalid site code: ${opSiteCode}`, 92000, 500);
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
   * Merges the initial data from the create operation into the live object.
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
