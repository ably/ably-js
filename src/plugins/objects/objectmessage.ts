import type BaseClient from 'common/lib/client/baseclient';
import type { MessageEncoding } from 'common/lib/types/basemessage';
import type * as Utils from 'common/lib/util/utils';
import type { Bufferlike } from 'common/platform';

export type EncodeInitialValueFunction = (
  data: any,
  encoding?: string | null,
) => { data: any; encoding?: string | null };

export type EncodeObjectDataFunction = (data: ObjectData | WireObjectData) => WireObjectData;

/** @spec OOP2 */
export enum ObjectOperationAction {
  MAP_CREATE = 0,
  MAP_SET = 1,
  MAP_REMOVE = 2,
  COUNTER_CREATE = 3,
  COUNTER_INC = 4,
  OBJECT_DELETE = 5,
}

/** @spec OMP2 */
export enum ObjectsMapSemantics {
  LWW = 0,
}

/**
 * An ObjectData represents a value in an object on a channel decoded from {@link WireObjectData}.
 * @spec OD1
 */
export interface ObjectData {
  /** A reference to another object, used to support composable object structures. */
  objectId?: string; // OD2a

  /** May be set by the client to indicate that value in `string` field have an encoding. */
  encoding?: string; // OD2b
  /** A primitive boolean leaf value in the object graph. Only one value field can be set. */
  boolean?: boolean; // OD2c
  /** A primitive binary leaf value in the object graph. Only one value field can be set. */
  bytes?: Bufferlike; // OD2d
  /** A primitive number leaf value in the object graph. Only one value field can be set. */
  number?: number; // OD2e
  /** A primitive string leaf value in the object graph. Only one value field can be set. */
  string?: string; // OD2f
}

/**
 * A WireObjectData represents a value in an object on a channel received from the server.
 * @spec OD1
 */
export interface WireObjectData {
  /** A reference to another object, used to support composable object structures. */
  objectId?: string; // OD2a

  /** May be set by the client to indicate that value in `string` field have an encoding. */
  encoding?: string; // OD2b
  /** A primitive boolean leaf value in the object graph. Only one value field can be set. */
  boolean?: boolean; // OD2c
  /** A primitive binary leaf value in the object graph. Only one value field can be set. Represented as a Base64-encoded string in JSON protocol */
  bytes?: Bufferlike | string; // OD2d
  /** A primitive number leaf value in the object graph. Only one value field can be set. */
  number?: number; // OD2e
  /** A primitive string leaf value in the object graph. Only one value field can be set. */
  string?: string; // OD2f
}

/**
 * An ObjectsMapOp describes an operation to be applied to a Map object.
 * @spec OMO1
 */
export interface ObjectsMapOp<TData> {
  /** The key of the map entry to which the operation should be applied. */
  key: string; // OMO2a
  /** The data that the map entry should contain if the operation is a MAP_SET operation. */
  data?: TData; // OMO2b
}

/**
 * An ObjectsCounterOp describes an operation to be applied to a Counter object.
 * @spec OCO1
 */
export interface ObjectsCounterOp {
  /** The data value that should be added to the counter */
  amount: number; // OCO2a
}

/**
 * An ObjectsMapEntry represents the value at a given key in a Map object.
 * @spec OME1
 */
export interface ObjectsMapEntry<TData> {
  /** Indicates whether the map entry has been removed. */
  tombstone?: boolean; // OME2a
  /**
   * The {@link ObjectMessage.serial} value of the last operation that was applied to the map entry.
   *
   * It is optional in a MAP_CREATE operation and might be missing, in which case the client should use a nullish value for it
   * and treat it as the "earliest possible" serial for comparison purposes.
   */
  timeserial?: string; // OME2b
  /** A timestamp from the {@link timeserial} field. Only present if {@link tombstone} is `true` */
  serialTimestamp?: number; // OME2d
  /** The data that represents the value of the map entry. */
  data?: TData; // OME2c
}

/**
 * An ObjectsMap object represents a map of key-value pairs.
 * @spec OMP1
 */
export interface ObjectsMap<TData> {
  /** The conflict-resolution semantics used by the map object. */
  semantics?: ObjectsMapSemantics; // OMP3a
  // The map entries, indexed by key.
  entries?: Record<string, ObjectsMapEntry<TData>>; // OMP3b
}

