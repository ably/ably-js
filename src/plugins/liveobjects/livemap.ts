import deepEqual from 'deep-equal';

import type * as API from '../../../ably';
import { BufferedOperation, LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjects } from './liveobjects';
import {
  MapSemantics,
  StateMapEntry,
  StateMapOp,
  StateMessage,
  StateObject,
  StateOperation,
  StateOperationAction,
  StateValue,
} from './statemessage';

export interface ObjectIdStateData {
  /** A reference to another state object, used to support composable state objects. */
  objectId: string;
}

export interface ValueStateData {
  /**
   * The encoding the client should use to interpret the value.
   * Analogous to the `encoding` field on the `Message` and `PresenceMessage` types.
   */
  encoding?: string;
  /** A concrete leaf value in the state object graph. */
  value: StateValue;
}

export type StateData = ObjectIdStateData | ValueStateData;

export interface MapEntry {
  tombstone: boolean;
  timeserial: string | undefined;
  data: StateData | undefined;
}

export interface LiveMapData extends LiveObjectData {
  data: Map<string, MapEntry>;
}

export interface LiveMapUpdate extends LiveObjectUpdate {
  update: { [keyName: string]: 'updated' | 'removed' };
}

export class LiveMap<T extends API.LiveMapType> extends LiveObject<LiveMapData, LiveMapUpdate> {
  constructor(
    liveObjects: LiveObjects,
    private _semantics: MapSemantics,
    objectId: string,
  ) {
    super(liveObjects, objectId);
  }

  /**
   * Returns a {@link LiveMap} instance with an empty map data.
   *
   * @internal
   */
  static zeroValue<T extends API.LiveMapType>(liveobjects: LiveObjects, objectId: string): LiveMap<T> {
    return new LiveMap<T>(liveobjects, MapSemantics.LWW, objectId);
  }

  /**
   * Returns a {@link LiveMap} instance based on the provided state object.
   * The provided state object must hold a valid map object data.
   *
   * @internal
   */
  static fromStateObject<T extends API.LiveMapType>(liveobjects: LiveObjects, stateObject: StateObject): LiveMap<T> {
    const obj = new LiveMap<T>(liveobjects, stateObject.map?.semantics!, stateObject.objectId);
    obj.overrideWithStateObject(stateObject);
    return obj;
  }

  /**
   * Returns the value associated with the specified key in the underlying Map object.
   *
   * - If no entry is associated with the specified key, `undefined` is returned.
   * - If map entry is tombstoned (deleted), `undefined` is returned.
   * - If the value associated with the provided key is an objectId string of another Live Object, a reference to that Live Object
   * is returned, provided it exists in the local pool and is valid. Otherwise, `undefined` is returned.
   * - If the value is not an objectId, then that value is returned.
   */
  // force the key to be of type string as we only allow strings as key in a map
  get<TKey extends keyof T & string>(key: TKey): T[TKey] {
    const element = this._dataRef.data.get(key);

    if (element === undefined) {
      return undefined as T[TKey];
    }

    if (element.tombstone === true) {
      return undefined as T[TKey];
    }

    // data always exists for non-tombstoned elements
    const data = element.data!;

    if ('value' in data) {
      // map entry has a primitive type value, just return it as is.
      return data.value as T[TKey];
    }

    // map entry points to another object, get it from the pool
    const refObject: LiveObject | undefined = this._liveObjects.getPool().get(data.objectId);
    if (!refObject) {
      return undefined as T[TKey];
    }

    if (!refObject.isValid()) {
      // non-valid objects must not be surfaced to the end users
      return undefined as T[TKey];
    }

    return refObject as API.LiveObject as T[TKey];
  }

  size(): number {
    let size = 0;
    for (const value of this._dataRef.data.values()) {
      if (value.tombstone === true) {
        // should not count removed entries
        continue;
      }

      // data always exists for non-tombstoned elements
      const data = value.data!;
      if ('objectId' in data && !this._liveObjects.getPool().get(data.objectId)?.isValid()) {
        // should not count non-valid objects
        continue;
      }

      size++;
    }

    return size;
  }

