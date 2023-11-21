import * as Utils from '../util/utils';
import Logger from '../util/logger';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import PresenceMessage from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import { PaginatedResultCallback } from '../../types/utils';
import RestChannel from './restchannel';
import Defaults from '../util/defaults';

class RestPresence {
  channel: RestChannel;

  constructor(channel: RestChannel) {
    this.channel = channel;
  }

  get(params: any, callback: PaginatedResultCallback<PresenceMessage>): void | Promise<PresenceMessage> {
    Logger.logAction(Logger.LOG_MICRO, 'RestPresence.get()', 'channel = ' + this.channel.name);
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'get', arguments);
      }
    }
    const client = this.channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = this.channel.channelOptions;
    new PaginatedResource(
      client,
      this.channel.client.rest.presenceMixin.basePath(this),
      headers,
      envelope,
      async function (body, headers, unpacked) {
        return await PresenceMessage.fromResponseBody(
          body as Record<string, unknown>[],
          options as CipherOptions,
          client._MsgPack,
          unpacked ? undefined : format
        );
      }
    ).get(params, callback);
  }

  history(
    params: any,
    callback: PaginatedResultCallback<PresenceMessage>
  ): void | Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(Logger.LOG_MICRO, 'RestPresence.history()', 'channel = ' + this.channel.name);
    return this.channel.client.rest.presenceMixin.history(this, params, callback);
  }
}

export default RestPresence;
