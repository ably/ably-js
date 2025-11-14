import type RestChannel from 'common/lib/client/restchannel';
import type * as Utils from 'common/lib/util/utils';
import type {
  GetObjectParams,
  ObjectsMapSemantics,
  PrimitiveOrObjectReference,
  RestCompactObjectData,
  RestLiveObject,
  RestObjectData,
  RestObjectMapEntry,
  RestObjectOperation,
  RestObjectPublishResult,
} from '../../../liveobjects';

enum WireObjectsMapSemantics {
  LWW = 'LWW',
}

const mapSemantics: Record<WireObjectsMapSemantics, ObjectsMapSemantics> = {
  [WireObjectsMapSemantics.LWW]: 'lww',
};

type WireRestLiveObject = WireRestLiveMap | WireRestLiveCounter | WireAnyRestLiveObject;

interface WireRestLiveMap {
  objectId: string;
  map: {
    semantics: WireObjectsMapSemantics;
    entries: Record<string, WireRestObjectMapEntry>;
  };
}

export interface WireRestObjectMapEntry {
  data: WireRestLiveObject | WireRestObjectData;
}

export interface WireRestObjectData {
  objectId?: string;
  number?: number;
  boolean?: boolean;
  string?: string;
  bytes?: string | Buffer | ArrayBuffer;
  json?: string;
}

export interface WireRestLiveCounter {
  objectId: string;
  counter: {
    data: {
      number: number;
    };
  };
}

export type WireAnyRestLiveObject = {
  objectId: string;
};

export class RestObject {
  constructor(private _channel: RestChannel) {}

  /**
   * Read object data. Defaults to { compact: true } and entrypoint=root when no id is provided.
   * Returns undefined if provided objectId/path does not resolve to an object.
   */
  async get(params?: Omit<GetObjectParams, 'compact'> & { compact?: true }): Promise<RestCompactObjectData | undefined>;
  async get(params: Omit<GetObjectParams, 'compact'> & { compact: false }): Promise<RestLiveObject | undefined>;
  async get(params?: GetObjectParams): Promise<RestCompactObjectData | RestLiveObject | undefined> {
    const client = this._channel.client;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;
    const envelope = client.http.supportsLinkHeaders ? null : format;
    const headers = client.Defaults.defaultGetHeaders(client.options);

    client.Utils.mixin(headers, client.options.headers);

    try {
      const response = await client.rest.Resource.get<RestCompactObjectData | WireRestLiveObject>(
        client,
        this._basePath(params?.objectId ?? 'root'),
        headers,
        params ?? {},
        envelope,
        true,
      );

      let decodedBody: RestCompactObjectData | WireRestLiveObject | undefined;
      if (format) {
        decodedBody = client.Utils.decodeBody(response.body, client._MsgPack, format);
      } else {
        decodedBody = response.body;
      }

      if (decodedBody == undefined) {
        return undefined;
      }

      // non-object primitive values
      if (typeof decodedBody !== 'object') {
        return decodedBody;
      }

      // live counter or JSON object
      if (!this._isWireLiveMap(decodedBody)) {
        return decodedBody;
      }

      return this._decodeWireLiveObject(decodedBody, format);
    } catch (error) {
      if (this._channel.client.Utils.isErrorInfoOrPartialErrorInfo(error) && error.code === 40400) {
        // ignore object resolution errors and return undefined
        return undefined;
      }
      // rethrow everything else
      throw error;
    }
  }

  /**
   * Publish one or more operations.
   */
  async publish(op: RestObjectOperation | RestObjectOperation[]): Promise<RestObjectPublishResult> {
    const client = this._channel.client;
    const options = client.options;
    const format = options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;
    const headers = client.Defaults.defaultPostHeaders(client.options, { format });

    const wireOps = Array.isArray(op)
      ? op.map((o) => this._constructPublishBody(o, format))
      : [this._constructPublishBody(op, format)];

    client.Utils.mixin(headers, client.options.headers);

    const requestBody = client.Utils.encodeBody(wireOps, client._MsgPack, format);

    const response = await client.rest.Resource.post<RestObjectPublishResult>(
      client,
      this._basePath(),
      requestBody,
      headers,
      {},
      null,
      true,
    );

    if (format) {
      return client.Utils.decodeBody(response.body, client._MsgPack, format);
    }

    return response.body!;
  }

  private _basePath(objectId?: string): string {
    return (
      this._channel.client.rest.channelMixin.basePath(this._channel) +
      '/object' +
      (objectId ? '/' + encodeURIComponent(objectId) : '')
    );
  }

