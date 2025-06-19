import type BaseClient from 'common/lib/client/baseclient';
import type { MessageEncoding } from 'common/lib/types/basemessage';
import type Logger from 'common/lib/util/logger';
import type * as Utils from 'common/lib/util/utils';
import type { Bufferlike } from 'common/platform';

export type EncodeInitialValueFunction = (
  data: any,
  encoding?: string | null,
) => { data: any; encoding?: string | null };

export type EncodeObjectDataFunction = (data: ObjectData) => ObjectData;

export enum ObjectOperationAction {
  MAP_CREATE = 0,
  MAP_SET = 1,
  MAP_REMOVE = 2,
  COUNTER_CREATE = 3,
  COUNTER_INC = 4,
  OBJECT_DELETE = 5,
}

export enum ObjectsMapSemantics {
  LWW = 0,
}

/** An ObjectData represents a value in an object on a channel. */
export interface ObjectData {
  /** A reference to another object, used to support composable object structures. */
  objectId?: string;

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

/** An ObjectsMapOp describes an operation to be applied to a Map object. */
export interface ObjectsMapOp {
  /** The key of the map entry to which the operation should be applied. */
  key: string;
  /** The data that the map entry should contain if the operation is a MAP_SET operation. */
  data?: ObjectData;
}

/** An ObjectsCounterOp describes an operation to be applied to a Counter object. */
export interface ObjectsCounterOp {
  /** The data value that should be added to the counter */
  amount: number;
}

/** An ObjectsMapEntry represents the value at a given key in a Map object. */
export interface ObjectsMapEntry {
  /** Indicates whether the map entry has been removed. */
  tombstone?: boolean;
  /**
   * The {@link ObjectMessage.serial} value of the last operation that was applied to the map entry.
   *
   * It is optional in a MAP_CREATE operation and might be missing, in which case the client should use a nullish value for it
   * and treat it as the "earliest possible" serial for comparison purposes.
   */
  timeserial?: string;
  /** The data that represents the value of the map entry. */
  data?: ObjectData;
}

/** An ObjectsMap object represents a map of key-value pairs. */
export interface ObjectsMap {
  /** The conflict-resolution semantics used by the map object. */
  semantics?: ObjectsMapSemantics;
  // The map entries, indexed by key.
  entries?: Record<string, ObjectsMapEntry>;
}

/** An ObjectsCounter object represents an incrementable and decrementable value */
export interface ObjectsCounter {
  /** The value of the counter */
  count?: number;
}

/** An ObjectOperation describes an operation to be applied to an object on a channel. */
export interface ObjectOperation {
  /** Defines the operation to be applied to the object. */
  action: ObjectOperationAction;
  /** The object ID of the object on a channel to which the operation should be applied. */
  objectId: string;
  /** The payload for the operation if it is an operation on a Map object type. */
  mapOp?: ObjectsMapOp;
  /** The payload for the operation if it is an operation on a Counter object type. */
  counterOp?: ObjectsCounterOp;
  /**
   * The payload for the operation if the operation is MAP_CREATE.
   * Defines the initial value for the Map object.
   */
  map?: ObjectsMap;
  /**
   * The payload for the operation if the operation is COUNTER_CREATE.
   * Defines the initial value for the Counter object.
   */
  counter?: ObjectsCounter;
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

/** An ObjectState describes the instantaneous state of an object on a channel. */
export interface ObjectState {
  /** The identifier of the object. */
  objectId: string;
  /** A map of serials keyed by a {@link ObjectMessage.siteCode}, representing the last operations applied to this object */
  siteTimeserials: Record<string, string>;
  /** True if the object has been tombstoned. */
  tombstone: boolean;
  /**
   * The operation that created the object.
   *
   * Can be missing if create operation for the object is not known at this point.
   */
  createOp?: ObjectOperation;
  /**
   * The data that represents the result of applying all operations to a Map object
   * excluding the initial value from the create operation if it is a Map object type.
   */
  map?: ObjectsMap;
  /**
   * The data that represents the result of applying all operations to a Counter object
   * excluding the initial value from the create operation if it is a Counter object type.
   */
  counter?: ObjectsCounter;
}

// TODO: tidy up encoding/decoding logic for ObjectMessage:
// Should have separate WireObjectMessage with the correct types received from the server, do the necessary encoding/decoding there.
// For reference, see WireMessage and WirePresenceMessage
/**
 * @internal
 */
export class ObjectMessage {
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  extras?: any;
  /**
   * Describes an operation to be applied to an object.
   *
   * Mutually exclusive with the `object` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT`.
   */
  operation?: ObjectOperation;
  /**
   * Describes the instantaneous state of an object.
   *
   * Mutually exclusive with the `operation` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT_SYNC`.
   */
  object?: ObjectState;
  /** An opaque string that uniquely identifies this object message. */
  serial?: string;
  /** An opaque string used as a key to update the map of serial values on an object. */
  siteCode?: string;

