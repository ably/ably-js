import { dequal } from 'dequal';

import type { Bufferlike } from 'common/platform';
import type * as API from '../../../ably';
import { DEFAULTS } from './defaults';
import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { ObjectId } from './objectid';
import {
  ObjectsMapEntry,
  ObjectMessage,
  ObjectOperation,
  ObjectOperationAction,
  ObjectsMapOp,
  ObjectsMapSemantics,
  ObjectState,
} from './objectmessage';
import { Objects } from './objects';

export type PrimitiveObjectValue = string | number | boolean | Bufferlike;

export interface ObjectIdObjectData {
  /** A reference to another object, used to support composable object structures. */
  objectId: string;
}

export interface ValueObjectData {
  /** Can be set by the client to indicate that value in `string` or `bytes` field have an encoding. */
  encoding?: string;
  /** A primitive boolean leaf value in the object graph. Only one value field can be set. */
  boolean?: boolean;
  /** A primitive binary leaf value in the object graph. Only one value field can be set. */
  bytes?: Bufferlike;
  /** A primitive number leaf value in the object graph. Only one value field can be set. */
  number?: number;
  /** A primitive string leaf value in the object graph. Only one value field can be set. */
  string?: string;
}

export type ObjectData = ObjectIdObjectData | ValueObjectData;

export interface LiveMapEntry {
  tombstone: boolean;
  /**
   * Can't use serial from the operation that deleted the entry for the same reason as for {@link LiveObject} tombstones, see explanation there.
   */
  tombstonedAt: number | undefined;
  timeserial: string | undefined;
  data: ObjectData | undefined;
}

export interface LiveMapData extends LiveObjectData {
  data: Map<string, LiveMapEntry>;
}

export interface LiveMapUpdate<T extends API.LiveMapType> extends LiveObjectUpdate {
  update: { [keyName in keyof T & string]?: 'updated' | 'removed' };
}

export class LiveMap<T extends API.LiveMapType> extends LiveObject<LiveMapData, LiveMapUpdate<T>> {
  constructor(
    objects: Objects,
    private _semantics: ObjectsMapSemantics,
    objectId: string,
  ) {
    super(objects, objectId);
  }

  /**
   * Returns a {@link LiveMap} instance with an empty map data.
   *
   * @internal
   */
  static zeroValue<T extends API.LiveMapType>(objects: Objects, objectId: string): LiveMap<T> {
    return new LiveMap<T>(objects, ObjectsMapSemantics.LWW, objectId);
  }

  /**
   * Returns a {@link LiveMap} instance based on the provided object state.
   * The provided object state must hold a valid map object data.
   *
   * @internal
   */
  static fromObjectState<T extends API.LiveMapType>(objects: Objects, objectState: ObjectState): LiveMap<T> {
    const obj = new LiveMap<T>(objects, objectState.map?.semantics!, objectState.objectId);
    obj.overrideWithObjectState(objectState);
    return obj;
  }

  /**
   * Returns a {@link LiveMap} instance based on the provided MAP_CREATE object operation.
   * The provided object operation must hold a valid map object data.
   *
   * @internal
   */
  static fromObjectOperation<T extends API.LiveMapType>(
    objects: Objects,
    objectOperation: ObjectOperation,
  ): LiveMap<T> {
    const obj = new LiveMap<T>(objects, objectOperation.map?.semantics!, objectOperation.objectId);
    obj._mergeInitialDataFromCreateOperation(objectOperation);
    return obj;
  }

