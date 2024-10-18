import { LiveObject, LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import {
  MapSemantics,
  StateMap,
  StateMapOp,
  StateMessage,
  StateOperation,
  StateOperationAction,
  StateValue,
} from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

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
  timeserial: Timeserial;
  data: StateData | undefined;
}

export interface LiveMapData extends LiveObjectData {
  data: Map<string, MapEntry>;
}

export class LiveMap extends LiveObject<LiveMapData> {
  constructor(
    liveObjects: LiveObjects,
    private _semantics: MapSemantics,
    initialData?: LiveMapData | null,
    objectId?: string,
  ) {
    super(liveObjects, initialData, objectId);
  }

  /**
   * Returns the value associated with the specified key in the underlying Map object.
   * If no element is associated with the specified key, undefined is returned.
   * If the value that is associated to the provided key is an objectId string of another Live Object,
   * then you will get a reference to that Live Object if it exists in the local pool, or undefined otherwise.
   * If the value is not an objectId, then you will get that value.
   */
  get(key: string): LiveObject | StateValue | undefined {
    const element = this._dataRef.data.get(key);

    if (element === undefined) {
      return undefined;
    }

    if (element.tombstone === true) {
      return undefined;
    }

    // data exists for non-tombstoned elements
    const data = element.data!;

    if ('value' in data) {
      return data.value;
    } else {
      return this._liveObjects.getPool().get(data.objectId);
    }
  }

  size(): number {
    let size = 0;
    for (const value of this._dataRef.data.values()) {
      if (value.tombstone === true) {
        // should not count deleted entries
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

    switch (op.action) {
      case StateOperationAction.MAP_CREATE:
        if (this._client.Utils.isNil(op.map)) {
          this._throwNoPayloadError(op);
        } else {
          this._applyMapCreate(op.map);
        }
        break;

      case StateOperationAction.MAP_SET:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
        } else {
          this._applyMapSet(op.mapOp, msg.serial);
        }
        break;

      case StateOperationAction.MAP_REMOVE:
        if (this._client.Utils.isNil(op.mapOp)) {
          this._throwNoPayloadError(op);
        } else {
          this._applyMapRemove(op.mapOp, msg.serial);
        }
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
          50000,
          500,
        );
    }
  }

  protected _getZeroValueData(): LiveMapData {
    return { data: new Map<string, MapEntry>() };
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveMap objectId=${this.getObjectId()}`,
      50000,
      500,
    );
  }

  private _applyMapCreate(op: StateMap): void {
    if (this._semantics !== op.semantics) {
      throw new this._client.ErrorInfo(
        `Cannot apply MAP_CREATE op on LiveMap objectId=${this.getObjectId()}; map's semantics=${this._semantics}, but op expected ${op.semantics}`,
        50000,
        500,
      );
    }

    // in order to apply MAP_CREATE op for an existing map, we should merge their underlying entries keys.
    // we can do this by iterating over entries from MAP_CREATE op and apply changes on per-key basis as if we had MAP_SET, MAP_REMOVE operations.
    Object.entries(op.entries ?? {}).forEach(([key, entry]) => {
      // for MAP_CREATE op we must use dedicated timeserial field available on an entry, instead of a timeserial on a message
      const opOriginTimeserial = entry.timeserial;
      if (entry.tombstone === true) {
        // entry in MAP_CREATE op is deleted, try to apply MAP_REMOVE op
        this._applyMapRemove({ key }, opOriginTimeserial);
      } else {
        // entry in MAP_CREATE op is not deleted, try to set it via MAP_SET op
        this._applyMapSet({ key, data: entry.data }, opOriginTimeserial);
      }
    });
  }

  private _applyMapSet(op: StateMapOp, opOriginTimeserialStr: string | undefined): void {
    const { ErrorInfo, Utils } = this._client;

    const opTimeserial = DefaultTimeserial.calculateTimeserial(this._client, opOriginTimeserialStr);
    const existingEntry = this._dataRef.data.get(op.key);
    if (
      existingEntry &&
      (opTimeserial.before(existingEntry.timeserial) || opTimeserial.equal(existingEntry.timeserial))
    ) {
      // the operation's origin timeserial <= the entry's timeserial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapSet()',
        `skipping updating key="${op.key}" as existing key entry has greater timeserial: ${existingEntry.timeserial.toString()}, than the op: ${opOriginTimeserialStr}; objectId=${this._objectId}`,
      );
      return;
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
      existingEntry.timeserial = opTimeserial;
      existingEntry.data = liveData;
    } else {
      const newEntry: MapEntry = {
        tombstone: false,
        timeserial: opTimeserial,
        data: liveData,
      };
      this._dataRef.data.set(op.key, newEntry);
    }
  }

  private _applyMapRemove(op: StateMapOp, opOriginTimeserialStr: string | undefined): void {
    const opTimeserial = DefaultTimeserial.calculateTimeserial(this._client, opOriginTimeserialStr);
    const existingEntry = this._dataRef.data.get(op.key);
    if (
      existingEntry &&
      (opTimeserial.before(existingEntry.timeserial) || opTimeserial.equal(existingEntry.timeserial))
    ) {
      // the operation's origin timeserial <= the entry's timeserial, ignore the operation.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveMap._applyMapRemove()',
        `skipping removing key="${op.key}" as existing key entry has greater timeserial: ${existingEntry.timeserial.toString()}, than the op: ${opOriginTimeserialStr}; objectId=${this._objectId}`,
      );
      return;
    }

    if (existingEntry) {
      existingEntry.tombstone = true;
      existingEntry.timeserial = opTimeserial;
      existingEntry.data = undefined;
    } else {
      const newEntry: MapEntry = {
        tombstone: true,
        timeserial: opTimeserial,
        data: undefined,
      };
      this._dataRef.data.set(op.key, newEntry);
    }
  }
}