  constructor(
    private _utils: typeof Utils,
    private _messageEncoding: typeof MessageEncoding,
  ) {}

  /**
   * Protocol agnostic encoding of the object message's data entries.
   * Mutates the provided ObjectMessage.
   *
   * Uses encoding functions from regular `Message` processing.
   */
  static encode(message: ObjectMessage, client: BaseClient): ObjectMessage {
    const encodeInitialValueFn: EncodeInitialValueFunction = (data, encoding) => {
      const isNativeDataType =
        typeof data == 'string' ||
        typeof data == 'number' ||
        typeof data == 'boolean' ||
        client.Platform.BufferUtils.isBuffer(data) ||
        data === null ||
        data === undefined;

      const { data: encodedData, encoding: newEncoding } = client.MessageEncoding.encodeData(
        data,
        encoding,
        isNativeDataType,
      );

      return {
        data: encodedData,
        encoding: newEncoding,
      };
    };

    const encodeObjectDataFn: EncodeObjectDataFunction = (data) => {
      // TODO: support encoding JSON objects as a JSON string on "string" property with an encoding of "json"
      // https://ably.atlassian.net/browse/PUB-1667
      // for now just return values as they are

      return data;
    };

    message.operation = message.operation
      ? ObjectMessage._encodeObjectOperation(message.operation, encodeObjectDataFn, encodeInitialValueFn)
      : undefined;
    message.object = message.object
      ? ObjectMessage._encodeObjectState(message.object, encodeObjectDataFn, encodeInitialValueFn)
      : undefined;

    return message;
  }

  /**
   * Mutates the provided ObjectMessage and decodes all data entries in the message.
   *
   * Format is used to decode the bytes value as it's implicitly encoded depending on the protocol used:
   * - json: bytes are base64 encoded string
   * - msgpack: bytes have a binary representation and don't need to be decoded
   */
  static async decode(
    message: ObjectMessage,
    client: BaseClient,
    logger: Logger,
    LoggerClass: typeof Logger,
    utils: typeof Utils,
    format: Utils.Format | undefined,
  ): Promise<void> {
    // TODO: decide how to handle individual errors from decoding values. currently we throw first ever error we get

    try {
      if (message.object?.map?.entries) {
        await ObjectMessage._decodeMapEntries(message.object.map.entries, client, format);
      }

      if (message.object?.createOp?.map?.entries) {
        await ObjectMessage._decodeMapEntries(message.object.createOp.map.entries, client, format);
      }

      if (message.object?.createOp?.mapOp?.data) {
        await ObjectMessage._decodeObjectData(message.object.createOp.mapOp.data, client, format);
      }

      if (message.operation?.map?.entries) {
        await ObjectMessage._decodeMapEntries(message.operation.map.entries, client, format);
      }

      if (message.operation?.mapOp?.data) {
        await ObjectMessage._decodeObjectData(message.operation.mapOp.data, client, format);
      }
    } catch (error) {
      LoggerClass.logAction(logger, LoggerClass.LOG_ERROR, 'ObjectMessage.decode()', utils.inspectError(error));
    }
  }

  static fromValues(
    values: ObjectMessage | Record<string, unknown>,
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): ObjectMessage {
    return Object.assign(new ObjectMessage(utils, messageEncoding), values);
  }

  static fromValuesArray(
    values: (ObjectMessage | Record<string, unknown>)[],
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): ObjectMessage[] {
    const count = values.length;
    const result = new Array(count);

    for (let i = 0; i < count; i++) {
      result[i] = ObjectMessage.fromValues(values[i], utils, messageEncoding);
    }

    return result;
  }

  static encodeInitialValue(
    initialValue: Partial<ObjectOperation>,
    client: BaseClient,
  ): {
    encodedInitialValue: Bufferlike;
    format: Utils.Format;
  } {
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;

    // initial value object may contain user provided data that requires an additional encoding (for example buffers as map keys).
    // so we need to encode that data first as if we were sending it over the wire. we can use an ObjectMessage methods for this
    const msg = ObjectMessage.fromValues({ operation: initialValue }, client.Utils, client.MessageEncoding);
    ObjectMessage.encode(msg, client);
    const { operation: initialValueWithDataEncoding } = ObjectMessage._encodeForWireProtocol(
      msg,
      client.MessageEncoding,
      format,
    );

    // initial value field should be represented as an array of bytes over the wire. so we encode the whole object based on the client encoding format
    const encodedInitialValue = client.Utils.encodeBody(initialValueWithDataEncoding, client._MsgPack, format);

    // if we've got string result (for example, json encoding was used), we need to additionally convert it to bytes array with utf8 encoding
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
    mapEntries: Record<string, ObjectsMapEntry>,
    client: BaseClient,
    format: Utils.Format | undefined,
  ): Promise<void> {
    for (const entry of Object.values(mapEntries)) {
      if (entry.data) {
        await ObjectMessage._decodeObjectData(entry.data, client, format);
      }
    }
  }

