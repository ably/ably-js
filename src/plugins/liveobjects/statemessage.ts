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
  /** A vector of origin timeserials keyed by site code of the last operation that was applied to this state object. */
  siteTimeserials: Record<string, string>;
  /**
   * The operation that created the state object.
   *
   * Can be missing if create operation for the object is not known at this point.
   */
  createOp?: StateOperation;
  /**
   * The data that represents the result of applying all operations to a Map object
   * excluding the initial value from the create operation if it is a Map object type.
   */
  map?: StateMap;
  /**
   * The data that represents the result of applying all operations to a Counter object
   * excluding the initial value from the create operation if it is a Counter object type.
   */
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

    if (message.object?.map?.entries) {
      await StateMessage._decodeMapEntries(message.object.map.entries, inputContext, decodeDataFn);
    }

    if (message.object?.createOp?.map?.entries) {
      await StateMessage._decodeMapEntries(message.object.createOp.map.entries, inputContext, decodeDataFn);
    }

    if (message.object?.createOp?.mapOp?.data && 'value' in message.object.createOp.mapOp.data) {
      await StateMessage._decodeStateData(message.object.createOp.mapOp.data, inputContext, decodeDataFn);
    }

    if (message.operation?.map?.entries) {
      await StateMessage._decodeMapEntries(message.operation.map.entries, inputContext, decodeDataFn);
    }

    if (message.operation?.mapOp?.data && 'value' in message.operation.mapOp.data) {
      await StateMessage._decodeStateData(message.operation.mapOp.data, inputContext, decodeDataFn);
    }
  }

  static fromValues(values: StateMessage | Record<string, unknown>, platform: typeof Platform): StateMessage {
    return Object.assign(new StateMessage(platform), values);
  }

  static fromValuesArray(values: unknown[], platform: typeof Platform): StateMessage[] {
    const count = values.length;
    const result = new Array(count);

    for (let i = 0; i < count; i++) {
      result[i] = StateMessage.fromValues(values[i] as Record<string, unknown>, platform);
    }

    return result;
  }

  private static async _decodeMapEntries(
    mapEntries: Record<string, StateMapEntry>,
    inputContext: ChannelOptions,
    decodeDataFn: typeof decodeData,
  ): Promise<void> {
    for (const entry of Object.values(mapEntries)) {
      await StateMessage._decodeStateData(entry.data, inputContext, decodeDataFn);
    }
  }

  private static async _decodeStateData(
    stateData: StateData,
    inputContext: ChannelOptions,
    decodeDataFn: typeof decodeData,
  ): Promise<void> {
    const { data, encoding, error } = await decodeDataFn(stateData.value, stateData.encoding, inputContext);
    stateData.value = data;
    stateData.encoding = encoding ?? undefined;

    if (error) {
      throw error;
    }
  }

  private static _encodeStateOperation(
    platform: typeof Platform,
    stateOperation: StateOperation,
    withBase64Encoding: boolean,
  ): StateOperation {
    // deep copy "stateOperation" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explictly.
    const stateOperationCopy = JSON.parse(JSON.stringify(stateOperation)) as StateOperation;

    if (stateOperationCopy.mapOp?.data && 'value' in stateOperationCopy.mapOp.data) {
      // use original "stateOperation" object when encoding values, so we have access to the original buffer values.
      stateOperationCopy.mapOp.data = StateMessage._encodeStateData(
        platform,
        stateOperation.mapOp?.data!,
        withBase64Encoding,
      );
    }

    if (stateOperationCopy.map?.entries) {
      Object.entries(stateOperationCopy.map.entries).forEach(([key, entry]) => {
        // use original "stateOperation" object when encoding values, so we have access to original buffer values.
        entry.data = StateMessage._encodeStateData(
          platform,
          stateOperation?.map?.entries?.[key].data!,
          withBase64Encoding,
        );
      });
    }

    return stateOperationCopy;
  }

  private static _encodeStateObject(
    platform: typeof Platform,
    stateObject: StateObject,
    withBase64Encoding: boolean,
  ): StateObject {
    // deep copy "stateObject" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explictly.
    const stateObjectCopy = JSON.parse(JSON.stringify(stateObject)) as StateObject;

    if (stateObjectCopy.map?.entries) {
      Object.entries(stateObjectCopy.map.entries).forEach(([key, entry]) => {
        // use original "stateObject" object when encoding values, so we have access to original buffer values.
        entry.data = StateMessage._encodeStateData(
          platform,
          stateObject?.map?.entries?.[key].data!,
          withBase64Encoding,
        );
      });
    }

    if (stateObjectCopy.createOp) {
      // use original "stateObject" object when encoding values, so we have access to original buffer values.
      stateObjectCopy.createOp = StateMessage._encodeStateOperation(
        platform,
        stateObject.createOp!,
        withBase64Encoding,
      );
    }

    return stateObjectCopy;
  }

  private static _encodeStateData(platform: typeof Platform, data: StateData, withBase64Encoding: boolean): StateData {
    const { value, encoding } = StateMessage._encodeStateValue(
      platform,
      data?.value,
      data?.encoding,
      withBase64Encoding,
    );
    return {
      ...data,
      value,
      encoding,
    };
  }

  private static _encodeStateValue(
    platform: typeof Platform,
    value: StateValue | undefined,
    encoding: string | undefined,
    withBase64Encoding: boolean,
  ): {
    value: StateValue | undefined;
    encoding: string | undefined;
  } {
    if (!value || !platform.BufferUtils.isBuffer(value)) {
      return { value, encoding };
    }

    if (withBase64Encoding) {
      return {
        value: platform.BufferUtils.base64Encode(value),
        encoding: encoding ? encoding + '/base64' : 'base64',
      };
    }

    // toBuffer returns a datatype understandable by
    // that platform's msgpack implementation (Buffer in node, Uint8Array in browsers)
    return {
      value: platform.BufferUtils.toBuffer(value),
      encoding,
    };
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

    const encodedOperation = this.operation
      ? StateMessage._encodeStateOperation(this._platform, this.operation, withBase64Encoding)
      : undefined;
    const encodedObject = this.object
      ? StateMessage._encodeStateObject(this._platform, this.object, withBase64Encoding)
      : undefined;

    return {
      id: this.id,
      clientId: this.clientId,
      operation: encodedOperation,
      object: encodedObject,
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
}
