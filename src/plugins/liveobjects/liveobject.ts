import type BaseClient from 'common/lib/client/baseclient';
import type EventEmitter from 'common/lib/util/eventemitter';
import type { EventCallback, Subscription } from '../../../ably';
import { ROOT_OBJECT_ID } from './constants';
import { InstanceEvent } from './instance';
import { ObjectData, ObjectMessage, ObjectOperation } from './objectmessage';
import { PathEvent } from './pathobjectsubscriptionregister';
import { ObjectsOperationSource, RealtimeObject } from './realtimeobject';

export enum LiveObjectSubscriptionEvent {
  updated = 'updated',
}

export interface LiveObjectData {
  data: any;
}

export interface LiveObjectUpdate {
  _type: 'LiveMapUpdate' | 'LiveCounterUpdate';
  /** Delta of the change */
  update: any;
  /** Object message that caused an update to an object, if available */
  objectMessage?: ObjectMessage;
  /** Indicates whether this update is a result of a tombstone (delete) operation. */
  tombstone?: boolean;
}

export interface LiveObjectUpdateNoop {
  // have optional update field with undefined type so it's not possible to create a noop object with a meaningful update property.
  update?: undefined;
  noop: true;
}

export abstract class LiveObject<
  TData extends LiveObjectData = LiveObjectData,
  TUpdate extends LiveObjectUpdate = LiveObjectUpdate,