/**
 * An ObjectsCounter object represents an incrementable and decrementable value
 * @spec OCN1
 */
export interface ObjectsCounter {
  /** The value of the counter */
  count?: number; // OCN2a
}

/**
 * An ObjectOperation describes an operation to be applied to an object on a channel.
 * @spec OOP1
 */
export interface ObjectOperation<TData> {
  /** Defines the operation to be applied to the object. */
  action: ObjectOperationAction; // OOP3a
  /** The object ID of the object on a channel to which the operation should be applied. */
  objectId: string; // OOP3b
  /** The payload for the operation if it is an operation on a Map object type. */
  mapOp?: ObjectsMapOp<TData>; // OOP3c
  /** The payload for the operation if it is an operation on a Counter object type. */
  counterOp?: ObjectsCounterOp; // OOP3d
  /**
   * The payload for the operation if the operation is MAP_CREATE.
   * Defines the initial value for the Map object.
   */
  map?: ObjectsMap<TData>; // OOP3e
  /**
   * The payload for the operation if the operation is COUNTER_CREATE.
   * Defines the initial value for the Counter object.
   */
  counter?: ObjectsCounter; // OOP3f
  /**
   * The nonce, must be present on create operations. This is the random part
   * that has been hashed with the type and initial value to create the object ID.
   */
  nonce?: string; // OOP3g
  /**
   * The initial value bytes for the object. These bytes should be used along with the nonce
   * and timestamp to create the object ID. Frontdoor will use this to verify the object ID.
   * After verification the bytes will be decoded into the Map or Counter objects and
   * the initialValue, nonce, and initialValueEncoding will be removed.
   */
  initialValue?: Bufferlike; // OOP3h
  /** The initial value encoding defines how the initialValue should be interpreted. */
  initialValueEncoding?: Utils.Format; // OOP3i
}

/**
 * An ObjectState describes the instantaneous state of an object on a channel.
 * @spec OST1
 */
export interface ObjectState<TData> {
  /** The identifier of the object. */
  objectId: string; // OST2a
  /** A map of serials keyed by a {@link ObjectMessage.siteCode}, representing the last operations applied to this object */
  siteTimeserials: Record<string, string>; // OST2b
  /** True if the object has been tombstoned. */
  tombstone: boolean; // OST2c
  /**
   * The operation that created the object.
   *
   * Can be missing if create operation for the object is not known at this point.
   */
  createOp?: ObjectOperation<TData>; // OST2d
  /**
   * The data that represents the result of applying all operations to a Map object
   * excluding the initial value from the create operation if it is a Map object type.
   */
  map?: ObjectsMap<TData>; // OST2e
  /**
   * The data that represents the result of applying all operations to a Counter object
   * excluding the initial value from the create operation if it is a Counter object type.
   */
  counter?: ObjectsCounter; // OST2f
}

function encode(
  message: Utils.Properties<ObjectMessage> | Utils.Properties<WireObjectMessage>,
  utils: typeof Utils,
  messageEncoding: typeof MessageEncoding,
  encodeObjectDataFn: EncodeObjectDataFunction,
  encodeInitialValueFn: EncodeInitialValueFunction,
): WireObjectMessage {
  // deep copy the message to avoid mutating the original one.
  // buffer values won't be correctly copied, so we will need to use the original message when encoding.
  const result = Object.assign(new WireObjectMessage(utils, messageEncoding), copyMsg(message));

  // encode "object" field
  if (message.object?.map?.entries) {
    result.object!.map!.entries = encodeMapEntries(message.object.map.entries, encodeObjectDataFn);
  }

  if (message.object?.createOp?.map?.entries) {
    result.object!.createOp!.map!.entries = encodeMapEntries(message.object.createOp.map.entries, encodeObjectDataFn);
  }

  if (message.object?.createOp?.mapOp?.data) {
    result.object!.createOp!.mapOp!.data = encodeObjectData(message.object.createOp.mapOp.data, encodeObjectDataFn);
  }

  if (message.object?.createOp?.initialValue) {
    const { data: encodedInitialValue } = encodeInitialValueFn(message.object.createOp.initialValue);
    result.object!.createOp!.initialValue = encodedInitialValue;
  }

  // OOP5
  // encode "operation" field
  if (message.operation?.map?.entries) {
    result.operation!.map!.entries = encodeMapEntries(message.operation.map.entries, encodeObjectDataFn);
  }

  if (message.operation?.mapOp?.data) {
    result.operation!.mapOp!.data = encodeObjectData(message.operation.mapOp.data, encodeObjectDataFn);
  }

  if (message.operation?.initialValue) {
    const { data: encodedInitialValue } = encodeInitialValueFn(message.operation.initialValue);
    result.operation!.initialValue = encodedInitialValue;
  }

  return result;
}