  /**
   * @internal
   */
  static createMapSetMessage<TKey extends keyof API.LiveMapType & string>(
    objects: Objects,
    objectId: string,
    key: TKey,
    value: API.LiveMapType[TKey],
  ): ObjectMessage {
    const client = objects.getClient();

    LiveMap.validateKeyValue(objects, key, value);

    let objectData: ObjectData;
    if (value instanceof LiveObject) {
      const typedObjectData: ObjectIdObjectData = { objectId: value.getObjectId() };
      objectData = typedObjectData;
    } else {
      const typedObjectData: ValueObjectData = {};
      if (typeof value === 'string') {
        typedObjectData.string = value;
      } else if (typeof value === 'number') {
        typedObjectData.number = value;
      } else if (typeof value === 'boolean') {
        typedObjectData.boolean = value;
      } else {
        typedObjectData.bytes = value as Bufferlike;
      }
      objectData = typedObjectData;
    }

    const msg = ObjectMessage.fromValues(
      {
        operation: {
          action: ObjectOperationAction.MAP_SET,
          objectId,
          mapOp: {
            key,
            data: objectData,
          },
        } as ObjectOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return msg;
  }

  /**
   * @internal
   */
  static createMapRemoveMessage<TKey extends keyof API.LiveMapType & string>(
    objects: Objects,
    objectId: string,
    key: TKey,
  ): ObjectMessage {
    const client = objects.getClient();

    if (typeof key !== 'string') {
      throw new client.ErrorInfo('Map key should be string', 40003, 400);
    }

    const msg = ObjectMessage.fromValues(
      {
        operation: {
          action: ObjectOperationAction.MAP_REMOVE,
          objectId,
          mapOp: { key },
        } as ObjectOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return msg;
  }

  /**
   * @internal
   */
  static validateKeyValue<TKey extends keyof API.LiveMapType & string>(
    objects: Objects,
    key: TKey,
    value: API.LiveMapType[TKey],
  ): void {
    const client = objects.getClient();

    if (typeof key !== 'string') {
      throw new client.ErrorInfo('Map key should be string', 40003, 400);
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
  static async createMapCreateMessage(objects: Objects, entries?: API.LiveMapType): Promise<ObjectMessage> {
    const client = objects.getClient();

    if (entries !== undefined && (entries === null || typeof entries !== 'object')) {
      throw new client.ErrorInfo('Map entries should be a key-value object', 40003, 400);
    }

    Object.entries(entries ?? {}).forEach(([key, value]) => LiveMap.validateKeyValue(objects, key, value));

    const initialValueObj = LiveMap.createInitialValueObject(entries);
    const { encodedInitialValue, format } = ObjectMessage.encodeInitialValue(initialValueObj, client);
    const nonce = client.Utils.cheapRandStr();
    const msTimestamp = await client.getTimestamp(true);

    const objectId = ObjectId.fromInitialValue(
      client.Platform,
      'map',
      encodedInitialValue,
      nonce,
      msTimestamp,
    ).toString();

    const msg = ObjectMessage.fromValues(
      {
        operation: {
          ...initialValueObj,
          action: ObjectOperationAction.MAP_CREATE,
          objectId,
          nonce,
          initialValue: encodedInitialValue,
          initialValueEncoding: format,
        } as ObjectOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return msg;
  }

  /**
   * @internal
   */
  static createInitialValueObject(entries?: API.LiveMapType): Pick<ObjectOperation, 'map'> {
    const mapEntries: Record<string, ObjectsMapEntry> = {};

    Object.entries(entries ?? {}).forEach(([key, value]) => {
      let objectData: ObjectData;
      if (value instanceof LiveObject) {
        const typedObjectData: ObjectIdObjectData = { objectId: value.getObjectId() };
        objectData = typedObjectData;
      } else {
        const typedObjectData: ValueObjectData = {};
        if (typeof value === 'string') {
          typedObjectData.string = value;
        } else if (typeof value === 'number') {
          typedObjectData.number = value;
        } else if (typeof value === 'boolean') {
          typedObjectData.boolean = value;
        } else {
          typedObjectData.bytes = value as Bufferlike;
        }
        objectData = typedObjectData;
      }

      mapEntries[key] = {
        data: objectData,
      };
    });

    return {
      map: {
        semantics: ObjectsMapSemantics.LWW,
        entries: mapEntries,
      },
    };
  }

  /**
   * Returns the value associated with the specified key in the underlying Map object.
   *
   * - If this map object is tombstoned (deleted), `undefined` is returned.
   * - If no entry is associated with the specified key, `undefined` is returned.
   * - If map entry is tombstoned (deleted), `undefined` is returned.
   * - If the value associated with the provided key is an objectId string of another LiveObject, a reference to that LiveObject
   * is returned, provided it exists in the local pool and is not tombstoned. Otherwise, `undefined` is returned.
   * - If the value is not an objectId, then that value is returned.
   */
  // force the key to be of type string as we only allow strings as key in a map
  get<TKey extends keyof T & string>(key: TKey): T[TKey] | undefined {
    this._objects.throwIfInvalidAccessApiConfiguration();

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
    return this._getResolvedValueFromObjectData(element.data!) as T[TKey];
  }

  size(): number {
    this._objects.throwIfInvalidAccessApiConfiguration();

    let size = 0;
    for (const value of this._dataRef.data.values()) {
      if (this._isMapEntryTombstoned(value)) {
        // should not count tombstoned entries
        continue;
      }

      size++;
    }

    return size;
  }

  *entries<TKey extends keyof T & string>(): IterableIterator<[TKey, T[TKey]]> {
    this._objects.throwIfInvalidAccessApiConfiguration();

    for (const [key, entry] of this._dataRef.data.entries()) {
      if (this._isMapEntryTombstoned(entry)) {
        // do not return tombstoned entries
        continue;
      }

      // data always exists for non-tombstoned elements
      const value = this._getResolvedValueFromObjectData(entry.data!) as T[TKey];
      yield [key as TKey, value];
    }
  }

  *keys<TKey extends keyof T & string>(): IterableIterator<TKey> {
    for (const [key] of this.entries<TKey>()) {
      yield key;
    }
  }

  *values<TKey extends keyof T & string>(): IterableIterator<T[TKey]> {
    for (const [_, value] of this.entries<TKey>()) {
      yield value;
    }
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
    this._objects.throwIfInvalidWriteApiConfiguration();
    const msg = LiveMap.createMapSetMessage(this._objects, this.getObjectId(), key, value);
    return this._objects.publish([msg]);
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
    this._objects.throwIfInvalidWriteApiConfiguration();
    const msg = LiveMap.createMapRemoveMessage(this._objects, this.getObjectId(), key);
    return this._objects.publish([msg]);
  }

  /**
   * @internal
   */
  applyOperation(op: ObjectOperation, msg: ObjectMessage): void {
    if (op.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Cannot apply object operation with objectId=${op.objectId}, to this LiveMap with objectId=${this.getObjectId()}`,
        92000,
        500,
      );
    }

    const opSerial = msg.serial!;
    const opSiteCode = msg.siteCode!;
    if (!this._canApplyOperation(opSerial, opSiteCode)) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap.applyOperation()',
        `skipping ${op.action} op: op serial ${opSerial.toString()} <= site serial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this.getObjectId()}`,
      );
      return;
    }
    // should update stored site serial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opSerial;

    if (this.isTombstoned()) {
      // this object is tombstoned so the operation cannot be applied
      return;
    }

    let update: LiveMapUpdate<T> | LiveObjectUpdateNoop;
    switch (op.action) {
      case ObjectOperationAction.MAP_CREATE:
        update = this._applyMapCreate(op);
        break;

      case ObjectOperationAction.MAP_SET:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyMapSet(op.mapOp, opSerial);
        }
        break;

      case ObjectOperationAction.MAP_REMOVE:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyMapRemove(op.mapOp, opSerial);
        }
        break;

      case ObjectOperationAction.OBJECT_DELETE:
        update = this._applyObjectDelete();
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
          92000,
          500,
        );
    }

    this.notifyUpdated(update);
  }

  /**
   * @internal
   */
  overrideWithObjectState(objectState: ObjectState): LiveMapUpdate<T> | LiveObjectUpdateNoop {
    if (objectState.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Invalid object state: object state objectId=${objectState.objectId}; LiveMap objectId=${this.getObjectId()}`,
        92000,
        500,
      );
    }

    if (objectState.map?.semantics !== this._semantics) {
      throw new this._client.ErrorInfo(
        `Invalid object state: object state map semantics=${objectState.map?.semantics}; LiveMap semantics=${this._semantics}`,
        92000,
        500,
      );
    }

    if (!this._client.Utils.isNil(objectState.createOp)) {
      // it is expected that create operation can be missing in the object state, so only validate it when it exists
      if (objectState.createOp.objectId !== this.getObjectId()) {
        throw new this._client.ErrorInfo(
          `Invalid object state: object state createOp objectId=${objectState.createOp?.objectId}; LiveMap objectId=${this.getObjectId()}`,
          92000,
          500,
        );
      }

      if (objectState.createOp.action !== ObjectOperationAction.MAP_CREATE) {
        throw new this._client.ErrorInfo(
          `Invalid object state: object state createOp action=${objectState.createOp?.action}; LiveMap objectId=${this.getObjectId()}`,
          92000,
          500,
        );
      }

      if (objectState.createOp.map?.semantics !== this._semantics) {
        throw new this._client.ErrorInfo(
          `Invalid object state: object state createOp map semantics=${objectState.createOp.map?.semantics}; LiveMap semantics=${this._semantics}`,
          92000,
          500,
        );
      }
    }

    // object's site serials are still updated even if it is tombstoned, so always use the site serials received from the op.
    // should default to empty map if site serials do not exist on the object state, so that any future operation may be applied to this object.
    this._siteTimeserials = objectState.siteTimeserials ?? {};

    if (this.isTombstoned()) {
      // this object is tombstoned. this is a terminal state which can't be overridden. skip the rest of object state message processing
      return { noop: true };
    }

    const previousDataRef = this._dataRef;
    if (objectState.tombstone) {
      // tombstone this object and ignore the data from the object state message
      this.tombstone();
    } else {
      // override data for this object with data from the object state
      this._createOperationIsMerged = false;
      this._dataRef = this._liveMapDataFromMapEntries(objectState.map?.entries ?? {});
      if (!this._client.Utils.isNil(objectState.createOp)) {
        this._mergeInitialDataFromCreateOperation(objectState.createOp);
      }
    }

    // if object got tombstoned, the update object will include all data that got cleared.
    // otherwise it is a diff between previous value and new value from object state.
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
    return { data: new Map<string, LiveMapEntry>() };
  }

  protected _updateFromDataDiff(prevDataRef: LiveMapData, newDataRef: LiveMapData): LiveMapUpdate<T> {
    const update: LiveMapUpdate<T> = { update: {} };

    for (const [key, currentEntry] of prevDataRef.data.entries()) {
      const typedKey: keyof T & string = key;
      // any non-tombstoned properties that exist on a current map, but not in the new data - got removed
      if (currentEntry.tombstone === false && !newDataRef.data.has(typedKey)) {
        update.update[typedKey] = 'removed';
      }
    }

    for (const [key, newEntry] of newDataRef.data.entries()) {
      const typedKey: keyof T & string = key;
      if (!prevDataRef.data.has(typedKey)) {
        // if property does not exist in the current map, but new data has it as a non-tombstoned property - got updated
        if (newEntry.tombstone === false) {
          update.update[typedKey] = 'updated';
          continue;
        }

        // otherwise, if new data has this prop tombstoned - do nothing, as property didn't exist anyway
        if (newEntry.tombstone === true) {
          continue;
        }
      }

      // properties that exist both in current and new map data need to have their values compared to decide on the update type
      const currentEntry = prevDataRef.data.get(typedKey)!;

      // compare tombstones first
      if (currentEntry.tombstone === true && newEntry.tombstone === false) {
        // current prop is tombstoned, but new is not. it means prop was updated to a meaningful value
        update.update[typedKey] = 'updated';
        continue;
      }
      if (currentEntry.tombstone === false && newEntry.tombstone === true) {
        // current prop is not tombstoned, but new is. it means prop was removed
        update.update[typedKey] = 'removed';
        continue;
      }
      if (currentEntry.tombstone === true && newEntry.tombstone === true) {
        // both props are tombstoned - treat as noop, as there is no data to compare.
        continue;
      }

      // both props exist and are not tombstoned, need to compare values with deep equals to see if it was changed
      const valueChanged = !dequal(currentEntry.data, newEntry.data);
      if (valueChanged) {
        update.update[typedKey] = 'updated';
        continue;
      }
    }

    return update;
  }

  protected _mergeInitialDataFromCreateOperation(objectOperation: ObjectOperation): LiveMapUpdate<T> {
    if (this._client.Utils.isNil(objectOperation.map)) {
      // if a map object is missing for the MAP_CREATE op, the initial value is implicitly an empty map.
      // in this case there is nothing to merge into the current map, so we can just end processing the op.
      return { update: {} };
    }

    const aggregatedUpdate: LiveMapUpdate<T> = { update: {} };
    // in order to apply MAP_CREATE op for an existing map, we should merge their underlying entries keys.
    // we can do this by iterating over entries from MAP_CREATE op and apply changes on per-key basis as if we had MAP_SET, MAP_REMOVE operations.
    Object.entries(objectOperation.map.entries ?? {}).forEach(([key, entry]) => {
      // for a MAP_CREATE operation we must use the serial value available on an entry, instead of a serial on a message
      const opSerial = entry.timeserial;
      let update: LiveMapUpdate<T> | LiveObjectUpdateNoop;
      if (entry.tombstone === true) {
        // entry in MAP_CREATE op is removed, try to apply MAP_REMOVE op
        update = this._applyMapRemove({ key }, opSerial);
      } else {
        // entry in MAP_CREATE op is not removed, try to set it via MAP_SET op
        update = this._applyMapSet({ key, data: entry.data }, opSerial);
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

  private _throwNoPayloadError(op: ObjectOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
      92000,
      500,
    );
  }

  private _applyMapCreate(op: ObjectOperation): LiveMapUpdate<T> | LiveObjectUpdateNoop {
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
        92000,
        500,
      );
    }

    return this._mergeInitialDataFromCreateOperation(op);
  }

  private _applyMapSet(op: ObjectsMapOp, opSerial: string | undefined): LiveMapUpdate<T> | LiveObjectUpdateNoop {
    const { ErrorInfo, Utils } = this._client;

    const existingEntry = this._dataRef.data.get(op.key);
    if (existingEntry && !this._canApplyMapOperation(existingEntry.timeserial, opSerial)) {
      // the operation's serial <= the entry's serial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapSet()',
        `skipping update for key="${op.key}": op serial ${opSerial?.toString()} <= entry serial ${existingEntry.timeserial?.toString()}; objectId=${this.getObjectId()}`,
      );
      return { noop: true };
    }

    if (
      Utils.isNil(op.data) ||
      (Utils.isNil(op.data.objectId) &&
        Utils.isNil(op.data.boolean) &&
        Utils.isNil(op.data.bytes) &&
        Utils.isNil(op.data.number) &&
        Utils.isNil(op.data.string))
    ) {
      throw new ErrorInfo(
        `Invalid object data for MAP_SET op on objectId=${this.getObjectId()} on key=${op.key}`,
        92000,
        500,
      );
    }

    let liveData: ObjectData;
    if (!Utils.isNil(op.data.objectId)) {
      liveData = { objectId: op.data.objectId } as ObjectIdObjectData;
      // this MAP_SET op is setting a key to point to another object via its object id,
      // but it is possible that we don't have the corresponding object in the pool yet (for example, we haven't seen the *_CREATE op for it).
      // we don't want to return undefined from this map's .get() method even if we don't have the object,
      // so instead we create a zero-value object for that object id if it not exists.
      this._objects.getPool().createZeroValueObjectIfNotExists(op.data.objectId);
    } else {
      liveData = {
        encoding: op.data.encoding,
        boolean: op.data.boolean,
        bytes: op.data.bytes,
        number: op.data.number,
        string: op.data.string,
      } as ValueObjectData;
    }

    if (existingEntry) {
      existingEntry.tombstone = false;
      existingEntry.tombstonedAt = undefined;
      existingEntry.timeserial = opSerial;
      existingEntry.data = liveData;
    } else {
      const newEntry: LiveMapEntry = {
        tombstone: false,
        tombstonedAt: undefined,
        timeserial: opSerial,
        data: liveData,
      };
      this._dataRef.data.set(op.key, newEntry);
    }

    const update: LiveMapUpdate<T> = { update: {} };
    const typedKey: keyof T & string = op.key;
    update.update[typedKey] = 'updated';

    return update;
  }

  private _applyMapRemove(op: ObjectsMapOp, opSerial: string | undefined): LiveMapUpdate<T> | LiveObjectUpdateNoop {
    const existingEntry = this._dataRef.data.get(op.key);
    if (existingEntry && !this._canApplyMapOperation(existingEntry.timeserial, opSerial)) {
      // the operation's serial <= the entry's serial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapRemove()',
        `skipping remove for key="${op.key}": op serial ${opSerial?.toString()} <= entry serial ${existingEntry.timeserial?.toString()}; objectId=${this.getObjectId()}`,
      );
      return { noop: true };
    }

    if (existingEntry) {
      existingEntry.tombstone = true;
      existingEntry.tombstonedAt = Date.now();
      existingEntry.timeserial = opSerial;
      existingEntry.data = undefined;
    } else {
      const newEntry: LiveMapEntry = {
        tombstone: true,
        tombstonedAt: Date.now(),
        timeserial: opSerial,
        data: undefined,
      };
      this._dataRef.data.set(op.key, newEntry);
    }

    const update: LiveMapUpdate<T> = { update: {} };
    const typedKey: keyof T & string = op.key;
    update.update[typedKey] = 'removed';

    return update;
  }

  /**
   * Returns true if the serials of the given operation and entry indicate that
   * the operation should be applied to the entry, following the CRDT semantics of this LiveMap.
   */
  private _canApplyMapOperation(mapEntrySerial: string | undefined, opSerial: string | undefined): boolean {
    // for LWW CRDT semantics (the only supported LiveMap semantic) an operation
    // should only be applied if its serial is strictly greater ("after") than an entry's serial.

    if (!mapEntrySerial && !opSerial) {
      // if both serials are nullish or empty strings, we treat them as the "earliest possible" serials,
      // in which case they are "equal", so the operation should not be applied
      return false;
    }

    if (!mapEntrySerial) {
      // any operation serial is greater than non-existing entry serial
      return true;
    }

    if (!opSerial) {
      // non-existing operation serial is lower than any entry serial
      return false;
    }

    // if both serials exist, compare them lexicographically
    return opSerial > mapEntrySerial;
  }

  private _liveMapDataFromMapEntries(entries: Record<string, ObjectsMapEntry>): LiveMapData {
    const liveMapData: LiveMapData = {
      data: new Map<string, LiveMapEntry>(),
    };

    // need to iterate over entries to correctly process optional parameters
    Object.entries(entries ?? {}).forEach(([key, entry]) => {
      let liveData: ObjectData | undefined = undefined;

      if (!this._client.Utils.isNil(entry.data)) {
        if (!this._client.Utils.isNil(entry.data.objectId)) {
          liveData = { objectId: entry.data.objectId } as ObjectIdObjectData;
        } else {
          liveData = {
            encoding: entry.data.encoding,
            boolean: entry.data.boolean,
            bytes: entry.data.bytes,
            number: entry.data.number,
            string: entry.data.string,
          } as ValueObjectData;
        }
      }

      const liveDataEntry: LiveMapEntry = {
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

  /**
   * Returns value as is if object data stores a primitive type, or a reference to another LiveObject from the pool if it stores an objectId.
   */
  private _getResolvedValueFromObjectData(data: ObjectData): PrimitiveObjectValue | LiveObject | undefined {
    // if object data stores one of the primitive values, just return it as is.
    const asValueObject = data as ValueObjectData;
    if (asValueObject.boolean !== undefined) {
      return asValueObject.boolean;
    }
    if (asValueObject.bytes !== undefined) {
      return asValueObject.bytes;
    }
    if (asValueObject.number !== undefined) {
      return asValueObject.number;
    }
    if (asValueObject.string !== undefined) {
      return asValueObject.string;
    }

    // otherwise, it has an objectId reference, and we should get the actual object from the pool
    const objectId = (data as ObjectIdObjectData).objectId;
    const refObject: LiveObject | undefined = this._objects.getPool().get(objectId);
    if (!refObject) {
      return undefined;
    }

    if (refObject.isTombstoned()) {
      // tombstoned objects must not be surfaced to the end users
      return undefined;
    }

    return refObject;
  }

  private _isMapEntryTombstoned(entry: LiveMapEntry): boolean {
    if (entry.tombstone === true) {
      return true;
    }

    // data always exists for non-tombstoned entries
    const data = entry.data!;
    if ('objectId' in data) {
      const refObject = this._objects.getPool().get(data.objectId);

      if (refObject?.isTombstoned()) {
        // entry that points to tombstoned object should be considered tombstoned as well
        return true;
      }
    }

    return false;
  }
}
