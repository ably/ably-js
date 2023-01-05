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
import Rest from './rest';
import Realtime from './realtime';
import * as API from '../../../../ably';
import Platform from 'common/platform';

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

function normaliseChannelOptions(options?: ChannelOptions) {
  const channelOptions = options || {};
  if (channelOptions.cipher) {
    if (!Platform.Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
    const cipher = Platform.Crypto.getCipher(channelOptions.cipher);
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
  rest: Rest | Realtime;
  name: string;
  basePath: string;
  presence: Presence;
  channelOptions: ChannelOptions;

  constructor(rest: Rest | Realtime, name: string, channelOptions?: ChannelOptions) {
    super();
    Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
    this.rest = rest;
    this.name = name;
    this.basePath = '/channels/' + encodeURIComponent(name);
    this.presence = new Presence(this);
    this.channelOptions = normaliseChannelOptions(channelOptions);
  }

  setOptions(options?: ChannelOptions): void {
    this.channelOptions = normaliseChannelOptions(options);
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
        if (this.rest.options.promises) {
          return Utils.promisify(this, 'history', arguments);
        }
        callback = noop;
      }
    }

    this._history(params, callback);
  }

  _history(params: RestHistoryParams | null, callback: PaginatedResultCallback<Message>): void {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    const options = this.channelOptions;
    new PaginatedResource(rest, this.basePath + '/messages', headers, envelope, function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return Message.fromResponseBody(body, options, unpacked ? undefined : format);
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
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'publish', arguments);
      }
      callback = noop;
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

    const rest = this.rest,
      options = rest.options,
      format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      idempotentRestPublishing = rest.options.idempotentRestPublishing,
      headers = Utils.defaultPostHeaders(rest.options, format);

    if (options.headers) Utils.mixin(headers, options.headers);

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

      this._publish(Message.serialize(messages, format), headers, params, callback);
    });
  }

  _publish(requestBody: unknown, headers: Record<string, string>, params: any, callback: ResourceCallback): void {
    Resource.post(this.rest, this.basePath + '/messages', requestBody, headers, params, null, callback);
  }

  status(callback?: StandardCallback<API.Types.ChannelDetails>): void | Promise<API.Types.ChannelDetails> {
    if (typeof callback !== 'function' && this.rest.options.promises) {
      return Utils.promisify(this, 'status', []);
    }

    const format = this.rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    const headers = Utils.defaultPostHeaders(this.rest.options, format);

    Resource.get<API.Types.ChannelDetails>(this.rest, this.basePath, headers, {}, format, callback || noop);
  }
}

export default Channel;
