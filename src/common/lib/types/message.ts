import Logger from '../util/logger';
import {
  BaseMessage,
  encode,
  decode,
  wireToJSON,
  normalizeCipherOptions,
  EncodingDecodingContext,
  CipherOptions,
  strMsg,
} from './basemessage';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';

import type { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import type { ChannelOptions } from '../../types/channel';
import type { Properties } from '../util/utils';
import type RestChannel from '../client/restchannel';
import type RealtimeChannel from '../client/realtimechannel';
import type ErrorInfo from './errorinfo';
type Channel = RestChannel | RealtimeChannel;

const actions: API.MessageAction[] = ['message.create', 'message.update', 'message.delete', 'meta', 'message.summary'];

function stringifyAction(action: number | undefined): string {
  return actions[action || 0] || 'unknown';
}

function getMessageSize(msg: WireMessage) {
  let size = 0;
  if (msg.name) {
    size += msg.name.length;
  }
  if (msg.clientId) {
    size += msg.clientId.length;
  }
  if (msg.extras) {
    size += JSON.stringify(msg.extras).length;
  }
  if (msg.data) {
    size += Utils.dataSizeBytes(msg.data);
  }
  return size;
}

export async function fromEncoded(
  logger: Logger,
  Crypto: IUntypedCryptoStatic | null,
  encoded: Properties<WireMessage>,
  inputOptions?: API.ChannelOptions,
): Promise<Message> {
  const options = normalizeCipherOptions(Crypto, logger, inputOptions ?? null);
  const wm = WireMessage.fromValues(encoded);
  return wm.decode(options, logger);
}

export async function fromEncodedArray(
  logger: Logger,
  Crypto: IUntypedCryptoStatic | null,
  encodedArray: Array<WireMessage>,
  options?: API.ChannelOptions,
): Promise<Message[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return fromEncoded(logger, Crypto, encoded, options);
    }),
  );
}

// these forms of the functions are used internally when we have a channel instance
// already, so don't need to normalise channel options
export async function _fromEncoded(encoded: Properties<WireMessage>, channel: Channel): Promise<Message> {
  const wm = WireMessage.fromValues(encoded);
  return wm.decode(channel.channelOptions, channel.logger);
}

export async function _fromEncodedArray(encodedArray: Properties<WireMessage>[], channel: Channel): Promise<Message[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return _fromEncoded(encoded, channel);
    }),
  );
}

export async function encodeArray(messages: Array<Message>, options: CipherOptions): Promise<Array<WireMessage>> {
  return Promise.all(messages.map((message) => message.encode(options)));
}

export const serialize = Utils.encodeBody;

/* This should be called on encode()d (and encrypt()d) Messages (as it
 * assumes the data is a string or buffer) */
export function getMessagesSize(messages: WireMessage[]): number {
  let msg,
    total = 0;
  for (let i = 0; i < messages.length; i++) {
    msg = messages[i];
    total += msg.size || (msg.size = getMessageSize(msg));
  }
  return total;
}

class Message extends BaseMessage {
  name?: string;
  connectionKey?: string;
  action?: API.MessageAction;
  serial?: string;
  refSerial?: string;
  refType?: string;
  createdAt?: number;
  version?: string;
  operation?: API.Operation;
  summary?: any; // TODO improve typings after summary structure is finalised

  expandFields() {
    if (this.action === 'message.create') {
      // TM2k
      if (this.version && !this.serial) {
        this.serial = this.version;
      }
      // TM2o
      if (this.timestamp && !this.createdAt) {
        this.createdAt = this.timestamp;
      }
    }
  }

  async encode(options: CipherOptions): Promise<WireMessage> {
    const res = Object.assign(new WireMessage(), this, {
      action: actions.indexOf(this.action || 'message.create'),
    });
    return encode(res, options);
  }

  static fromValues(values: Properties<Message>): Message {
    return Object.assign(new Message(), values);
  }

  static fromValuesArray(values: Properties<Message>[]): Message[] {
    return values.map((v) => Message.fromValues(v));
  }

  toString() {
    return strMsg(this, 'Message');
  }
}

export class WireMessage extends BaseMessage {
  name?: string;
  connectionKey?: string;
  action?: number;
  serial?: string;
  refSerial?: string;
  refType?: string;
  createdAt?: number;
  version?: string;
  operation?: API.Operation;
  summary?: any;

  // Overload toJSON() to intercept JSON.stringify()
  toJSON(...args: any[]) {
    return wireToJSON.call(this, ...args);
  }

  static fromValues(values: Properties<WireMessage>): WireMessage {
    return Object.assign(new WireMessage(), values);
  }

  static fromValuesArray(values: Properties<WireMessage>[]): WireMessage[] {
    return values.map((v) => WireMessage.fromValues(v));
  }

  // for contexts where some decoding errors need to be handled specially by the caller
  async decodeWithErr(
    inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
    logger: Logger,
  ): Promise<{ decoded: Message; err: ErrorInfo | undefined }> {
    const res: Message = Object.assign(new Message(), {
      ...this,
      action: stringifyAction(this.action),
    });
    let err: ErrorInfo | undefined;
    try {
      await decode(res, inputContext);
    } catch (e) {
      Logger.logAction(logger, Logger.LOG_ERROR, 'WireMessage.decode()', Utils.inspectError(e));
      err = e as ErrorInfo;
    }
    res.expandFields();
    return { decoded: res, err: err };
  }

  async decode(
    inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
    logger: Logger,
  ): Promise<Message> {
    const { decoded } = await this.decodeWithErr(inputContext, logger);
    return decoded;
  }

  toString() {
    return strMsg(this, 'WireMessage');
  }
}

export default Message;
