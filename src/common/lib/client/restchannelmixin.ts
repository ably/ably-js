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

export interface RestHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
}

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
      headers = Defaults.defaultGetHeaders(client.options);

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
    const headers = Defaults.defaultPostHeaders(channel.client.options);

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

    const client = channel.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultGetHeaders(client.options);
    Utils.mixin(headers, client.options.headers);

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
    action: 'message.update' | 'message.delete' | 'message.append',
    message: Message,
    operation?: API.MessageOperation,
    params?: Record<string, any>,
  ): Promise<API.UpdateDeleteResult> {
    if (!message.serial) {
      throw new ErrorInfo(
        'This message lacks a serial and cannot be updated. Make sure you have enabled "Message annotations, updates, and deletes" in channel settings on your dashboard.',
        40003,
        400,
      );
    }

    const client = channel.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultPostHeaders(client.options);
    Utils.mixin(headers, client.options.headers);

    // construct a new Message to avoid mutating the message the user passes in
    const requestMessage = Message.fromValues(message);
    requestMessage.action = action;
    requestMessage.version = operation;

    const encoded = await requestMessage.encode(channel.channelOptions as CipherOptions);
    const requestBody = serializeMessage(encoded, client._MsgPack, format);

    let method = Resource.patch;
    const { body, unpacked } = await method<API.UpdateDeleteResult>(
      client,
      this.basePath(channel) + '/messages/' + encodeURIComponent(message.serial),
      requestBody,
      headers,
      params || {},
      null,
      true,
    );

    const decoded = unpacked ? body : Utils.decodeBody<API.UpdateDeleteResult>(body, client._MsgPack, format);
    return decoded || { versionSerial: null };
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
    const headers = Defaults.defaultGetHeaders(client.options);

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
