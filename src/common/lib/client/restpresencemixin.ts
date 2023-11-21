import RestPresence from './restpresence';
import RealtimePresence from './realtimepresence';
import * as Utils from '../util/utils';
import { PaginatedResultCallback } from '../../types/utils';
import Defaults from '../util/defaults';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import PresenceMessage from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import { RestChannelMixin } from './restchannelmixin';

export class RestPresenceMixin {
  static basePath(presence: RestPresence | RealtimePresence) {
    return RestChannelMixin.basePath(presence.channel) + '/presence';
  }

  static history(
    presence: RestPresence | RealtimePresence,
    params: any,
    callback: PaginatedResultCallback<PresenceMessage>
  ): void | Promise<PaginatedResult<PresenceMessage>> {
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'history', [presence, params]);
      }
    }

    const client = presence.channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = presence.channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = presence.channel.channelOptions;
    new PaginatedResource(client, this.basePath(presence) + '/history', headers, envelope, async function (
      body,
      headers,
      unpacked
    ) {
      return await PresenceMessage.fromResponseBody(
        body as Record<string, unknown>[],
        options as CipherOptions,
        client._MsgPack,
        unpacked ? undefined : format
      );
    }).get(params, callback);
  }
}
