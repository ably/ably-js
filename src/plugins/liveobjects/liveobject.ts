import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import { LiveObjects } from './liveobjects';
import { StateMessage, StateObject, StateOperation } from './statemessage';

enum LiveObjectEvents {
  Updated = 'Updated',
  Valid = 'Valid',
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

export interface OnEventResponse {
  off(): void;
}

/**
 * Provides an interface for a buffered operation with the ability to cancel it, regardless of the buffering mechanism used
 */
export interface BufferedOperation {
  cancel(): void;
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
  protected _bufferedOperations: Set<BufferedOperation>;

  protected constructor(
    protected _liveObjects: LiveObjects,
    objectId: string,
  ) {
    this._client = this._liveObjects.getClient();
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._dataRef = this._getZeroValueData();
    this._createOperationIsMerged = false;
    this._objectId = objectId;
    // use empty timeserials vector by default, so any future operation can be applied to this object
    this._siteTimeserials = {};
    this._bufferedOperations = new Set();
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
   * Object is considered a "valid object" if we have seen the create operation for that object.
   *
   * Non-valid objects should be treated as though they don't exist from the perspective of the public API for the end users,
   * i.e. the public access API that would return this object instead should return an `undefined`. In other words, non-valid
   * objects are not surfaced to the end users and they're not able to interact with it.
   *
   * Once the create operation for the object has been seen and merged, the object becomes valid and can be exposed to the end users.
   *
   * @internal
   */
  isValid(): boolean {
    return this._createOperationIsMerged;
  }

  /**
   * @internal
   */
  onceValid(listener: () => void): OnEventResponse {
    this._eventEmitter.once(LiveObjectEvents.Valid, listener);

    const off = () => {
      this._eventEmitter.off(LiveObjectEvents.Valid, listener);
    };

    return { off };
  }

  /**
   * @internal
   */
  cancelBufferedOperations(): void {
    this._bufferedOperations.forEach((x) => x.cancel());
    this._bufferedOperations.clear();
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

  protected _setCreateOperationIsMerged(createOperationIsMerged: boolean): void {
    const shouldNotifyValid =
      createOperationIsMerged === true && this._createOperationIsMerged !== createOperationIsMerged;
    this._createOperationIsMerged = createOperationIsMerged;

    if (shouldNotifyValid) {
      this._eventEmitter.emit(LiveObjectEvents.Valid);
    }
  }

  private _createObjectId(): string {
    // TODO: implement object id generation based on live object type and initial value
    return Math.random().toString().substring(2);
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
  abstract overrideWithStateObject(stateObject: StateObject): TUpdate;
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
