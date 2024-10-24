import type { decodeData } from 'common/lib/types/message';
import type Platform from 'common/platform';
import type { ChannelOptions } from 'common/types/channel';

export enum StateOperationAction {
  MAP_CREATE = 0,
  MAP_SET = 1,
  MAP_REMOVE = 2,
  COUNTER_CREATE = 3,
  COUNTER_INC = 4,
}

export enum MapSemantics {
  LWW = 0,
}

/** A StateValue represents a concrete leaf value in a state object graph. */
export type StateValue = string | number | boolean | Buffer | Uint8Array;

/** StateData captures a value in a state object. */
export interface StateData {
  /** A reference to another state object, used to support composable state objects. */
  objectId?: string;
  /**
   * The encoding the client should use to interpret the value.
   * Analogous to the `encoding` field on the `Message` and `PresenceMessage` types.
   */
  encoding?: string;
  /** A concrete leaf value in the state object graph. */
  value?: StateValue;
}

/** A StateMapOp describes an operation to be applied to a Map object. */
export interface StateMapOp {
  /** The key of the map entry to which the operation should be applied. */
  key: string;
  /** The data that the map entry should contain if the operation is a MAP_SET operation. */
  data?: StateData;
}

/** A StateCounterOp describes an operation to be applied to a Counter object. */
export interface StateCounterOp {
  /** The data value that should be added to the counter */
  amount: number;
}

/** A MapEntry represents the value at a given key in a Map object. */
export interface StateMapEntry {
  /** Indicates whether the map entry has been removed. */
  tombstone?: boolean;
  /**
   * The *origin* timeserial of the last operation that was applied to the map entry.
   *
   * It is optional in a MAP_CREATE operation and might be missing, in which case the client should default to using zero-value timeserial,
   * which is the "earliest possible" timeserial. This will allow any other operation to update the field based on a timeserial comparison.
   */
  timeserial?: string;
  /** The data that represents the value of the map entry. */
  data: StateData;
}

/** A Map object represents a map of key-value pairs. */
export interface StateMap {
  /** The conflict-resolution semantics used by the map object. */
  semantics?: MapSemantics;
  // The map entries, indexed by key.
  entries?: Record<string, StateMapEntry>;
}

/** A Counter object represents an incrementable and decrementable value */
export interface StateCounter {
  /** The value of the counter */
  count?: number;
  /**
   * Indicates (true) if the counter has seen an explicit create operation
   * and false if the counter was created with a default value when
   * processing a regular operation.
   */
  created: boolean;
}

/** A StateOperation describes an operation to be applied to a state object. */
export interface StateOperation {
  /** Defines the operation to be applied to the state object. */
  action: StateOperationAction;
  /** The object ID of the state object to which the operation should be applied. */
  objectId: string;
  /** The payload for the operation if it is an operation on a Map object type. */
  mapOp?: StateMapOp;
  /** The payload for the operation if it is an operation on a Counter object type. */
  counterOp?: StateCounterOp;
  /**
   * The payload for the operation if the operation is MAP_CREATE.
   * Defines the initial value for the map object.
   */
  map?: StateMap;
  /**
   * The payload for the operation if the operation is COUNTER_CREATE.
   * Defines the initial value for the counter object.
   */
  counter?: StateCounter;
  /**
   * The nonce, must be present on create operations. This is the random part
   * that has been hashed with the type and initial value to create the object ID.
   */
  nonce?: string;
}

/** A StateObject describes the instantaneous state of an object. */
export interface StateObject {
  /** The identifier of the state object. */
  objectId: string;
  /** The *regional* timeserial of the last operation that was applied to this state object. */
  regionalTimeserial: string;
  /** The data that represents the state of the object if it is a Map object type. */
  map?: StateMap;
  /** The data that represents the state of the object if it is a Counter object type. */
  counter?: StateCounter;
}

/**
 * @internal
 */
export class StateMessage {
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  channel?: string;
  extras?: any;
  /** Describes an operation to be applied to a state object. */
  operation?: StateOperation;
  /** Describes the instantaneous state of an object. */
  object?: StateObject;
  /** Timeserial format. Contains the origin timeserial for this state message. */
  serial?: string;

  constructor(private _platform: typeof Platform) {}

  static async decode(
    message: StateMessage,
    inputContext: ChannelOptions,
    decodeDataFn: typeof decodeData,
  ): Promise<void> {
    // TODO: decide how to handle individual errors from decoding values. currently we throw first ever error we get

    const decodeMapEntry = async (
      entry: StateMapEntry,
      ctx: ChannelOptions,
      decode: typeof decodeData,
    ): Promise<void> => {
      const { data, encoding, error } = await decode(entry.data.value, entry.data.encoding, ctx);
      entry.data.value = data;
      entry.data.encoding = encoding ?? undefined;

      if (error) {
        throw error;
      }
    };

    if (message.object?.map?.entries) {
      for (const entry of Object.values(message.object.map.entries)) {
        await decodeMapEntry(entry, inputContext, decodeDataFn);
      }
    }

    if (message.operation?.map) {
      for (const entry of Object.values(message.operation.map)) {
        await decodeMapEntry(entry, inputContext, decodeDataFn);
      }
    }

    if (message.operation?.mapOp?.data && 'value' in message.operation?.mapOp?.data) {
      const mapOpData = message.operation.mapOp.data;
      const { data, encoding, error } = await decodeDataFn(mapOpData.value, mapOpData.encoding, inputContext);
      mapOpData.value = data;
      mapOpData.encoding = encoding ?? undefined;

      if (error) {
        throw error;
      }
    }
  }