  private static async _decodeObjectData(
    objectData: ObjectData,
    client: BaseClient,
    format: Utils.Format | undefined,
  ): Promise<void> {
    // TODO: support decoding JSON objects stored as a JSON string with an encoding of "json"
    // https://ably.atlassian.net/browse/PUB-1667
    // currently we check only the "bytes" field:
    // - if connection is msgpack - "bytes" was received as msgpack encoded bytes, no need to decode, it's already a buffer
    // - if connection is json - "bytes" was received as a base64 string, need to decode it to a buffer

    if (format !== 'msgpack' && objectData.bytes != null) {
      // connection is using JSON protocol, decode bytes value
      objectData.bytes = client.Platform.BufferUtils.base64Decode(String(objectData.bytes));
    }
  }

  private static _encodeObjectOperation(
    objectOperation: ObjectOperation,
    encodeObjectDataFn: EncodeObjectDataFunction,
    encodeInitialValueFn: EncodeInitialValueFunction,
  ): ObjectOperation {
    // deep copy "objectOperation" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explicitly.
    const objectOperationCopy = JSON.parse(JSON.stringify(objectOperation)) as ObjectOperation;

    if (objectOperationCopy.mapOp?.data) {
      // use original "objectOperation" object when encoding values, so we have access to the original buffer values.
      objectOperationCopy.mapOp.data = ObjectMessage._encodeObjectData(
        objectOperation.mapOp?.data!,
        encodeObjectDataFn,
      );
    }

    if (objectOperationCopy.map?.entries) {
      Object.entries(objectOperationCopy.map.entries).forEach(([key, entry]) => {
        if (entry.data) {
          // use original "objectOperation" object when encoding values, so we have access to original buffer values.
          entry.data = ObjectMessage._encodeObjectData(objectOperation?.map?.entries?.[key].data!, encodeObjectDataFn);
        }
      });
    }

    if (objectOperation.initialValue) {
      // use original "objectOperation" object so we have access to the original buffer value
      const { data: encodedInitialValue } = encodeInitialValueFn(objectOperation.initialValue);
      objectOperationCopy.initialValue = encodedInitialValue;
    }

    return objectOperationCopy;
  }

  private static _encodeObjectState(
    objectState: ObjectState,
    encodeObjectDataFn: EncodeObjectDataFunction,
    encodeInitialValueFn: EncodeInitialValueFunction,
  ): ObjectState {
    // deep copy "objectState" object so we can modify the copy here.
    // buffer values won't be correctly copied, so we will need to set them again explicitly.
    const objectStateCopy = JSON.parse(JSON.stringify(objectState)) as ObjectState;

    if (objectStateCopy.map?.entries) {
      Object.entries(objectStateCopy.map.entries).forEach(([key, entry]) => {
        if (entry.data) {
          // use original "objectState" object when encoding values, so we have access to original buffer values.
          entry.data = ObjectMessage._encodeObjectData(objectState?.map?.entries?.[key].data!, encodeObjectDataFn);
        }
      });
    }

    if (objectStateCopy.createOp) {
      // use original "objectState" object when encoding values, so we have access to original buffer values.
      objectStateCopy.createOp = ObjectMessage._encodeObjectOperation(
        objectState.createOp!,
        encodeObjectDataFn,
        encodeInitialValueFn,
      );
    }

    return objectStateCopy;
  }

  private static _encodeObjectData(data: ObjectData, encodeFn: EncodeObjectDataFunction): ObjectData {
    const encodedData = encodeFn(data);
    return encodedData;
  }

