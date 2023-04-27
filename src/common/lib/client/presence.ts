import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import PresenceMessage from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import { PaginatedResultCallback } from '../../types/utils';
import Channel from './channel';
import RealtimeChannel from './realtimechannel';

function noop() {}

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
        if (this.channel.rest.options.promises) {
          return Utils.promisify(this, 'get', arguments);
        }
        callback = noop;
      }
    }
    const rest = this.channel.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.channel.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    const options = this.channel.channelOptions;
    new PaginatedResource(rest, this.basePath, headers, envelope, function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return PresenceMessage.fromResponseBody(body, options as CipherOptions, unpacked ? undefined : format);
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
        if (this.channel.rest.options.promises) {
          return Utils.promisify(this, '_history', [params]);
        }
        callback = noop;
      }
    }

    const rest = this.channel.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.channel.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    const options = this.channel.channelOptions;
    new PaginatedResource(rest, this.basePath + '/history', headers, envelope, function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return PresenceMessage.fromResponseBody(body, options as CipherOptions, unpacked ? undefined : format);
    }).get(params, callback);
  }
}

export default Presence;
