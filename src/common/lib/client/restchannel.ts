import * as Utils from '../util/utils';
import Logger from '../util/logger';
import RestPresence from './restpresence';
import Message, {
  fromValues as messageFromValues,
  fromValuesArray as messagesFromValuesArray,
  encodeArray as encodeMessagesArray,
  serialize as serializeMessage,
  getMessagesSize,
  CipherOptions,
} from '../types/message';
import ErrorInfo from '../types/errorinfo';
import { PaginatedResult } from './paginatedresource';
import Resource, { ResourceCallback } from './resource';
import { ChannelOptions } from '../../types/channel';
import { PaginatedResultCallback, StandardCallback } from '../../types/utils';
import BaseRest from './baseclient';
import * as API from '../../../../ably';
import Defaults, { normaliseChannelOptions } from '../util/defaults';
import { RestHistoryParams } from './restchannelmixin';

const MSG_ID_ENTROPY_BYTES = 9;

function allEmptyIds(messages: Array<Message>) {
  return Utils.arrEvery(messages, function (message: Message) {
    return !message.id;
  });
}

class RestChannel {
  client: BaseRest;
  name: string;
  presence: RestPresence;
  channelOptions: ChannelOptions;

  constructor(client: BaseRest, name: string, channelOptions?: ChannelOptions) {
    Logger.logAction(Logger.LOG_MINOR, 'RestChannel()', 'started; name = ' + name);
    this.name = name;
    this.client = client;
    this.presence = new RestPresence(this);
    this.channelOptions = normaliseChannelOptions(client._Crypto ?? null, channelOptions);
  }

  setOptions(options?: ChannelOptions): void {
    this.channelOptions = normaliseChannelOptions(this.client._Crypto ?? null, options);
  }

  history(
    params: RestHistoryParams | null,
    callback: PaginatedResultCallback<Message>
  ): Promise<PaginatedResult<Message>> | void {
    Logger.logAction(Logger.LOG_MICRO, 'RestChannel.history()', 'channel = ' + this.name);
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'history', arguments);
      }
    }

    this.client.rest.channelMixin.history(this, params, callback);
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
      messages = [messageFromValues({ name: first, data: second })];
      params = arguments[2];
    } else if (Utils.isObject(first)) {
      messages = [messageFromValues(first)];
      params = arguments[1];
    } else if (Utils.isArray(first)) {
      messages = messagesFromValuesArray(first);
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

    encodeMessagesArray(messages, this.channelOptions as CipherOptions, (err: Error) => {
      if (err) {
        callback(err);
        return;
      }

      /* RSL1i */
      const size = getMessagesSize(messages),
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

      this._publish(serializeMessage(messages, client._MsgPack, format), headers, params, callback);
    });
  }

  _publish(requestBody: unknown, headers: Record<string, string>, params: any, callback: ResourceCallback): void {
    Resource.post(
      this.client,
      this.client.rest.channelMixin.basePath(this) + '/messages',
      requestBody,
      headers,
      params,
      null,
      callback
    );
  }

  status(callback?: StandardCallback<API.Types.ChannelDetails>): void | Promise<API.Types.ChannelDetails> {
    return this.client.rest.channelMixin.status(this, callback);
  }
}

export default RestChannel;