function encodeMapEntries(
  mapEntries: Record<string, ObjectsMapEntry<ObjectData | WireObjectData>>,
  encodeFn: EncodeObjectDataFunction,
): Record<string, ObjectsMapEntry<WireObjectData>> {
  return Object.entries(mapEntries).reduce(
    (acc, v) => {
      const [key, entry] = v;
      const encodedData = entry.data ? encodeObjectData(entry.data, encodeFn) : undefined;
      acc[key] = {
        ...entry,
        data: encodedData,
      };
      return acc;
    },
    {} as Record<string, ObjectsMapEntry<WireObjectData>>,
  );
}

/** @spec OD4 */
function encodeObjectData(data: ObjectData | WireObjectData, encodeFn: EncodeObjectDataFunction): WireObjectData {
  const encodedData = encodeFn(data);
  return encodedData;
}

export function encodeInitialValue(
  initialValue: Partial<ObjectOperation<ObjectData>>,
  client: BaseClient,
): {
  encodedInitialValue: Bufferlike;
  format: Utils.Format;
} {
  const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;

  // initial value object may contain user provided data that requires an additional encoding (for example buffers as map keys).
  // so we need to encode that data first as if we were sending it over the wire.
  const msg = ObjectMessage.fromValues(
    // cast initialValue to ObjectOperation here, even though it may lack some properties
    // that are usually present on ObjectOperation.
    // this ObjectMessage instance is only used to get the encoded body,
    // so it's ok for the operation field to be incomplete in this context.
    // doing the type assertion here avoids the need to define a separate ObjectMessage
    // type that supports a fully optional ObjectOperation.
    { operation: initialValue as ObjectOperation<ObjectData> },
    client.Utils,
    client.MessageEncoding,
  );
  const wireMsg = msg.encode(client);
  const { operation: initialValueWithDataEncoding } = WireObjectMessage.encodeForWire(
    wireMsg,
    client.Utils,
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

function strMsg(msg: any, className: string) {
  let result = '[' + className;

  for (const attr in msg) {
    if (msg[attr] === undefined || attr === '_utils' || attr === '_messageEncoding') {
      continue;
    }

    if (attr === 'operation' || attr === 'object' || attr === 'extras') {
      result += `; ${attr}=${JSON.stringify(msg[attr])}`;
    } else {
      result += `; ${attr}=${msg[attr]}`;
    }
  }

  result += ']';
  return result;
}

/**
 * Deep copy public properties of an object message, using `JSON.parse(JSON.stringify(object))` for nested object fields like `operation` and `object`.
 *
 * Important: Buffer instances are not copied correctly using `JSON.parse(JSON.stringify(object))`, as they lose their type and become plain objects.
 * If you need access to the original Buffer values, use the original message instance instead.
 */

function copyMsg(
  msg: Utils.Properties<ObjectMessage | WireObjectMessage>,
): Utils.Properties<ObjectMessage | WireObjectMessage> {
  const result: Utils.Properties<ObjectMessage | WireObjectMessage> = {
    id: msg.id,
    clientId: msg.clientId,
    connectionId: msg.connectionId,
    timestamp: msg.timestamp,
    serial: msg.serial,
    serialTimestamp: msg.serialTimestamp,
    siteCode: msg.siteCode,
  };

  if (msg.operation) {
    result.operation = JSON.parse(JSON.stringify(msg.operation));
  }
  if (msg.object) {
    result.object = JSON.parse(JSON.stringify(msg.object));
  }
  if (msg.extras) {
    result.extras = JSON.parse(JSON.stringify(msg.extras));
  }

  return result;
}

/**
 * A decoded {@link WireObjectMessage} message
 * @spec OM1
 * @internal
 */
export class ObjectMessage {
  id?: string; // OM2a
  clientId?: string; // OM2b
  connectionId?: string; // OM2c
  extras?: any; // OM2d
  timestamp?: number; // OM2e
  /**
   * Describes an operation to be applied to an object.
   *
   * Mutually exclusive with the `object` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT`.
   */
  operation?: ObjectOperation<ObjectData>; // OM2f
  /**
   * Describes the instantaneous state of an object.
   *
   * Mutually exclusive with the `operation` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT_SYNC`.
   */
  object?: ObjectState<ObjectData>; // OM2g
  /** An opaque string that uniquely identifies this object message. */
  serial?: string; // OM2h
  /** A timestamp from the {@link serial} field. */
  serialTimestamp?: number; // OM2j
  /** An opaque string used as a key to update the map of serial values on an object. */
  siteCode?: string; // OM2i

  constructor(
    private _utils: typeof Utils,
    private _messageEncoding: typeof MessageEncoding,
  ) {}

  static fromValues(
    values: Utils.Properties<ObjectMessage>,
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): ObjectMessage {
    return Object.assign(new ObjectMessage(utils, messageEncoding), values);
  }

  static fromValuesArray(
    values: Utils.Properties<ObjectMessage>[],
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): ObjectMessage[] {
    return values.map((x) => ObjectMessage.fromValues(x, utils, messageEncoding));
  }

  /**
   * Protocol agnostic encoding of this ObjectMessage. Returns a new {@link WireObjectMessage} instance.
   *
   * Uses encoding functions from regular `Message` processing.
   *
   * @spec OM4
   */
  encode(client: BaseClient): WireObjectMessage {
    const encodeInitialValueFn: EncodeInitialValueFunction = (data, encoding) => {
      const isNativeDataType =
        typeof data == 'string' ||
        typeof data == 'number' ||
        typeof data == 'boolean' ||
        client.Platform.BufferUtils.isBuffer(data) ||
        data === null ||
        data === undefined;

      const { data: encodedData, encoding: newEncoding } = this._messageEncoding.encodeData(
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

    return encode(this, this._utils, this._messageEncoding, encodeObjectDataFn, encodeInitialValueFn);
  }

  toString(): string {
    return strMsg(this, 'ObjectMessage');
  }
}

/**
 * An individual object message to be sent or received via the Ably Realtime service.
 * @spec OM1
 * @internal
 */
export class WireObjectMessage {
  id?: string; // OM2a
  clientId?: string; // OM2b
  connectionId?: string; // OM2c
  extras?: any; // OM2d
  timestamp?: number; // OM2e
  /**
   * Describes an operation to be applied to an object.
   *
   * Mutually exclusive with the `object` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT`.
   */
  operation?: ObjectOperation<WireObjectData>; // OM2f
  /**
   * Describes the instantaneous state of an object.
   *
   * Mutually exclusive with the `operation` field. This field is only set on object messages if the `action` field of the `ProtocolMessage` encapsulating it is `OBJECT_SYNC`.
   */
  object?: ObjectState<WireObjectData>; // OM2g
  /** An opaque string that uniquely identifies this object message. */
  serial?: string; // OM2h
  /** A timestamp from the {@link serial} field. */
  serialTimestamp?: number; // OM2j
  /** An opaque string used as a key to update the map of serial values on an object. */
  siteCode?: string; // OM2i

  constructor(
    private _utils: typeof Utils,
    private _messageEncoding: typeof MessageEncoding,
  ) {}

  static fromValues(
    values: Utils.Properties<WireObjectMessage>,
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): WireObjectMessage {
    return Object.assign(new WireObjectMessage(utils, messageEncoding), values);
  }

  static fromValuesArray(
    values: Utils.Properties<WireObjectMessage>[],
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
  ): WireObjectMessage[] {
    return values.map((x) => WireObjectMessage.fromValues(x, utils, messageEncoding));
  }

  /**
   * Encodes WireObjectMessage for wire transmission. Does not mutate the provided WireObjectMessage.
   *
   * Uses encoding functions from regular `Message` processing.
   */
  static encodeForWire(
    message: Utils.Properties<WireObjectMessage>,
    utils: typeof Utils,
    messageEncoding: typeof MessageEncoding,
    format: Utils.Format,
  ): WireObjectMessage {
    const encodeInitialValueFn: EncodeInitialValueFunction = (data, encoding) => {
      // OOP5a1, OOP5b1 - initialValue encoded based on the protocol used
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
        // OD4c2, OD4d2
        const result = messageEncoding.encodeDataForWire(data.bytes, data.encoding, format);
        encodedBytes = result.data;
        // no need to change the encoding
      }

      return {
        ...data,
        bytes: encodedBytes,
      };
    };

    return encode(message, utils, messageEncoding, encodeObjectDataFn, encodeInitialValueFn);
  }

  /**
   * Decodes this WireObjectMessage and returns a new {@link ObjectMessage} instance.
   *
   * Format is used to decode the bytes value as it's implicitly encoded depending on the protocol used:
   * - json: bytes are Base64-encoded string
   * - msgpack: bytes have a binary representation and don't need to be decoded
   *
   * @spec OM5
   */
  decode(client: BaseClient, format: Utils.Format | undefined): ObjectMessage {
    // deep copy the message to avoid mutating the original one.
    // buffer values won't be correctly copied, so we will need to use the original message when decoding.
    const result = Object.assign(new ObjectMessage(this._utils, this._messageEncoding), copyMsg(this));

    try {
      // decode "object" field
      if (this.object?.map?.entries) {
        result.object!.map!.entries = this._decodeMapEntries(this.object.map.entries, client, format);
      }

      if (this.object?.createOp?.map?.entries) {
        result.object!.createOp!.map!.entries = this._decodeMapEntries(
          this.object.createOp.map.entries,
          client,
          format,
        );
      }

      if (this.object?.createOp?.mapOp?.data) {
        result.object!.createOp!.mapOp!.data = this._decodeObjectData(this.object.createOp.mapOp.data, client, format);
      }

      // decode "operation" field
      if (this.operation?.map?.entries) {
        result.operation!.map!.entries = this._decodeMapEntries(this.operation.map.entries, client, format);
      }

      if (this.operation?.mapOp?.data) {
        result.operation!.mapOp!.data = this._decodeObjectData(this.operation.mapOp.data, client, format);
      }
    } catch (error) {
      client.Logger.logAction(
        client.logger,
        client.Logger.LOG_ERROR,
        'WireObjectMessage.decode()',
        this._utils.inspectError(error),
      );
    }

    return result;
  }

  /**
   * Overload toJSON() to intercept JSON.stringify().
   *
   * This will prepare the message to be transmitted over the wire to Ably.
   * It will encode the data payload according to the wire protocol used on the client.
   */
  toJSON() {
    // we can infer the format used by client by inspecting with what arguments this method was called.
    // if JSON protocol is being used, the JSON.stringify() will be called and this toJSON() method will have a non-empty arguments list.
    // MSGPack protocol implementation also calls toJSON(), but with an empty arguments list.
    const format = arguments.length > 0 ? this._utils.Format.json : this._utils.Format.msgpack;
    const { _utils, _messageEncoding, ...publicProps } = WireObjectMessage.encodeForWire(
      this,
      this._utils,
      this._messageEncoding,
      format,
    );
    return publicProps;
  }

  toString(): string {
    return strMsg(this, 'WireObjectMessage');
  }

  /** @spec OM3 */
  getMessageSize(): number {
    let size = 0;

    // OM3a
    size += this.clientId?.length ?? 0; // OM3f
    if (this.operation) {
      size += this._getObjectOperationSize(this.operation); // OM3b
    }
    if (this.object) {
      size += this._getObjectStateSize(this.object); // OM3c
    }
    if (this.extras) {
      size += JSON.stringify(this.extras).length; // OM3d
    }

    return size;
  }

  /** @spec OOP4 */
  private _getObjectOperationSize(operation: ObjectOperation<WireObjectData>): number {
    let size = 0;

    // OOP4a
    if (operation.mapOp) {
      size += this._getMapOpSize(operation.mapOp); // OOP4b
    }
    if (operation.counterOp) {
      size += this._getCounterOpSize(operation.counterOp); // OOP4c
    }
    if (operation.map) {
      size += this._getObjectMapSize(operation.map); // OOP4d
    }
    if (operation.counter) {
      size += this._getObjectCounterSize(operation.counter); // OOP4e
    }

    return size;
  }

  /** @spec OST3 */
  private _getObjectStateSize(obj: ObjectState<WireObjectData>): number {
    let size = 0;

    // OST3a
    if (obj.map) {
      size += this._getObjectMapSize(obj.map); // OST3b
    }
    if (obj.counter) {
      size += this._getObjectCounterSize(obj.counter); // OST3c
    }
    if (obj.createOp) {
      size += this._getObjectOperationSize(obj.createOp); // OST3d
    }

    return size;
  }

  /** @spec OMP4 */
  private _getObjectMapSize(map: ObjectsMap<WireObjectData>): number {
    let size = 0;

    // OMP4a
    Object.entries(map.entries ?? {}).forEach(([key, entry]) => {
      size += key?.length ?? 0; // OMP4a1
      if (entry) {
        size += this._getMapEntrySize(entry); // OMP4a2
      }
    });

    return size;
  }

  /** @spec OCN3 */
  private _getObjectCounterSize(counter: ObjectsCounter): number {
    // OCN3b
    if (counter.count == null) {
      return 0;
    }

    // OCN3a
    return 8;
  }

  /** @spec OME3 */
  private _getMapEntrySize(entry: ObjectsMapEntry<WireObjectData>): number {
    let size = 0;

    // OME3a
    if (entry.data) {
      size += this._getObjectDataSize(entry.data); // OME3b
    }

    return size;
  }

  /** @spec OMO3 */
  private _getMapOpSize(mapOp: ObjectsMapOp<WireObjectData>): number {
    let size = 0;

    // OMO3a
    size += mapOp.key?.length ?? 0; // OMO3d
    if (mapOp.data) {
      size += this._getObjectDataSize(mapOp.data); // OMO3b
    }

    return size;
  }

  /** @spec OCO3 */
  private _getCounterOpSize(operation: ObjectsCounterOp): number {
    // OCO3b
    if (operation.amount == null) {
      return 0;
    }

    // OCO3a
    return 8;
  }

  /** @spec OD3 */
  private _getObjectDataSize(data: WireObjectData): number {
    let size = 0;

    // OD3a
    if (data.boolean != null) {
      size += this._utils.dataSizeBytes(data.boolean); // OD3b
    }
    if (data.bytes != null) {
      size += this._utils.dataSizeBytes(data.bytes); // OD3c
    }
    if (data.number != null) {
      size += this._utils.dataSizeBytes(data.number); // OD3d
    }
    if (data.string != null) {
      size += this._utils.dataSizeBytes(data.string); // OD3e
    }

    return size;
  }

  private _decodeMapEntries(
    mapEntries: Record<string, ObjectsMapEntry<WireObjectData>>,
    client: BaseClient,
    format: Utils.Format | undefined,
  ): Record<string, ObjectsMapEntry<ObjectData>> {
    return Object.entries(mapEntries).reduce(
      (acc, v) => {
        const [key, entry] = v;
        const decodedData = entry.data ? this._decodeObjectData(entry.data, client, format) : undefined;
        acc[key] = {
          ...entry,
          data: decodedData,
        };
        return acc;
      },
      {} as Record<string, ObjectsMapEntry<ObjectData>>,
    );
  }

  /** @spec OD5 */
  private _decodeObjectData(
    objectData: WireObjectData,
    client: BaseClient,
    format: Utils.Format | undefined,
  ): ObjectData {
    // TODO: support decoding JSON objects stored as a JSON string with an encoding of "json"
    // https://ably.atlassian.net/browse/PUB-1667
    // currently we check only the "bytes" field:
    // - if connection is msgpack - "bytes" was received as msgpack encoded bytes, no need to decode, it's already a buffer
    // - if connection is json - "bytes" was received as a base64 string, need to decode it to a buffer

    try {
      let decodedBytes: Bufferlike | undefined;
      if (format === 'msgpack') {
        // OD5a1 - connection is using msgpack protocol, bytes are already a buffer
        decodedBytes = objectData.bytes as Bufferlike;
      } else {
        // OD5b2 - connection is using JSON protocol, Base64-decode bytes value
        decodedBytes =
          objectData.bytes != null ? client.Platform.BufferUtils.base64Decode(String(objectData.bytes)) : undefined;
      }

      return {
        ...objectData,
        bytes: decodedBytes,
      };
    } catch (error) {
      client.Logger.logAction(
        client.logger,
        client.Logger.LOG_ERROR,
        'WireObjectMessage._decodeObjectData()',
        this._utils.inspectError(error),
      );
      // object data decoding has failed, return the data as is.
      return {
        ...objectData,
      } as ObjectData;
    }
  }
}
