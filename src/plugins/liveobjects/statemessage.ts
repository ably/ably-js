import type BaseClient from 'common/lib/client/baseclient';
import type { MessageEncoding } from 'common/lib/types/message';
import type * as Utils from 'common/lib/util/utils';
import type { Bufferlike } from 'common/platform';
import type { ChannelOptions } from 'common/types/channel';

export type EncodeFunction = (data: any, encoding?: string | null) => { data: any; encoding?: string | null };

export enum StateOperationAction {
  MAP_CREATE = 0,
  MAP_SET = 1,
  MAP_REMOVE = 2,
  COUNTER_CREATE = 3,
  COUNTER_INC = 4,
  OBJECT_DELETE = 5,
}

export enum MapSemantics {
  LWW = 0,
}

/** A StateValue represents a concrete leaf value in a state object graph. */
export type StateValue = string | number | boolean | Bufferlike;

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
   * It is optional in a MAP_CREATE operation and might be missing, in which case the client should use a nullish value for it
   * and treat it as the "earliest possible" timeserial for comparison purposes.
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
  /**
   * The initial value bytes for the object. These bytes should be used along with the nonce
   * and timestamp to create the object ID. Frontdoor will use this to verify the object ID.
   * After verification the bytes will be decoded into the Map or Counter objects and
   * the initialValue, nonce, and initialValueEncoding will be removed.
   */
  initialValue?: Bufferlike;
  /** The initial value encoding defines how the initialValue should be interpreted. */
  initialValueEncoding?: Utils.Format;
}

/** A StateObject describes the instantaneous state of an object. */
export interface StateObject {
  /** The identifier of the state object. */
  objectId: string;
  /** A vector of origin timeserials keyed by site code of the last operation that was applied to this state object. */
  siteTimeserials: Record<string, string>;
  /** True if the object has been tombstoned. */
  tombstone: boolean;
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
  /** Site code corresponding to this message's timeserial */
  siteCode?: string;

  constructor(
    private _utils: typeof Utils,
    private _messageEncoding: typeof MessageEncoding,
  ) {}

  /**
   * Protocol agnostic encoding of the state message's data entries.
   * Mutates the provided StateMessage.
   *
   * Uses encoding functions from regular `Message` processing.
   */
  static async encode(message: StateMessage, messageEncoding: typeof MessageEncoding): Promise<StateMessage> {
    const encodeFn: EncodeFunction = (data, encoding) => {
      const { data: encodedData, encoding: newEncoding } = messageEncoding.encodeData(data, encoding);

      return {
        data: encodedData,
        encoding: newEncoding,
      };
    };

    message.operation = message.operation ? StateMessage._encodeStateOperation(message.operation, encodeFn) : undefined;
    message.object = message.object ? StateMessage._encodeStateObject(message.object, encodeFn) : undefined;

    return message;
  }

  /**
   * Mutates the provided StateMessage and decodes all data entries in the message
   */
  static async decode(
    message: StateMessage,
    inputContext: ChannelOptions,
    messageEncoding: typeof MessageEncoding,
  ): Promise<void> {
    // TODO: decide how to handle individual errors from decoding values. currently we throw first ever error we get

    if (message.object?.map?.entries) {
      await StateMessage._decodeMapEntries(message.object.map.entries, inputContext, messageEncoding);
    }

    if (message.object?.createOp?.map?.entries) {
      await StateMessage._decodeMapEntries(message.object.createOp.map.entries, inputContext, messageEncoding);
    }

    if (message.object?.createOp?.mapOp?.data && 'value' in message.object.createOp.mapOp.data) {
      await StateMessage._decodeStateData(message.object.createOp.mapOp.data, inputContext, messageEncoding);
    }

    if (message.operation?.map?.entries) {
      await StateMessage._decodeMapEntries(message.operation.map.entries, inputContext, messageEncoding);
    }

    if (message.operation?.mapOp?.data && 'value' in message.operation.mapOp.data) {
      await StateMessage._decodeStateData(message.operation.mapOp.data, inputContext, messageEncoding);
    }
  }

  static fromValues(
    values: StateMessage | Record<string, unknown>,
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): StateMessage {
    return Object.assign(new StateMessage(utils, messageEncoding), values);
  }

  static fromValuesArray(
    values: (StateMessage | Record<string, unknown>)[],
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): StateMessage[] {
    const count = values.length;
    const result = new Array(count);

    for (let i = 0; i < count; i++) {
      result[i] = StateMessage.fromValues(values[i], utils, messageEncoding);
    }

    return result;
  }

  static encodeInitialValue(
    initialValue: Partial<StateOperation>,
    client: BaseClient,
  ): {
    encodedInitialValue: Bufferlike;
    format: Utils.Format;
  } {
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;
    const encodedInitialValue = client.Utils.encodeBody(initialValue, client._MsgPack, format);

    // if we've got string result (for example, json format was used), we need to additionally convert it to bytes array with utf8 encoding
    if (typeof encodedInitialValue === 'string') {
      return {
        encodedInitialValue: client.Platform.BufferUtils.utf8Encode(encodedInitialValue),
        format,
      };
    }

    return {
      encodedInitialValue,
      format,
    };
  }

