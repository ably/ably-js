import * as API from '../../../../ably';
import RestChannel from './restchannel';
import RealtimeChannel from './realtimechannel';
import * as Utils from '../util/utils';
import { PaginatedResultCallback } from '../../types/utils';
import Message, { fromResponseBody as messageFromResponseBody } from '../types/message';
import Defaults from '../util/defaults';
import PaginatedResource from './paginatedresource';
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
    callback: PaginatedResultCallback<Message>
  ): void {
    const client = channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = channel.channelOptions;
    new PaginatedResource(client, this.basePath(channel) + '/messages', headers, envelope, async function (
      body,
      headers,
      unpacked
    ) {
      return await messageFromResponseBody(body as Message[], options, client._MsgPack, unpacked ? undefined : format);
    }).get(params as Record<string, unknown>, callback);
  }

  static async status(channel: RestChannel | RealtimeChannel): Promise<API.Types.ChannelDetails> {
    const format = channel.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultPostHeaders(channel.client.options, { format });

    return new Promise((resolve, reject) => {
      Resource.get<API.Types.ChannelDetails>(
        channel.client,
        this.basePath(channel),
        headers,
        {},
        format,
        (err, result) => (err ? reject(err) : resolve(result!))
      );
    });
  }
}
