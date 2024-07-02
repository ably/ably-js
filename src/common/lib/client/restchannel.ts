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
import Resource from './resource';
import { ChannelOptions } from '../../types/channel';
import BaseRest from './baseclient';
import * as API from '../../../../ably';
import Defaults, { normaliseChannelOptions } from '../util/defaults';
import { RestHistoryParams } from './restchannelmixin';
import { RequestBody } from 'common/types/http';
import type { PushChannel } from 'plugins/push';

const MSG_ID_ENTROPY_BYTES = 9;

function allEmptyIds(messages: Array<Message>) {
  return messages.every(function (message: Message) {
    return !message.id;
  });
}

class RestChannel {
  client: BaseRest;
  name: string;
  presence: RestPresence;
  channelOptions: ChannelOptions;
  _push?: PushChannel;

  constructor(client: BaseRest, name: string, channelOptions?: ChannelOptions) {
    Logger.logAction(client.logger, Logger.LOG_MINOR, 'RestChannel()', 'started; name = ' + name);
    this.name = name;
    this.client = client;
    this.presence = new RestPresence(this);
    this.channelOptions = normaliseChannelOptions(client._Crypto ?? null, this.logger, channelOptions);
    if (client.options.plugins?.Push) {
      this._push = new client.options.plugins.Push.PushChannel(this);
    }
  }

  get push() {
    if (!this._push) {
      Utils.throwMissingPluginError('Push');
    }
    return this._push;
  }

  get logger(): Logger {
    return this.client.logger;
  }

  setOptions(options?: ChannelOptions): void {
    this.channelOptions = normaliseChannelOptions(this.client._Crypto ?? null, this.logger, options);
  }

  async history(params: RestHistoryParams | null): Promise<PaginatedResult<Message>> {
    Logger.logAction(this.logger, Logger.LOG_MICRO, 'RestChannel.history()', 'channel = ' + this.name);
    return this.client.rest.channelMixin.history(this, params);
  }

  async publish(...args: any[]): Promise<void> {
    const first = args[0],
      second = args[1];
    let messages: Array<Message>;
    let params: any;

    if (typeof first === 'string' || first === null) {
      /* (name, data, ...) */
      messages = [messageFromValues({ name: first, data: second })];
      params = args[2];
    } else if (Utils.isObject(first)) {
      messages = [messageFromValues(first)];
      params = args[1];
    } else if (Array.isArray(first)) {
      messages = messagesFromValuesArray(first);
      params = args[1];
    } else {
      throw new ErrorInfo(
        'The single-argument form of publish() expects a message object or an array of message objects',
        40013,
        400,
      );
    }

    if (!params) {
      /* No params supplied */
      params = {};
    }

    const client = this.client,
      options = client.options,
      format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      idempotentRestPublishing = client.options.idempotentRestPublishing,
      headers = Defaults.defaultPostHeaders(client.options, { format });

    Utils.mixin(headers, options.headers);

    if (idempotentRestPublishing && allEmptyIds(messages)) {
      const msgIdBase = await Utils.randomString(MSG_ID_ENTROPY_BYTES);
      messages.forEach(function (message, index) {
        message.id = msgIdBase + ':' + index.toString();
      });
    }

    await encodeMessagesArray(messages, this.channelOptions as CipherOptions);

    /* RSL1i */
    const size = getMessagesSize(messages),
      maxMessageSize = options.maxMessageSize;
    if (size > maxMessageSize) {
      throw new ErrorInfo(
        'Maximum size of messages that can be published at once exceeded ( was ' +
          size +
          ' bytes; limit is ' +
          maxMessageSize +
          ' bytes)',
        40009,
        400,
      );
    }

    await this._publish(serializeMessage(messages, client._MsgPack, format), headers, params);
  }

  async _publish(requestBody: RequestBody | null, headers: Record<string, string>, params: any): Promise<void> {
    await Resource.post(
      this.client,
      this.client.rest.channelMixin.basePath(this) + '/messages',
      requestBody,
      headers,
      params,
      null,
      true,
    );
  }

  async status(): Promise<API.ChannelDetails> {
    return this.client.rest.channelMixin.status(this);
  }
}

export default RestChannel;
