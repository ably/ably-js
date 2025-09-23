import * as API from '../../../../ably';
import RestChannel from './restchannel';
import ErrorInfo from '../types/errorinfo';
import RealtimeChannel from './realtimechannel';
import * as Utils from '../util/utils';
import Message, { WireMessage, _fromEncodedArray, _fromEncoded, serialize as serializeMessage } from '../types/message';
import { CipherOptions } from '../types/basemessage';
import Defaults from '../util/defaults';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import Resource from './resource';
import { RequestBody } from 'common/types/http';

export interface RestHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
}

type UpdateDeleteRequest = {
  serial: string;
  data?: any;
  name?: string | null;
  encoding?: string | null;
  extras?: any;
  operation?: API.MessageOperation;
};

export class RestChannelMixin {
  static basePath(channel: RestChannel | RealtimeChannel) {
    return '/channels/' + encodeURIComponent(channel.name);
  }

  static history(
    channel: RestChannel | RealtimeChannel,
    params: RestHistoryParams | null,
  ): Promise<PaginatedResult<Message>> {
    const client = channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    return new PaginatedResource(client, this.basePath(channel) + '/messages', headers, envelope, async function (
      body,
      headers,
      unpacked,
    ) {
      const decoded = (
        unpacked ? body : Utils.decodeBody(body, client._MsgPack, format)
      ) as Utils.Properties<WireMessage>[];

      return _fromEncodedArray(decoded, channel);
    }).get(params as Record<string, unknown>);
  }

  static async status(channel: RestChannel | RealtimeChannel): Promise<API.ChannelDetails> {
    const format = channel.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultPostHeaders(channel.client.options, { format });

    const response = await Resource.get<API.ChannelDetails>(
      channel.client,
      this.basePath(channel),
      headers,
      {},
      format,
      true,
    );

    return response.body!;
  }

  static async getMessage(channel: RestChannel | RealtimeChannel, serialOrMessage: string | Message): Promise<Message> {
    const serial = typeof serialOrMessage === 'string' ? serialOrMessage : serialOrMessage.serial;
    if (!serial) {
      throw new ErrorInfo(
        'This message lacks a serial. Make sure you have enabled "Message annotations, updates, and deletes" in channel settings on your dashboard.',
        40003,
        400,
      );
    }

    const format = channel.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultGetHeaders(channel.client.options, { format });
    Utils.mixin(headers, channel.client.options.headers);

    const { body, unpacked } = await Resource.get<WireMessage>(
      client,
      this.basePath(channel) + '/messages/' + encodeURIComponent(serial),
      headers,
      {},
      null,
      true,
    );

    const decoded = unpacked ? body! : Utils.decodeBody<WireMessage>(body, client._MsgPack, format);
    return _fromEncoded(decoded, channel);
  }

  static async updateDeleteMessage(
    channel: RestChannel | RealtimeChannel,
    opts: { isDelete: boolean },
    message: Message,
    operation?: API.MessageOperation,
    params?: Record<string, any>,
  ): Promise<Message> {
    if (!message.serial) {
      throw new ErrorInfo(
        'This message lacks a serial and cannot be updated. Make sure you have enabled "Message annotations, updates, and deletes" in channel settings on your dashboard.',
        40003,
        400,
      );
    }

    const client = channel.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultPostHeaders(client.options, { format });
    Utils.mixin(headers, client.options.headers);

    let encoded: WireMessage | null = null;
    if (message.data !== undefined) {
      encoded = await Message.fromValues(message).encode(channel.channelOptions as CipherOptions);
    }

    const req: UpdateDeleteRequest = {
      serial: message.serial,
      operation: operation,
      name: message.name,
      data: encoded && encoded.data,
      encoding: encoded && encoded.encoding,
      extras: message.extras,
    };

    const requestBody: RequestBody = serializeMessage(req, client._MsgPack, format);

    const method = opts.isDelete ? Resource.post : Resource.patch;
    const pathSuffix = opts.isDelete ? '/delete' : '';
    const { body, unpacked } = await method<WireMessage>(
      client,
      this.basePath(channel) + '/messages/' + encodeURIComponent(message.serial) + pathSuffix,
      requestBody,
      headers,
      params || {},
      null,
      true,
    );

    const decoded = unpacked ? body! : Utils.decodeBody<WireMessage>(body, client._MsgPack, format);
    return _fromEncoded(decoded, channel);
  }

  static getMessageVersions(
    channel: RestChannel | RealtimeChannel,
    serialOrMessage: string | Message,
    params?: Record<string, any>,
  ): Promise<PaginatedResult<Message>> {
    const serial = typeof serialOrMessage === 'string' ? serialOrMessage : serialOrMessage.serial;
    if (!serial) {
      throw new ErrorInfo(
        'This message lacks a serial. Make sure you have enabled "Message annotations, updates, and deletes" in channel settings on your dashboard.',
        40003,
        400,
      );
    }

    const client = channel.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const envelope = channel.client.http.supportsLinkHeaders ? undefined : format;
    const headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    return new PaginatedResource(
      client,
      this.basePath(channel) + '/messages/' + encodeURIComponent(serial) + '/versions',
      headers,
      envelope,
      async (body, headers, unpacked) => {
        const decoded = unpacked
          ? (body as WireMessage[])
          : Utils.decodeBody<WireMessage[]>(body, client._MsgPack, format);

        return _fromEncodedArray(decoded, channel);
      },
    ).get(params || {});
  }
}
