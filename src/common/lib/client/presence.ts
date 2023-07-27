import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import { IPresenceMessage, IPresenceMessageConstructor } from '../types/presencemessage';
import { CipherOptions } from '../types/message';
import { PaginatedResultCallback } from '../../types/utils';
import { IChannel } from './channel';
import { IRealtimeChannel } from './realtimechannel';
import Defaults from '../util/defaults';

export interface IPresence extends EventEmitter {}

export interface IPresenceConstructor {
  new (channel: IRealtimeChannel | IChannel): IPresence;
}

const presenceClassFactory = (presenceMessageClass: IPresenceMessageConstructor): IPresenceConstructor => {
  return class Presence extends EventEmitter implements IPresence {
    channel: IRealtimeChannel | IChannel;
    basePath: string;

    constructor(channel: IRealtimeChannel | IChannel) {
      super();
      this.channel = channel;
      this.basePath = channel.basePath + '/presence';
    }

    get(params: any, callback: PaginatedResultCallback<IPresenceMessage>): void | Promise<IPresenceMessage> {
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
        return await presenceMessageClass.fromResponseBody(
          body,
          options as CipherOptions,
          unpacked ? undefined : format
        );
      }).get(params, callback);
    }

    history(
      params: any,
      callback: PaginatedResultCallback<IPresenceMessage>
    ): void | Promise<PaginatedResult<IPresenceMessage>> {
      Logger.logAction(Logger.LOG_MICRO, 'Presence.history()', 'channel = ' + this.channel.name);
      return this._history(params, callback);
    }

    _history(
      params: any,
      callback: PaginatedResultCallback<IPresenceMessage>
    ): void | Promise<PaginatedResult<IPresenceMessage>> {
      /* params and callback are optional; see if params contains the callback */
      if (callback === undefined) {
        if (typeof params == 'function') {
          callback = params;
          params = null;
        } else {
          return Utils.promisify(this, '_history', [params]);
        }
      }

      const rest = this.channel.client,
        format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
        envelope = this.channel.client.http.supportsLinkHeaders ? undefined : format,
        headers = Defaults.defaultGetHeaders(rest.options, { format });

      Utils.mixin(headers, rest.options.headers);

      const options = this.channel.channelOptions;
      new PaginatedResource(rest, this.basePath + '/history', headers, envelope, async function (
        body: any,
        headers: Record<string, string>,
        unpacked?: boolean
      ) {
        return await presenceMessageClass.fromResponseBody(
          body,
          options as CipherOptions,
          unpacked ? undefined : format
        );
      }).get(params, callback);
    }
  };
};

export { presenceClassFactory };