  /**
   * @internal
   */
  applyOperation(op: StateOperation, msg: StateMessage): void {
    if (op.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Cannot apply state operation with objectId=${op.objectId}, to this LiveMap with objectId=${this.getObjectId()}`,
        50000,
        500,
      );
    }

    const opOriginTimeserial = msg.serial!;
    const opSiteCode = msg.siteCode!;
    if (!this._canApplyOperation(opOriginTimeserial, opSiteCode)) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap.applyOperation()',
        `skipping ${op.action} op: op timeserial ${opOriginTimeserial.toString()} <= site timeserial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this._objectId}`,
      );
      return;
    }
    // should update stored site timeserial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opOriginTimeserial;

    if (msg.isMapSetWithObjectIdReference() && !this._liveObjects.getPool().get(op.mapOp?.data?.objectId!)?.isValid()) {
      // invalid objects must not be surfaced to the end users, so we cannot apply this MAP_SET operation on the map yet,
      // as it will set the key to point to the invalid object. we also can't just update the key on a map right now, as
      // that would require us to send an update event for the key, and the user will end up with a key on map which got
      // updated to return undefined, which is undesired. instead we should buffer the MAP_SET operation until referenced
      // object becomes valid
      this._handleMapSetWithInvalidObjectReference(op.mapOp!, opOriginTimeserial);
      return;
    }

    let update: LiveMapUpdate | LiveObjectUpdateNoop;
    switch (op.action) {
      case StateOperationAction.MAP_CREATE:
        update = this._applyMapCreate(op);
        break;

      case StateOperationAction.MAP_SET:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyMapSet(op.mapOp, opOriginTimeserial);
        }
        break;

      case StateOperationAction.MAP_REMOVE:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyMapRemove(op.mapOp, opOriginTimeserial);
        }
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
          50000,
          500,
        );
    }

    this.notifyUpdated(update);
  }

  /**
   * @internal
   */
  overrideWithStateObject(stateObject: StateObject): LiveMapUpdate {
    if (stateObject.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Invalid state object: state object objectId=${stateObject.objectId}; LiveMap objectId=${this.getObjectId()}`,
        50000,
        500,
      );
    }

    if (stateObject.map?.semantics !== this._semantics) {
      throw new this._client.ErrorInfo(
        `Invalid state object: state object map semantics=${stateObject.map?.semantics}; LiveMap semantics=${this._semantics}`,
        50000,
        500,
      );
    }

    if (!this._client.Utils.isNil(stateObject.createOp)) {
      // it is expected that create operation can be missing in the state object, so only validate it when it exists
      if (stateObject.createOp.objectId !== this.getObjectId()) {
        throw new this._client.ErrorInfo(
          `Invalid state object: state object createOp objectId=${stateObject.createOp?.objectId}; LiveMap objectId=${this.getObjectId()}`,
          50000,
          500,
        );
      }

      if (stateObject.createOp.action !== StateOperationAction.MAP_CREATE) {
        throw new this._client.ErrorInfo(
          `Invalid state object: state object createOp action=${stateObject.createOp?.action}; LiveMap objectId=${this.getObjectId()}`,
          50000,
          500,
        );
      }

      if (stateObject.createOp.map?.semantics !== this._semantics) {
        throw new this._client.ErrorInfo(
          `Invalid state object: state object createOp map semantics=${stateObject.createOp.map?.semantics}; LiveMap semantics=${this._semantics}`,
          50000,
          500,
        );
      }
    }

    const previousDataRef = this._dataRef;
    // override all relevant data for this object with data from the state object
    this._setCreateOperationIsMerged(false);
    this._dataRef = this._liveMapDataFromMapEntries(stateObject.map?.entries ?? {});
    // should default to empty map if site timeserials do not exist on the state object, so that any future operation can be applied to this object
    this._siteTimeserials = stateObject.siteTimeserials ?? {};
    if (!this._client.Utils.isNil(stateObject.createOp)) {
      this._mergeInitialDataFromCreateOperation(stateObject.createOp);
    }

    return this._updateFromDataDiff(previousDataRef, this._dataRef);
  }

  protected _getZeroValueData(): LiveMapData {
    return { data: new Map<string, MapEntry>() };
  }

  protected _updateFromDataDiff(prevDataRef: LiveMapData, newDataRef: LiveMapData): LiveMapUpdate {
    const update: LiveMapUpdate = { update: {} };

    for (const [key, currentEntry] of prevDataRef.data.entries()) {
      // any non-tombstoned properties that exist on a current map, but not in the new data - got removed
      if (currentEntry.tombstone === false && !newDataRef.data.has(key)) {
        update.update[key] = 'removed';
      }
    }

    for (const [key, newEntry] of newDataRef.data.entries()) {
      if (!prevDataRef.data.has(key)) {
        // if property does not exist in the current map, but new data has it as a non-tombstoned property - got updated
        if (newEntry.tombstone === false) {
          update.update[key] = 'updated';
          continue;
        }

        // otherwise, if new data has this prop tombstoned - do nothing, as property didn't exist anyway
        if (newEntry.tombstone === true) {
          continue;
        }
      }

      // properties that exist both in current and new map data need to have their values compared to decide on the update type
      const currentEntry = prevDataRef.data.get(key)!;

      // compare tombstones first
      if (currentEntry.tombstone === true && newEntry.tombstone === false) {
        // current prop is tombstoned, but new is not. it means prop was updated to a meaningful value
        update.update[key] = 'updated';
        continue;
      }
      if (currentEntry.tombstone === false && newEntry.tombstone === true) {
        // current prop is not tombstoned, but new is. it means prop was removed
        update.update[key] = 'removed';
        continue;
      }
      if (currentEntry.tombstone === true && newEntry.tombstone === true) {
        // both props are tombstoned - treat as noop, as there is no data to compare.
        continue;
      }

      // both props exist and are not tombstoned, need to compare values with deep equals to see if it was changed
      const valueChanged = !deepEqual(currentEntry.data, newEntry.data, { strict: true });
      if (valueChanged) {
        update.update[key] = 'updated';
        continue;
      }
    }

    return update;
  }

  protected _mergeInitialDataFromCreateOperation(stateOperation: StateOperation): LiveMapUpdate {
    if (this._client.Utils.isNil(stateOperation.map)) {
      // if a map object is missing for the MAP_CREATE op, the initial value is implicitly an empty map.
      // in this case there is nothing to merge into the current map, so we can just end processing the op.
      return { update: {} };
    }

    const aggregatedUpdate: LiveMapUpdate | LiveObjectUpdateNoop = { update: {} };
    // in order to apply MAP_CREATE op for an existing map, we should merge their underlying entries keys.
    // we can do this by iterating over entries from MAP_CREATE op and apply changes on per-key basis as if we had MAP_SET, MAP_REMOVE operations.
    Object.entries(stateOperation.map.entries ?? {}).forEach(([key, entry]) => {
      // for MAP_CREATE op we must use dedicated timeserial field available on an entry, instead of a timeserial on a message
      const opOriginTimeserial = entry.timeserial;
      let update: LiveMapUpdate | LiveObjectUpdateNoop;
      if (entry.tombstone === true) {
        // entry in MAP_CREATE op is removed, try to apply MAP_REMOVE op
        update = this._applyMapRemove({ key }, opOriginTimeserial);
      } else {
        // entry in MAP_CREATE op is not removed, try to set it via MAP_SET op
        update = this._applyMapSet({ key, data: entry.data }, opOriginTimeserial);
      }

      // skip noop updates
      if ((update as LiveObjectUpdateNoop).noop) {
        return;
      }

      // otherwise copy update data to aggregated update
      Object.assign(aggregatedUpdate.update, update.update);
    });

    this._setCreateOperationIsMerged(true);

    return aggregatedUpdate;
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
      50000,
      500,
    );
  }

  private _handleMapSetWithInvalidObjectReference(op: StateMapOp, opOriginTimeserial: string | undefined): void {
    const refObjectId = op?.data?.objectId!;
    // ensure referenced object always exist so we can subscribe to it becoming valid
    this._liveObjects.getPool().createZeroValueObjectIfNotExists(refObjectId);

    // wait until the referenced object becomes valid, then apply MAP_SET operation,
    // as it will now point to the existing valid object
    const { off } = this._liveObjects
      .getPool()
      .get(refObjectId)!
      .onceValid(() => {
        try {
          const update = this._applyMapSet(op, opOriginTimeserial);
          this.notifyUpdated(update);
        } catch (error) {
          this._client.Logger.logAction(
            this._client.logger,
            this._client.Logger.LOG_ERROR,
            `LiveMap._handleMapSetWithInvalidObjectReference()`,
            `error applying buffered MAP_SET operation: ${this._client.Utils.inspectError(error)}`,
          );
        } finally {
          this._bufferedOperations.delete(bufferedOperation);
        }
      });

    const bufferedOperation: BufferedOperation = {
      cancel: () => off(),
    };
    this._bufferedOperations.add(bufferedOperation);
  }

  private _applyMapCreate(op: StateOperation): LiveMapUpdate | LiveObjectUpdateNoop {
    if (this._createOperationIsMerged) {
      // There can't be two different create operation for the same object id, because the object id
      // fully encodes that operation. This means we can safely ignore any new incoming create operations
      // if we already merged it once.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapCreate()',
        `skipping applying MAP_CREATE op on a map instance as it was already applied before; objectId=${this._objectId}`,
      );
      return { noop: true };
    }

    if (this._semantics !== op.map?.semantics) {
      throw new this._client.ErrorInfo(
        `Cannot apply MAP_CREATE op on LiveMap objectId=${this.getObjectId()}; map's semantics=${this._semantics}, but op expected ${op.map?.semantics}`,
        50000,
        500,
      );
    }

    return this._mergeInitialDataFromCreateOperation(op);
  }

  private _applyMapSet(op: StateMapOp, opOriginTimeserial: string | undefined): LiveMapUpdate | LiveObjectUpdateNoop {
    const { ErrorInfo, Utils } = this._client;

    const existingEntry = this._dataRef.data.get(op.key);
    if (existingEntry && !this._canApplyMapOperation(existingEntry.timeserial, opOriginTimeserial)) {
      // the operation's origin timeserial <= the entry's timeserial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapSet()',
        `skipping update for key="${op.key}": op timeserial ${opOriginTimeserial?.toString()} <= entry timeserial ${existingEntry.timeserial?.toString()}; objectId=${this._objectId}`,
      );
      return { noop: true };
    }

    if (Utils.isNil(op.data) || (Utils.isNil(op.data.value) && Utils.isNil(op.data.objectId))) {
      throw new ErrorInfo(
        `Invalid state data for MAP_SET op on objectId=${this.getObjectId()} on key=${op.key}`,
        50000,
        500,
      );
    }

    let liveData: StateData;
    if (!Utils.isNil(op.data.objectId)) {
      liveData = { objectId: op.data.objectId } as ObjectIdStateData;
    } else {
      liveData = { encoding: op.data.encoding, value: op.data.value } as ValueStateData;
    }

    if (existingEntry) {
      existingEntry.tombstone = false;
      existingEntry.timeserial = opOriginTimeserial;
      existingEntry.data = liveData;
    } else {
      const newEntry: MapEntry = {
        tombstone: false,
        timeserial: opOriginTimeserial,
        data: liveData,
      };
      this._dataRef.data.set(op.key, newEntry);
    }
    return { update: { [op.key]: 'updated' } };
  }

  private _applyMapRemove(
    op: StateMapOp,
    opOriginTimeserial: string | undefined,
  ): LiveMapUpdate | LiveObjectUpdateNoop {
    const existingEntry = this._dataRef.data.get(op.key);
    if (existingEntry && !this._canApplyMapOperation(existingEntry.timeserial, opOriginTimeserial)) {
      // the operation's origin timeserial <= the entry's timeserial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapRemove()',
        `skipping remove for key="${op.key}": op timeserial ${opOriginTimeserial?.toString()} <= entry timeserial ${existingEntry.timeserial?.toString()}; objectId=${this._objectId}`,
      );
      return { noop: true };
    }

    if (existingEntry) {
      existingEntry.tombstone = true;
      existingEntry.timeserial = opOriginTimeserial;
      existingEntry.data = undefined;
    } else {
      const newEntry: MapEntry = {
        tombstone: true,
        timeserial: opOriginTimeserial,
        data: undefined,
      };
      this._dataRef.data.set(op.key, newEntry);
    }

    return { update: { [op.key]: 'removed' } };
  }

  /**
   * Returns true if the origin timeserials of the given operation and entry indicate that
   * the operation should be applied to the entry, following the CRDT semantics of this LiveMap.
   */
  private _canApplyMapOperation(entryTimeserial: string | undefined, opTimeserial: string | undefined): boolean {
    // for LWW CRDT semantics (the only supported LiveMap semantic) an operation
    // should only be applied if its timeserial is strictly greater ("after") than an entry's timeserial.

    if (!entryTimeserial && !opTimeserial) {
      // if both timeserials are nullish or emptry strings, we treat them as the "earliest possible" timeserials,
      // in which case they are "equal", so the operation should not be applied
      return false;
    }

    if (!entryTimeserial) {
      // any op timeserial is greater than non-existing entry timeserial
      return true;
    }

    if (!opTimeserial) {
      // non-existing op timeserial is lower than any entry timeserial
      return false;
    }

    // if both timeserials exist, compare them lexicographically
    return opTimeserial > entryTimeserial;
  }

  private _liveMapDataFromMapEntries(entries: Record<string, StateMapEntry>): LiveMapData {
    const liveMapData: LiveMapData = {
      data: new Map<string, MapEntry>(),
    };

    // need to iterate over entries manually to work around optional parameters from state object entries type
    Object.entries(entries ?? {}).forEach(([key, entry]) => {
      let liveData: StateData;
      if (typeof entry.data.objectId !== 'undefined') {
        liveData = { objectId: entry.data.objectId } as ObjectIdStateData;
      } else {
        liveData = { encoding: entry.data.encoding, value: entry.data.value } as ValueStateData;
      }

      const liveDataEntry: MapEntry = {
        timeserial: entry.timeserial,
        // true only if we received explicit true. otherwise always false
        tombstone: entry.tombstone === true,
        data: liveData,
      };

      liveMapData.data.set(key, liveDataEntry);
    });

    return liveMapData;
  }
}
