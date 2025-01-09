import * as API from '../../../../ably';
import RestChannel from './restchannel';
import RealtimeChannel from './realtimechannel';
import * as Utils from '../util/utils';
import Message, { WireMessage, _fromEncodedArray } from '../types/message';
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
}
