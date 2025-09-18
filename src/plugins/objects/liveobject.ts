import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { ObjectData, ObjectMessage, ObjectOperation } from './objectmessage';
import { Objects } from './objects';

export enum LiveObjectSubscriptionEvent {
  updated = 'updated',
}

export interface LiveObjectData {
  data: any;
}

export interface LiveObjectUpdate {
  update: any;
  clientId?: string;
  connectionId?: string;
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
   * and all object operations applied to the object.
   */
  protected _dataRef: TData;
  protected _siteTimeserials: Record<string, string>;
  protected _createOperationIsMerged: boolean;
  private _tombstone: boolean;
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
    // use empty map of serials by default, so any future operation can be applied to this object
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
   * Clears the object's data, cancels any buffered operations and sets the tombstone flag to `true`.
   *
   * @internal
   */
  tombstone(objectMessage: ObjectMessage): TUpdate {
    this._tombstone = true;
    if (objectMessage.serialTimestamp != null) {
      this._tombstonedAt = objectMessage.serialTimestamp;
    } else {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MINOR,
        'LiveObject.tombstone()',
        `object has been tombstoned but no "serialTimestamp" found in the message, using local clock instead; objectId=${this.getObjectId()}`,
      );
      this._tombstonedAt = Date.now(); // best-effort estimate since no timestamp provided by the server
    }
    const update = this.clearData();
    update.clientId = objectMessage.clientId;
    update.connectionId = objectMessage.connectionId;
    this._lifecycleEvents.emit(LiveObjectLifecycleEvent.deleted);

    return update;
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
   * @internal
   */
  clearData(): TUpdate {
    const previousDataRef = this._dataRef;
    this._dataRef = this._getZeroValueData();
    return this._updateFromDataDiff(previousDataRef, this._dataRef);
  }

  /**
   * Returns true if the given serial indicates that the operation to which it belongs should be applied to the object.
   *
   * An operation should be applied if its serial is strictly greater than the serial in the `siteTimeserials` map for the same site.
   * If `siteTimeserials` map does not contain a serial for the same site, the operation should be applied.
   */
  protected _canApplyOperation(opSerial: string | undefined, opSiteCode: string | undefined): boolean {
    if (!opSerial) {
      throw new this._client.ErrorInfo(`Invalid serial: ${opSerial}`, 92000, 500);
    }

    if (!opSiteCode) {
      throw new this._client.ErrorInfo(`Invalid site code: ${opSiteCode}`, 92000, 500);
    }

    const siteSerial = this._siteTimeserials[opSiteCode];
    return !siteSerial || opSerial > siteSerial;
  }

  protected _applyObjectDelete(objectMessage: ObjectMessage): TUpdate {
    return this.tombstone(objectMessage);
  }

  /**
   * Apply object operation message on this LiveObject.
   *
   * @internal
   */
  abstract applyOperation(op: ObjectOperation<ObjectData>, msg: ObjectMessage): void;
  /**
   * Overrides internal data for this LiveObject with object state from the given object message.
   * Provided object state should hold a valid data for current LiveObject, e.g. counter data for LiveCounter, map data for LiveMap.
   *
   * Object states are received during sync sequence, and sync sequence is a source of truth for the current state of the objects,
   * so we can use the data received from the sync sequence directly and override any data values or site serials this LiveObject has
   * without the need to merge them.
   *
   * Returns an update object that describes the changes applied based on the object's previous value.
   *
   * @internal
   */
  abstract overrideWithObjectState(objectMessage: ObjectMessage): TUpdate | LiveObjectUpdateNoop;
  /**
   * @internal
   */
  abstract onGCInterval(): void;

  protected abstract _getZeroValueData(): TData;
  /**
   * Calculate the update object based on the current LiveObject data and incoming new data.
   */
  protected abstract _updateFromDataDiff(prevDataRef: TData, newDataRef: TData): TUpdate;
  /**
   * Merges the initial data from the create operation into the LiveObject.
   *
   * Client SDKs do not need to keep around the object operation that created the object,
   * so we can merge the initial data the first time we receive it for the object,
   * and work with aggregated value after that.
   *
   * This saves us from needing to merge the initial value with operations applied to
   * the object every time the object is read.
   */
  protected abstract _mergeInitialDataFromCreateOperation(
    objectOperation: ObjectOperation<ObjectData>,
    msg: ObjectMessage,
  ): TUpdate;
}