  /**
   * Encodes operation and object fields of the ObjectMessage. Does not mutate the provided ObjectMessage.
   *
   * Uses encoding functions from regular `Message` processing.
   */
  private static _encodeForWireProtocol(
    message: ObjectMessage,
    messageEncoding: typeof MessageEncoding,
    format: Utils.Format,
  ): {
    operation?: ObjectOperation;
    objectState?: ObjectState;
  } {
    const encodeInitialValueFn: EncodeInitialValueFunction = (data, encoding) => {
      const { data: encodedData, encoding: newEncoding } = messageEncoding.encodeDataForWire(data, encoding, format);
      return {
        data: encodedData,
        encoding: newEncoding,
      };
    };

    const encodeObjectDataFn: EncodeObjectDataFunction = (data) => {
      // TODO: support encoding JSON objects as a JSON string on "string" property with an encoding of "json"
      // https://ably.atlassian.net/browse/PUB-1667
      // currently we check only the "bytes" field:
      // - if connection is msgpack - "bytes" will will be sent as msgpack bytes, no need to encode here
      // - if connection is json - "bytes" will be encoded as a base64 string

      let encodedBytes: any = data.bytes;
      if (data.bytes != null) {
        const result = messageEncoding.encodeDataForWire(data.bytes, data.encoding, format);
        encodedBytes = result.data;
        // no need to change the encoding
      }

      return {
        ...data,
        bytes: encodedBytes,
      };
    };

    const encodedOperation = message.operation
      ? ObjectMessage._encodeObjectOperation(message.operation, encodeObjectDataFn, encodeInitialValueFn)
      : undefined;
    const encodedObjectState = message.object
      ? ObjectMessage._encodeObjectState(message.object, encodeObjectDataFn, encodeInitialValueFn)
      : undefined;

    return {
      operation: encodedOperation,
      objectState: encodedObjectState,
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
    operation?: ObjectOperation;
    object?: ObjectState;
    extras?: any;
  } {
    // we can infer the format used by client by inspecting with what arguments this method was called.
    // if JSON protocol is being used, the JSON.stringify() will be called and this toJSON() method will have a non-empty arguments list.
    // MSGPack protocol implementation also calls toJSON(), but with an empty arguments list.
    const format = arguments.length > 0 ? this._utils.Format.json : this._utils.Format.msgpack;
    const { operation, objectState } = ObjectMessage._encodeForWireProtocol(this, this._messageEncoding, format);

    return {
      id: this.id,
      clientId: this.clientId,
      operation,
      object: objectState,
      extras: this.extras,
    };
  }

  toString(): string {
    let result = '[ObjectMessage';

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
    if (this.siteCode) result += '; siteCode=' + this.siteCode;

    result += ']';

    return result;
  }

  getMessageSize(): number {
    let size = 0;

    size += this.clientId?.length ?? 0;
    if (this.operation) {
      size += this._getObjectOperationSize(this.operation);
    }
    if (this.object) {
      size += this._getObjectStateSize(this.object);
    }
    if (this.extras) {
      size += JSON.stringify(this.extras).length;
    }

    return size;
  }

  private _getObjectOperationSize(operation: ObjectOperation): number {
    let size = 0;

    if (operation.mapOp) {
      size += this._getMapOpSize(operation.mapOp);
    }
    if (operation.counterOp) {
      size += this._getCounterOpSize(operation.counterOp);
    }
    if (operation.map) {
      size += this._getObjectMapSize(operation.map);
    }
    if (operation.counter) {
      size += this._getObjectCounterSize(operation.counter);
    }

    return size;
  }

  private _getObjectStateSize(obj: ObjectState): number {
    let size = 0;

    if (obj.map) {
      size += this._getObjectMapSize(obj.map);
    }
    if (obj.counter) {
      size += this._getObjectCounterSize(obj.counter);
    }
    if (obj.createOp) {
      size += this._getObjectOperationSize(obj.createOp);
    }

    return size;
  }

  private _getObjectMapSize(map: ObjectsMap): number {
    let size = 0;

    Object.entries(map.entries ?? {}).forEach(([key, entry]) => {
      size += key?.length ?? 0;
      if (entry) {
        size += this._getMapEntrySize(entry);
      }
    });

    return size;
  }

  private _getObjectCounterSize(counter: ObjectsCounter): number {
    if (counter.count == null) {
      return 0;
    }

    return 8;
  }

  private _getMapEntrySize(entry: ObjectsMapEntry): number {
    let size = 0;

    if (entry.data) {
      size += this._getObjectDataSize(entry.data);
    }

    return size;
  }

  private _getMapOpSize(mapOp: ObjectsMapOp): number {
    let size = 0;

    size += mapOp.key?.length ?? 0;

    if (mapOp.data) {
      size += this._getObjectDataSize(mapOp.data);
    }

    return size;
  }

  private _getCounterOpSize(operation: ObjectsCounterOp): number {
    if (operation.amount == null) {
      return 0;
    }

    return 8;
  }

  private _getObjectDataSize(data: ObjectData): number {
    let size = 0;

    if (data.boolean != null) {
      size += this._utils.dataSizeBytes(data.boolean);
    }
    if (data.bytes != null) {
      size += this._utils.dataSizeBytes(data.bytes);
    }
    if (data.number != null) {
      size += this._utils.dataSizeBytes(data.number);
    }
    if (data.string != null) {
      size += this._utils.dataSizeBytes(data.string);
    }

    return size;
  }
}
