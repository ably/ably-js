import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import PresenceMessage from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import { PaginatedResultCallback } from '../../types/utils';
import Channel from './channel';
import RealtimeChannel from './realtimechannel';
import Defaults from '../util/defaults';

class Presence extends EventEmitter {
  channel: RealtimeChannel | Channel;
  basePath: string;

  constructor(channel: RealtimeChannel | Channel) {
    super();
    this.channel = channel;
    this.basePath = channel.basePath + '/presence';
  }

  get(params: any, callback: PaginatedResultCallback<PresenceMessage>): void | Promise<PresenceMessage> {
    Logger.logAction(Logger.LOG_MICRO, 'Presence.get()', 'channel = ' + this.channel.name);
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
    new PaginatedResource(client, this.basePath, headers, envelope, async function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return await PresenceMessage.fromResponseBody(
        body,
        options as CipherOptions,
        client._MsgPack,
        unpacked ? undefined : format
      );
    }).get(params, callback);
  }

  history(
    params: any,
    callback: PaginatedResultCallback<PresenceMessage>
  ): void | Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(Logger.LOG_MICRO, 'Presence.history()', 'channel = ' + this.channel.name);
    return this._history(params, callback);
  }

  _history(
    params: any,
    callback: PaginatedResultCallback<PresenceMessage>
  ): void | Promise<PaginatedResult<PresenceMessage>> {
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, '_history', [params]);
      }
    }

    const client = this.channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.channel.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = this.channel.channelOptions;
    new PaginatedResource(client, this.basePath + '/history', headers, envelope, async function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return await PresenceMessage.fromResponseBody(
        body,
        options as CipherOptions,
        client._MsgPack,
        unpacked ? undefined : format
      );
    }).get(params, callback);
  }
}

export default Presence;
