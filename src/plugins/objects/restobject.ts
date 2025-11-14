import type RestChannel from 'common/lib/client/restchannel';
import type * as Utils from 'common/lib/util/utils';
import type {
  GetObjectParams,
  PrimitiveOrObjectReference,
  RestCompactObjectData,
  RestLiveObject,
  RestObjectOperation,
  RestObjectPublishResult,
} from '../../../ably';

export class RestObject {
  channel: RestChannel;

  constructor(channel: RestChannel) {
    this.channel = channel;
  }

  /**
   * Read object data. Defaults to { compact: true } and entrypoint=root when no id is provided.
   * Returns undefined if provided objectId/path does not resolve to an object.
   */
  async get(params?: Omit<GetObjectParams, 'compact'> & { compact?: true }): Promise<RestCompactObjectData | undefined>;
  async get(params: Omit<GetObjectParams, 'compact'> & { compact: false }): Promise<RestLiveObject | undefined>;
  async get(params?: GetObjectParams): Promise<RestCompactObjectData | RestLiveObject | undefined> {
    const client = this.channel.client;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;
    const envelope = client.http.supportsLinkHeaders ? null : format;
    const headers = client.Defaults.defaultGetHeaders(client.options);

    client.Utils.mixin(headers, client.options.headers);

    try {
      const response = await client.rest.Resource.get<RestCompactObjectData | RestLiveObject>(
        client,
        this._basePath(params?.objectId ?? 'root'),
        headers,
        params ?? {},
        envelope,
        true,
      );

      if (format) {
        return client.Utils.decodeBody(response.body, client._MsgPack, format);
      }

      return response.body;
    } catch (error) {
      if (this.channel.client.Utils.isErrorInfoOrPartialErrorInfo(error) && error.code === 40400) {
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
    const client = this.channel.client;
    const options = client.options;
    const format = options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json;
    const headers = client.Defaults.defaultPostHeaders(client.options);

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
      this.channel.client.rest.channelMixin.basePath(this.channel) +
      '/object' +
      (objectId ? '/' + encodeURIComponent(objectId) : '')
    );
  }

  private _constructPublishBody(op: RestObjectOperation, format: Utils.Format): any {
    const operation = op.operation;
    switch (operation) {
      case 'map.create':
        return {
          operation: op.operation,
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
          operation: op.operation,
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
          operation: op.operation,
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { key: op.key },
        };
      case 'counter.create':
        return {
          operation: op.operation,
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { number: op.count },
        };
      case 'counter.inc':
        return {
          operation: op.operation,
          id: op.id,
          extras: op.extras,
          objectId: op.objectId,
          path: op.path,
          data: { number: op.amount },
        };

      default:
        throw new this.channel.client.ErrorInfo('Unsupported publish operation action: ' + operation, 40003, 400);
    }
  }

  private _encodePrimitive(value: PrimitiveOrObjectReference, format: Utils.Format): any {
    const client = this.channel.client;
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
      return { json: JSON.stringify(value) };
    }

    return value;
  }
}