  static fromValues(values: StateMessage | Record<string, unknown>, platform: typeof Platform): StateMessage {
    return Object.assign(new StateMessage(platform), values);
  }

  static fromValuesArray(values: unknown[], platform: typeof Platform): StateMessage[] {
    const count = values.length;
    const result = new Array(count);

    for (let i = 0; i < count; i++) {
      result[i] = this.fromValues(values[i] as Record<string, unknown>, platform);
    }

    return result;
  }

  /**
   * Overload toJSON() to intercept JSON.stringify()
   * @return {*}
   */
  toJSON(): {
    id?: string;
    clientId?: string;
    operation?: StateOperation;
    object?: StateObject;
    extras?: any;
  } {
    // need to encode buffer data to base64 if present and if we're returning a real JSON.
    // although msgpack also calls toJSON() directly,
    // we know it is a JSON.stringify() call if we have a non-empty arguments list.
    // if withBase64Encoding = true - JSON.stringify() call
    // if withBase64Encoding = false - we were called by msgpack
    const withBase64Encoding = arguments.length > 0;

    let operationCopy: StateOperation | undefined = undefined;
    if (this.operation) {
      // deep copy "operation" prop so we can modify it here.
      // buffer values won't be correctly copied, so we will need to set them again explictly
      operationCopy = JSON.parse(JSON.stringify(this.operation)) as StateOperation;

      if (operationCopy.mapOp?.data && 'value' in operationCopy.mapOp.data) {
        // use original "operation" prop when encoding values, so we have access to original buffer values.
        operationCopy.mapOp.data = this._encodeStateData(this.operation.mapOp?.data!, withBase64Encoding);
      }

      if (operationCopy.map?.entries) {
        Object.entries(operationCopy.map.entries).forEach(([key, entry]) => {
          // use original "operation" prop when encoding values, so we have access to original buffer values.
          entry.data = this._encodeStateData(this.operation?.map?.entries?.[key].data!, withBase64Encoding);
        });
      }
    }

    let object: StateObject | undefined = undefined;
    if (this.object) {
      // deep copy "object" prop so we can modify it here.
      // buffer values won't be correctly copied, so we will need to set them again explictly
      object = JSON.parse(JSON.stringify(this.object)) as StateObject;

      if (object.map?.entries) {
        Object.entries(object.map.entries).forEach(([key, entry]) => {
          // use original "object" prop when encoding values, so we have access to original buffer values.
          entry.data = this._encodeStateData(this.object?.map?.entries?.[key].data!, withBase64Encoding);
        });
      }
    }

    return {
      id: this.id,
      clientId: this.clientId,
      operation: operationCopy,
      object: object,
      extras: this.extras,
    };
  }

  toString(): string {
    let result = '[StateMessage';

    if (this.id) result += '; id=' + this.id;
    if (this.timestamp) result += '; timestamp=' + this.timestamp;
    if (this.clientId) result += '; clientId=' + this.clientId;
    if (this.connectionId) result += '; connectionId=' + this.connectionId;
    // TODO: prettify output for operation and object and encode buffers.
    // see examples for data in Message and PresenceMessage
    if (this.operation) result += '; operation=' + JSON.stringify(this.operation);
    if (this.object) result += '; object=' + JSON.stringify(this.object);
    if (this.extras) result += '; extras=' + JSON.stringify(this.extras);
    if (this.serial) result += '; serial=' + this.serial;

    result += ']';

    return result;
  }

  private _encodeStateData(data: StateData, withBase64Encoding: boolean): StateData {
    const { value, encoding } = this._encodeStateValue(data?.value, data?.encoding, withBase64Encoding);
    return {
      ...data,
      value,
      encoding,
    };
  }

  private _encodeStateValue(
    value: StateValue | undefined,
    encoding: string | undefined,
    withBase64Encoding: boolean,
  ): {
    value: StateValue | undefined;
    encoding: string | undefined;
  } {
    if (!value || !this._platform.BufferUtils.isBuffer(value)) {
      return { value, encoding };
    }

    if (withBase64Encoding) {
      return {
        value: this._platform.BufferUtils.base64Encode(value),
        encoding: encoding ? encoding + '/base64' : 'base64',
      };
    }

    // toBuffer returns a datatype understandable by
    // that platform's msgpack implementation (Buffer in node, Uint8Array in browsers)
    return {
      value: this._platform.BufferUtils.toBuffer(value),
      encoding,
    };
  }
}