> {
  protected _client: BaseClient;
  protected _subscriptions: EventEmitter;
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
  /**
   * Track parent references - which LiveMap objects contain this object and at which keys.
   * Multiple parents can reference the same object, so we use a Map of parent to Set of keys for efficient lookups.
   */
  private _parentReferences: Map<LiveObject, Set<string>>;

  protected constructor(
    protected _realtimeObject: RealtimeObject,
    objectId: string,
  ) {
    this._client = this._realtimeObject.getClient();
    this._subscriptions = new this._client.EventEmitter(this._client.logger);
    this._objectId = objectId;
    this._dataRef = this._getZeroValueData();
    // use empty map of serials by default, so any future operation can be applied to this object
    this._siteTimeserials = {};
    this._createOperationIsMerged = false;
    this._tombstone = false;
    this._parentReferences = new Map<LiveObject, Set<string>>();
  }

  subscribe(listener: EventCallback<InstanceEvent>): Subscription {
    this._subscriptions.on(LiveObjectSubscriptionEvent.updated, listener);

    const unsubscribe = () => {
      this._subscriptions.off(LiveObjectSubscriptionEvent.updated, listener);
    };

    return { unsubscribe };
  }

  /**
   * @internal
   */
  getObjectId(): string {
    return this._objectId;
  }

  /**
   * Emits the {@link LiveObjectSubscriptionEvent.updated} event with provided update object if it isn't a noop.
   * Also notifies the path object subscriptions about path-based events.
   *
   * @internal
   */
  notifyUpdated(update: TUpdate | LiveObjectUpdateNoop): void {
    if (this._isNoopUpdate(update)) {
      // do not emit update events for noop updates
      return;
    }

    this._notifyInstanceSubscriptions(update);
    this._notifyPathSubscriptions(update);

    if (update.tombstone) {
      // deregister all listeners if update was a result of a tombstone operation
      this._subscriptions.off();
    }
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
    update.objectMessage = objectMessage;
    update.tombstone = true;

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
   * Add a parent reference indicating that this object is referenced by the given parent LiveMap at the specified key.
   *
   * @internal
   */
  addParentReference(parent: LiveObject, key: string): void {
    const keys = this._parentReferences.get(parent);

    if (keys) {
      keys.add(key);
    } else {
      this._parentReferences.set(parent, new Set([key]));
    }
  }

  /**
   * Remove a parent reference indicating that this object is no longer referenced by the given parent LiveMap at the specified key.
   *
   * @internal
   */
  removeParentReference(parent: LiveObject, key: string): void {
    const keys = this._parentReferences.get(parent);

    if (keys) {
      keys.delete(key);
      // If no more keys for this parent, remove the parent entry entirely
      if (keys.size === 0) {
        this._parentReferences.delete(parent);
      }
    }
  }

  /**
   * Remove all parent references for a specific parent (when parent is being deleted or cleared).
   *
   * @internal
   */
  removeParentReferenceAll(parent: LiveObject): void {
    this._parentReferences.delete(parent);
  }

  /**
   * Clears all parent references for this object.
   *
   * @internal
   */
  clearParentReferences(): void {
    this._parentReferences.clear();
  }

  /**
   * Calculates and returns all possible paths to this object from the root object by traversing up the parent hierarchy.
   * Uses iterative DFS with an explicit stack. Each path is represented as an array of keys from root to this object.
   *
   * @internal
   */
  getFullPaths(): string[][] {
    const paths: string[][] = [];

    const stack: { obj: LiveObject; currentPath: string[]; visited: Set<LiveObject> }[] = [
      { obj: this, currentPath: [], visited: new Set() },
    ];

    while (stack.length > 0) {
      const { obj, currentPath, visited } = stack.pop()!;

      // Check for cyclic references
      if (visited.has(obj)) {
        continue; // Skip this path to prevent infinite loops
      }

      // Create new visited set for this path
      const newVisited = new Set(visited);
      newVisited.add(obj);

      if (obj.getObjectId() === ROOT_OBJECT_ID) {
        // Reached the root object, add the current path
        paths.push(currentPath);
        continue;
      }

      // Otherwise, add work items for each parent-key combination to the stack
      for (const [parent, keys] of obj._parentReferences) {
        for (const key of keys) {
          stack.push({
            obj: parent,
            currentPath: [key, ...currentPath],
            visited: newVisited,
          });
        }
      }
    }

    return paths;
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

  private _notifyInstanceSubscriptions(update: TUpdate): void {
    const event: InstanceEvent = {
      // Do not expose object sync messages as they do not represent a single operation on an object
      message: update.objectMessage?.isOperationMessage() ? update.objectMessage : undefined,
    };
    this._subscriptions.emit(LiveObjectSubscriptionEvent.updated, event);
  }

  /**
   * Notifies path-based subscriptions about changes to this object.
   * For LiveMapUpdate events, also creates non-bubbling events for each updated key.
   */
  private _notifyPathSubscriptions(update: TUpdate): void {
    const paths = this.getFullPaths();

    if (paths.length === 0) {
      // No paths to this object, skip notification
      return;
    }

    // Do not expose object sync messages as they do not represent a single operation on an object
    const operationObjectMessage = update.objectMessage?.isOperationMessage() ? update.objectMessage : undefined;
    const pathEvents: PathEvent[] = paths.map((path) => ({
      path,
      message: operationObjectMessage,
      bubbles: true,
    }));

    // For LiveMapUpdate, also create non-bubbling events for each updated key
    if (update._type === 'LiveMapUpdate') {
      const updatedKeys = Object.keys(update.update);

      for (const key of updatedKeys) {
        for (const basePath of paths) {
          pathEvents.push({
            path: [...basePath, key],
            message: operationObjectMessage,
            bubbles: false,
          });
        }
      }
    }

    this._realtimeObject.getPathObjectSubscriptionRegister().notifyPathEvents(pathEvents);
  }

  private _isNoopUpdate(update: TUpdate | LiveObjectUpdateNoop): update is LiveObjectUpdateNoop {
    return (update as LiveObjectUpdateNoop).noop === true;
  }

  /**
   * Apply object operation message on this LiveObject.
   *
   * @returns `true` if the operation was applied successfully, `false` if it was skipped.
   * @spec RTLC7g, RTLM15g
   * @internal
   */
  abstract applyOperation(op: ObjectOperation<ObjectData>, msg: ObjectMessage, source: ObjectsOperationSource): boolean;
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
