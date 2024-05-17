import * as Utils from '../util/utils';
import Logger from '../util/logger';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import PresenceMessage, { fromResponseBody as presenceMessageFromResponseBody } from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import RestChannel from './restchannel';
import Defaults from '../util/defaults';

class RestPresence {
  channel: RestChannel;

  constructor(channel: RestChannel) {
    this.channel = channel;
  }

  get logger(): Logger {
    return this.channel.logger;
  }

  async get(params: any): Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(this.logger, Logger.LOG_MICRO, 'RestPresence.get()', 'channel = ' + this.channel.name);
    const client = this.channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = this.channel.channelOptions;
    return new PaginatedResource(
      client,
      this.channel.client.rest.presenceMixin.basePath(this),
      headers,
      envelope,
      async (body, headers, unpacked) => {
        return await presenceMessageFromResponseBody(
          body as Record<string, unknown>[],
          options as CipherOptions,
          this.logger,
          client._MsgPack,
          unpacked ? undefined : format,
        );
      },
    ).get(params);
  }

  async history(params: any): Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(this.logger, Logger.LOG_MICRO, 'RestPresence.history()', 'channel = ' + this.channel.name);
    return this.channel.client.rest.presenceMixin.history(this, params);
  }
}

export default RestPresence;