  private _constructPublishBody(op: RestObjectOperation, format: Utils.Format): any {
    const operation = op.operation;
    switch (operation) {
      case 'map.create':
        if (op.path == null) {
          throw new this._channel.client.ErrorInfo('Path must be provided for "map.create" operation', 40003, 400);
        }

        return {
          operation: 'MAP_CREATE',
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: Object.entries(op.entries).reduce(
            (acc, [key, value]) => {
              acc[key] = this._encodePrimitive(value, format);
              return acc;
            },
            {} as Record<string, any>,
          ),
        };

      case 'map.set':
        return {
          operation: 'MAP_SET',
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: {
            key: op.key,
            value: {
              ...this._encodePrimitive(op.value, format),
              ...(op.encoding ? { encoding: op.encoding } : {}),
            },
          },
        };

      case 'map.remove':
        return {
          operation: 'MAP_REMOVE',
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { key: op.key },
        };

      case 'counter.create':
        if (op.path == null) {
          throw new this._channel.client.ErrorInfo('Path must be provided for "counter.create" operation', 40003, 400);
        }

        return {
          operation: 'COUNTER_CREATE',
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { number: op.count },
        };

      case 'counter.inc':
        return {
          operation: 'COUNTER_INC',
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { number: op.amount },
        };

      default:
        throw new this._channel.client.ErrorInfo('Unsupported publish operation action: ' + operation, 40003, 400);
    }
  }

  private _encodePrimitive(value: PrimitiveOrObjectReference, format: Utils.Format): any {
    const client = this._channel.client;
    if (client.Platform.BufferUtils.isBuffer(value)) {
      return {
        bytes: client.MessageEncoding.encodeDataForWire(value, null, format).data,
      };
    } else if (typeof value === 'string') {
      return { string: value };
    } else if (typeof value === 'boolean') {
      return { boolean: value };
    } else if (typeof value === 'number') {
      return { number: value };
    } else if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length === 1 && 'objectId' in value) {
        return value;
      } else {
        return { json: JSON.stringify(value) };
      }
    }

    return value;
  }

  private _decodeWireLiveObject(obj: WireRestLiveObject, format: Utils.Format): RestLiveObject {
    // expanded live map object which needs decoding
    if (this._isWireLiveMap(obj)) {
      return this._decodeWireRestLiveMap(obj, format);
    }

    // live counter or JSON object
    return obj;
  }

  private _decodeWireRestLiveMap(obj: WireRestLiveMap, format: Utils.Format): RestLiveObject {
    return {
      objectId: obj.objectId,
      map: {
        semantics: (mapSemantics[obj.map.semantics] ?? 'unknown') as ObjectsMapSemantics,
        entries:
          typeof obj.map.entries === 'object'
            ? Object.entries(obj.map.entries).reduce(
                (acc, entry) => {
                  const [key, value] = entry;
                  const entryData = value.data;
                  acc[key] = {
                    data: this._isWireObjectData(entryData)
                      ? this._decodeWireObjectData(entryData, format)
                      : this._decodeWireLiveObject(entryData, format),
                  };
                  return acc;
                },
                {} as Record<string, RestObjectMapEntry>,
              )
            : obj.map.entries,
      },
    };
  }

  private _decodeWireObjectData(obj: WireRestObjectData, format: Utils.Format): RestObjectData {
    const client = this._channel.client;

    if (obj.objectId != null) {
      return { objectId: obj.objectId };
    }
    if (obj.number != null) {
      return { number: obj.number };
    }
    if (obj.boolean != null) {
      return { boolean: obj.boolean };
    }
    if (obj.string != null) {
      return { string: obj.string };
    }
    if (obj.bytes != null) {
      const decodedBytes =
        format === 'msgpack'
          ? // connection is using msgpack protocol, bytes are already a buffer
            (obj.bytes as Buffer | ArrayBuffer)
          : // connection is using JSON protocol, Base64-decode bytes value
            client.Platform.BufferUtils.base64Decode(String(obj.bytes));
      return { bytes: decodedBytes };
    }
    if (obj.json != null) {
      return { json: JSON.parse(obj.json) };
    }

    client.Logger.logAction(
      client.logger,
      client.Logger.LOG_ERROR,
      'RestObject._decodeWireObjectData: Unknown object data format, returning empty object; object data: ' +
        client.Platform.Config.inspect(obj),
    );
    return {};
  }

  private _isWireLiveMap(obj: unknown): obj is WireRestLiveMap {
    return (
      typeof obj === 'object' &&
      obj != undefined &&
      'objectId' in obj &&
      'map' in obj &&
      typeof obj.map === 'object' &&
      obj.map != undefined &&
      'semantics' in obj.map &&
      'entries' in obj.map
    );
  }

  private _isWireObjectData(obj: unknown): obj is WireRestObjectData {
    return (
      typeof obj === 'object' &&
      obj != undefined &&
      Object.keys(obj).length === 1 &&
      ['objectId', 'number', 'boolean', 'string', 'bytes', 'json'].includes(Object.keys(obj)[0])
    );
  }
}