  private static async _decodeMapEntries(
    mapEntries: Record<string, StateMapEntry>,
    inputContext: ChannelOptions,
    messageEncoding: typeof MessageEncoding,
  ): Promise<void> {
    for (const entry of Object.values(mapEntries)) {
      await StateMessage._decodeStateData(entry.data, inputContext, messageEncoding);
    }
  }

  private static async _decodeStateData(
    stateData: StateData,
    inputContext: ChannelOptions,
    messageEncoding: typeof MessageEncoding,
  ): Promise<void> {
    const { data, encoding, error } = await messageEncoding.decodeData(
      stateData.value,
      stateData.encoding,
      inputContext,
    );
    stateData.value = data;
    stateData.encoding = encoding ?? undefined;

    if (error) {
      throw error;
    }
  }

  private static _encodeStateOperation(stateOperation: StateOperation, encodeFn: EncodeFunction): StateOperation {
    // deep copy "stateOperation" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explicitly.
    const stateOperationCopy = JSON.parse(JSON.stringify(stateOperation)) as StateOperation;

    if (stateOperationCopy.mapOp?.data && 'value' in stateOperationCopy.mapOp.data) {
      // use original "stateOperation" object when encoding values, so we have access to the original buffer values.
      stateOperationCopy.mapOp.data = StateMessage._encodeStateData(stateOperation.mapOp?.data!, encodeFn);
    }

    if (stateOperationCopy.map?.entries) {
      Object.entries(stateOperationCopy.map.entries).forEach(([key, entry]) => {
        // use original "stateOperation" object when encoding values, so we have access to original buffer values.
        entry.data = StateMessage._encodeStateData(stateOperation?.map?.entries?.[key].data!, encodeFn);
      });
    }

    if (stateOperation.initialValue) {
      // use original "stateOperation" object so we have access to the original buffer value
      const { data: encodedInitialValue } = encodeFn(stateOperation.initialValue);
      stateOperationCopy.initialValue = encodedInitialValue;
    }

    return stateOperationCopy;
  }

  private static _encodeStateObject(stateObject: StateObject, encodeFn: EncodeFunction): StateObject {
    // deep copy "stateObject" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explicitly.
    const stateObjectCopy = JSON.parse(JSON.stringify(stateObject)) as StateObject;

    if (stateObjectCopy.map?.entries) {
      Object.entries(stateObjectCopy.map.entries).forEach(([key, entry]) => {
        // use original "stateObject" object when encoding values, so we have access to original buffer values.
        entry.data = StateMessage._encodeStateData(stateObject?.map?.entries?.[key].data!, encodeFn);
      });
    }

    if (stateObjectCopy.createOp) {
      // use original "stateObject" object when encoding values, so we have access to original buffer values.
      stateObjectCopy.createOp = StateMessage._encodeStateOperation(stateObject.createOp!, encodeFn);
    }

    return stateObjectCopy;
  }

  private static _encodeStateData(data: StateData, encodeFn: EncodeFunction): StateData {
    const { data: encodedValue, encoding: newEncoding } = encodeFn(data?.value, data?.encoding);

    return {
      ...data,
      value: encodedValue,
      encoding: newEncoding ?? undefined,
    };
  }

  /**
   * Overload toJSON() to intercept JSON.stringify().
   *
   * This will prepare the message to be transmitted over the wire to Ably.
   * It will encode the data payload according to the wire protocol used on the client.
   * It will transform any client-side enum string representations into their corresponding numbers, if needed (like "action" fields).
   */
  toJSON(): {
    id?: string;
    clientId?: string;
    operation?: StateOperation;
    object?: StateObject;
    extras?: any;
  } {
    // we can infer the format used by client by inspecting with what arguments this method was called.
    // if JSON protocol is being used, the JSON.stringify() will be called and this toJSON() method will have a non-empty arguments list.
    // MSGPack protocol implementation also calls toJSON(), but with an empty arguments list.
    const format = arguments.length > 0 ? this._utils.Format.json : this._utils.Format.msgpack;
    const encodeFn: EncodeFunction = (data, encoding) => {
      const { data: encodedData, encoding: newEncoding } = this._messageEncoding.encodeDataForWireProtocol(
        data,
        encoding,
        format,
      );
      return {
        data: encodedData,
        encoding: newEncoding,
      };
    };

    const encodedOperation = this.operation ? StateMessage._encodeStateOperation(this.operation, encodeFn) : undefined;
    const encodedObject = this.object ? StateMessage._encodeStateObject(this.object, encodeFn) : undefined;

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
    if (this.channel) result += '; channel=' + this.channel;
    // TODO: prettify output for operation and object and encode buffers.
    // see examples for data in Message and PresenceMessage
    if (this.operation) result += '; operation=' + JSON.stringify(this.operation);
    if (this.object) result += '; object=' + JSON.stringify(this.object);
    if (this.extras) result += '; extras=' + JSON.stringify(this.extras);
    if (this.serial) result += '; serial=' + this.serial;
    if (this.siteCode) result += '; siteCode=' + this.siteCode;

    result += ']';

    return result;
  }
}
