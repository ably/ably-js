import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Presence from './presence';
import Message, { CipherOptions } from '../types/message';
import ErrorInfo from '../types/errorinfo';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import Resource, { ResourceCallback } from './resource';
import { ChannelOptions } from '../../types/channel';
import { PaginatedResultCallback, StandardCallback } from '../../types/utils';
import BaseClient from './baseclient';
import * as API from '../../../../ably';
import Defaults from '../util/defaults';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';

interface RestHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
}

function noop() {}

const MSG_ID_ENTROPY_BYTES = 9;

function allEmptyIds(messages: Array<Message>) {
  return Utils.arrEvery(messages, function (message: Message) {
    return !message.id;
  });
}

function normaliseChannelOptions(Crypto: IUntypedCryptoStatic | null, options?: ChannelOptions) {
  const channelOptions = options || {};
  if (channelOptions.cipher) {
    if (!Crypto) Utils.throwMissingModuleError('Crypto');
    const cipher = Crypto.getCipher(channelOptions.cipher);
    channelOptions.cipher = cipher.cipherParams;
    channelOptions.channelCipher = cipher.cipher;
  } else if ('cipher' in channelOptions) {
    /* Don't deactivate an existing cipher unless options
     * has a 'cipher' key that's falsey */
    channelOptions.cipher = undefined;
    channelOptions.channelCipher = null;
  }
  return channelOptions;
}

class Channel extends EventEmitter {
  client: BaseClient;
  name: string;
  basePath: string;
  private _presence: Presence;
  get presence(): Presence {
    return this._presence;
  }
  channelOptions: ChannelOptions;

  constructor(client: BaseClient, name: string, channelOptions?: ChannelOptions) {
    super();
    Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
    this.client = client;
    this.name = name;
    this.basePath = '/channels/' + encodeURIComponent(name);
    this._presence = new Presence(this);
    this.channelOptions = normaliseChannelOptions(client._Crypto ?? null, channelOptions);
  }

  setOptions(options?: ChannelOptions): void {
    this.channelOptions = normaliseChannelOptions(this.client._Crypto ?? null, options);
  }

  history(
    params: RestHistoryParams | null,
    callback: PaginatedResultCallback<Message>
  ): Promise<PaginatedResult<Message>> | void {
    Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'history', arguments);
      }
    }

    this._history(params, callback);
  }

  _history(params: RestHistoryParams | null, callback: PaginatedResultCallback<Message>): void {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    const options = this.channelOptions;
    new PaginatedResource(client, this.basePath + '/messages', headers, envelope, async function (
      body,
      headers,
      unpacked
    ) {
      return await Message.fromResponseBody(body as Message[], options, client._MsgPack, unpacked ? undefined : format);
    }).get(params as Record<string, unknown>, callback);
  }

  publish(): void | Promise<void> {
    const argCount = arguments.length,
      first = arguments[0],
      second = arguments[1];
    let callback = arguments[argCount - 1];
    let messages: Array<Message>;
    let params: any;

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'publish', arguments);
    }

    if (typeof first === 'string' || first === null) {
      /* (name, data, ...) */
      messages = [Message.fromValues({ name: first, data: second })];
      params = arguments[2];
    } else if (Utils.isObject(first)) {
      messages = [Message.fromValues(first)];
      params = arguments[1];
    } else if (Utils.isArray(first)) {
      messages = Message.fromValuesArray(first);
      params = arguments[1];
    } else {
      throw new ErrorInfo(
        'The single-argument form of publish() expects a message object or an array of message objects',
        40013,
        400
      );
    }

    if (typeof params !== 'object' || !params) {
      /* No params supplied (so after-message argument is just the callback or undefined) */
      params = {};
    }

    const client = this.client,
      options = client.options,
      format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      idempotentRestPublishing = client.options.idempotentRestPublishing,
      headers = Defaults.defaultPostHeaders(client.options, { format });

    Utils.mixin(headers, options.headers);

    if (idempotentRestPublishing && allEmptyIds(messages)) {
      const msgIdBase = Utils.randomString(MSG_ID_ENTROPY_BYTES);
      Utils.arrForEach(messages, function (message, index) {
        message.id = msgIdBase + ':' + index.toString();
      });
    }

    Message.encodeArray(messages, this.channelOptions as CipherOptions, (err: Error) => {
      if (err) {
        callback(err);
        return;
      }

      /* RSL1i */
      const size = Message.getMessagesSize(messages),
        maxMessageSize = options.maxMessageSize;
      if (size > maxMessageSize) {
        callback(
          new ErrorInfo(
            'Maximum size of messages that can be published at once exceeded ( was ' +
              size +
              ' bytes; limit is ' +
              maxMessageSize +
              ' bytes)',
            40009,
            400
          )
        );
        return;
      }

      this._publish(Message.serialize(messages, client._MsgPack, format), headers, params, callback);
    });
  }

  _publish(requestBody: unknown, headers: Record<string, string>, params: any, callback: ResourceCallback): void {
    Resource.post(this.client, this.basePath + '/messages', requestBody, headers, params, null, callback);
  }

  status(callback?: StandardCallback<API.Types.ChannelDetails>): void | Promise<API.Types.ChannelDetails> {
    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'status', []);
    }

    const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Defaults.defaultPostHeaders(this.client.options, { format });

    Resource.get<API.Types.ChannelDetails>(this.client, this.basePath, headers, {}, format, callback || noop);
  }
}

export default Channel;
