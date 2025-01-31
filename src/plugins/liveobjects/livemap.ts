import deepEqual from 'deep-equal';

import type * as API from '../../../ably';
import { DEFAULTS } from './defaults';
import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';
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
  /**
   * Can't use timeserial from the operation that deleted the entry for the same reason as for {@link LiveObject} tombstones, see explanation there.
   */
  tombstonedAt: number | undefined;
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
   * Returns a {@link LiveMap} instance based on the provided MAP_CREATE state operation.
   * The provided state operation must hold a valid map object data.
   *
   * @internal
   */
  static fromStateOperation<T extends API.LiveMapType>(
    liveobjects: LiveObjects,
    stateOperation: StateOperation,
  ): LiveMap<T> {
    const obj = new LiveMap<T>(liveobjects, stateOperation.map?.semantics!, stateOperation.objectId);
    obj._mergeInitialDataFromCreateOperation(stateOperation);
    return obj;
  }

  /**
   * @internal
   */
  static createMapSetMessage<TKey extends keyof API.LiveMapType & string>(
    liveObjects: LiveObjects,
    objectId: string,
    key: TKey,
    value: API.LiveMapType[TKey],
  ): StateMessage {
    const client = liveObjects.getClient();

    LiveMap.validateKeyValue(liveObjects, key, value);

    const stateData: StateData =
      value instanceof LiveObject
        ? ({ objectId: value.getObjectId() } as ObjectIdStateData)
        : ({ value } as ValueStateData);

    const stateMessage = StateMessage.fromValues(
      {
        operation: {
          action: StateOperationAction.MAP_SET,
          objectId,
          mapOp: {
            key,
            data: stateData,
          },
        } as StateOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return stateMessage;
  }

  /**
   * @internal
   */
  static createMapRemoveMessage<TKey extends keyof API.LiveMapType & string>(
    liveObjects: LiveObjects,
    objectId: string,
    key: TKey,
  ): StateMessage {
    const client = liveObjects.getClient();

    if (typeof key !== 'string') {
      throw new client.ErrorInfo('Map key should be string', 40013, 400);
    }

    const stateMessage = StateMessage.fromValues(
      {
        operation: {
          action: StateOperationAction.MAP_REMOVE,
          objectId,
          mapOp: { key },
        } as StateOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return stateMessage;
  }

  /**
   * @internal
   */
  static validateKeyValue<TKey extends keyof API.LiveMapType & string>(
    liveObjects: LiveObjects,
    key: TKey,
    value: API.LiveMapType[TKey],
  ): void {
    const client = liveObjects.getClient();

    if (typeof key !== 'string') {
      throw new client.ErrorInfo('Map key should be string', 40013, 400);
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      !client.Platform.BufferUtils.isBuffer(value) &&
      !(value instanceof LiveObject)
    ) {
      throw new client.ErrorInfo('Map value data type is unsupported', 40013, 400);
    }
  }

  /**
   * @internal
   */
  static async createMapCreateMessage(liveObjects: LiveObjects, entries?: API.LiveMapType): Promise<StateMessage> {
    const client = liveObjects.getClient();

    if (entries !== undefined && (entries === null || typeof entries !== 'object')) {
      throw new client.ErrorInfo('Map entries should be a key/value object', 40013, 400);
    }

    Object.entries(entries ?? {}).forEach(([key, value]) => LiveMap.validateKeyValue(liveObjects, key, value));

    const initialValueObj = LiveMap.createInitialValueObject(entries);
    const { encodedInitialValue, format } = StateMessage.encodeInitialValue(initialValueObj, client);
    const nonce = client.Utils.cheapRandStr();
    const msTimestamp = await client.getTimestamp(true);

    const objectId = ObjectId.fromInitialValue(
      client.Platform,
      'map',
      encodedInitialValue,
      nonce,
      msTimestamp,
    ).toString();

    const stateMessage = StateMessage.fromValues(
      {
        operation: {
          ...initialValueObj,
          action: StateOperationAction.MAP_CREATE,
          objectId,
          nonce,
          initialValue: encodedInitialValue,
          initialValueEncoding: format,
        } as StateOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return stateMessage;
  }

  /**
   * @internal
   */
  static createInitialValueObject(entries?: API.LiveMapType): Pick<StateOperation, 'map'> {
    const stateMapEntries: Record<string, StateMapEntry> = {};

    Object.entries(entries ?? {}).forEach(([key, value]) => {
      const stateData: StateData =
        value instanceof LiveObject
          ? ({ objectId: value.getObjectId() } as ObjectIdStateData)
          : ({ value } as ValueStateData);

      stateMapEntries[key] = {
        data: stateData,
      };
    });

    return {
      map: {
        semantics: MapSemantics.LWW,
        entries: stateMapEntries,
      },
    };
  }

  /**
   * Returns the value associated with the specified key in the underlying Map object.
   *
   * - If this map object is tombstoned (deleted), `undefined` is returned.
   * - If no entry is associated with the specified key, `undefined` is returned.
   * - If map entry is tombstoned (deleted), `undefined` is returned.
   * - If the value associated with the provided key is an objectId string of another Live Object, a reference to that Live Object
   * is returned, provided it exists in the local pool and is not tombstoned. Otherwise, `undefined` is returned.
   * - If the value is not an objectId, then that value is returned.
   */
  // force the key to be of type string as we only allow strings as key in a map
  get<TKey extends keyof T & string>(key: TKey): T[TKey] | undefined {
    if (this.isTombstoned()) {
      return undefined as T[TKey];
    }

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

    if (refObject.isTombstoned()) {
      // tombstoned objects must not be surfaced to the end users
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
      if ('objectId' in data) {
        const refObject = this._liveObjects.getPool().get(data.objectId);

        if (refObject?.isTombstoned()) {
          // should not count tombstoned objects
          continue;
        }
      }

      size++;
    }

    return size;
  }

  /**
   * Send a MAP_SET operation to the realtime system to set a key on this LiveMap object to a specified value.
   *
   * This does not modify the underlying data of this LiveMap object. Instead, the change will be applied when
   * the published MAP_SET operation is echoed back to the client and applied to the object following the regular
   * operation application procedure.
   *
   * @returns A promise which resolves upon receiving the ACK message for the published operation message.
   */
  async set<TKey extends keyof T & string>(key: TKey, value: T[TKey]): Promise<void> {
    const stateMessage = LiveMap.createMapSetMessage(this._liveObjects, this.getObjectId(), key, value);
    return this._liveObjects.publish([stateMessage]);
  }

  /**
   * Send a MAP_REMOVE operation to the realtime system to tombstone a key on this LiveMap object.
   *
   * This does not modify the underlying data of this LiveMap object. Instead, the change will be applied when
   * the published MAP_REMOVE operation is echoed back to the client and applied to the object following the regular
   * operation application procedure.
   *
   * @returns A promise which resolves upon receiving the ACK message for the published operation message.
   */
  async remove<TKey extends keyof T & string>(key: TKey): Promise<void> {
    const stateMessage = LiveMap.createMapRemoveMessage(this._liveObjects, this.getObjectId(), key);
    return this._liveObjects.publish([stateMessage]);
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
        `skipping ${op.action} op: op timeserial ${opOriginTimeserial.toString()} <= site timeserial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this.getObjectId()}`,
      );
      return;
    }
    // should update stored site timeserial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opOriginTimeserial;

    if (this.isTombstoned()) {
      // this object is tombstoned so the operation cannot be applied
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

      case StateOperationAction.OBJECT_DELETE:
        update = this._applyObjectDelete();
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
  overrideWithStateObject(stateObject: StateObject): LiveMapUpdate | LiveObjectUpdateNoop {
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

    // object's site timeserials are still updated even if it is tombstoned, so always use the site timeserials received from the op.
    // should default to empty map if site timeserials do not exist on the state object, so that any future operation may be applied to this object.
    this._siteTimeserials = stateObject.siteTimeserials ?? {};

    if (this.isTombstoned()) {
      // this object is tombstoned. this is a terminal state which can't be overridden. skip the rest of state object message processing
      return { noop: true };
    }

    const previousDataRef = this._dataRef;
    if (stateObject.tombstone) {
      // tombstone this object and ignore the data from the state object message
      this.tombstone();
    } else {
      // override data for this object with data from the state object
      this._createOperationIsMerged = false;
      this._dataRef = this._liveMapDataFromMapEntries(stateObject.map?.entries ?? {});
      if (!this._client.Utils.isNil(stateObject.createOp)) {
        this._mergeInitialDataFromCreateOperation(stateObject.createOp);
      }
    }

    // if object got tombstoned, the update object will include all data that got cleared.
    // otherwise it is a diff between previous value and new value from state object.
    return this._updateFromDataDiff(previousDataRef, this._dataRef);
  }

  /**
   * @internal
   */
  onGCInterval(): void {
    // should remove any tombstoned entries from the underlying map data that have exceeded the GC grace period

    const keysToDelete: string[] = [];
    for (const [key, value] of this._dataRef.data.entries()) {
      if (value.tombstone === true && Date.now() - value.tombstonedAt! >= DEFAULTS.gcGracePeriod) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((x) => this._dataRef.data.delete(x));
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

    this._createOperationIsMerged = true;

    return aggregatedUpdate;
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
      50000,
      500,
    );
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
        `skipping applying MAP_CREATE op on a map instance as it was already applied before; objectId=${this.getObjectId()}`,
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
        `skipping update for key="${op.key}": op timeserial ${opOriginTimeserial?.toString()} <= entry timeserial ${existingEntry.timeserial?.toString()}; objectId=${this.getObjectId()}`,
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
      // this MAP_SET op is setting a key to point to another object via its object id,
      // but it is possible that we don't have the corresponding object in the pool yet (for example, we haven't seen the *_CREATE op for it).
      // we don't want to return undefined from this map's .get() method even if we don't have the object,
      // so instead we create a zero-value object for that object id if it not exists.
      this._liveObjects.getPool().createZeroValueObjectIfNotExists(op.data.objectId);
    } else {
      liveData = { encoding: op.data.encoding, value: op.data.value } as ValueStateData;
    }

    if (existingEntry) {
      existingEntry.tombstone = false;
      existingEntry.tombstonedAt = undefined;
      existingEntry.timeserial = opOriginTimeserial;
      existingEntry.data = liveData;
    } else {
      const newEntry: MapEntry = {
        tombstone: false,
        tombstonedAt: undefined,
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
        `skipping remove for key="${op.key}": op timeserial ${opOriginTimeserial?.toString()} <= entry timeserial ${existingEntry.timeserial?.toString()}; objectId=${this.getObjectId()}`,
      );
      return { noop: true };
    }

    if (existingEntry) {
      existingEntry.tombstone = true;
      existingEntry.tombstonedAt = Date.now();
      existingEntry.timeserial = opOriginTimeserial;
      existingEntry.data = undefined;
    } else {
      const newEntry: MapEntry = {
        tombstone: true,
        tombstonedAt: Date.now(),
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
      // if both timeserials are nullish or empty strings, we treat them as the "earliest possible" timeserials,
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
        data: liveData,
        // consider object as tombstoned only if we received an explicit flag stating that. otherwise it exists
        tombstone: entry.tombstone === true,
        tombstonedAt: entry.tombstone === true ? Date.now() : undefined,
      };

      liveMapData.data.set(key, liveDataEntry);
    });

    return liveMapData;
  }
}
