import Platform from 'common/platform';
import Logger from '../util/logger';
import ErrorInfo from './errorinfo';
import PresenceMessage from './presencemessage';
import * as Utils from '../util/utils';
import { Bufferlike as BrowserBufferlike } from '../../../platform/web/lib/util/bufferutils';
import * as API from '../../../../ably';

import type { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import type { ChannelOptions } from '../../types/channel';
import type { Properties } from '../util/utils';
import type RestChannel from '../client/restchannel';
import type RealtimeChannel from '../client/realtimechannel';
type Channel = RestChannel | RealtimeChannel;

const MessageActionArray: API.MessageAction[] = [
  'message.unset',
  'message.create',
  'message.update',
  'message.delete',
  'annotation.create',
  'annotation.delete',
  'meta.occupancy',
];

const MessageActionMap = new Map<API.MessageAction, number>(MessageActionArray.map((action, index) => [action, index]));

const ReverseMessageActionMap = new Map<number, API.MessageAction>(
  MessageActionArray.map((action, index) => [index, action]),
);

function toMessageActionString(actionNumber: number): API.MessageAction | undefined {
  return ReverseMessageActionMap.get(actionNumber);
}

function toMessageActionNumber(messageAction?: API.MessageAction): number | undefined {
  return messageAction ? MessageActionMap.get(messageAction) : undefined;
}

export type CipherOptions = {
  channelCipher: {
    encrypt: Function;
    algorithm: 'aes';
  };
  cipher?: {
    channelCipher: {
      encrypt: Function;
      algorithm: 'aes';
    };
  };
};

export type EncodingDecodingContext = {
  channelOptions: ChannelOptions;
  plugins: {
    vcdiff?: {
      decode: (delta: Uint8Array, source: Uint8Array) => Uint8Array;
    };
  };
  baseEncodedPreviousPayload?: Buffer | BrowserBufferlike;
};

export type WireProtocolMessage = Omit<Message, 'action'> & { action: number };

function normaliseContext(context: CipherOptions | EncodingDecodingContext | ChannelOptions): EncodingDecodingContext {
  if (!context || !(context as EncodingDecodingContext).channelOptions) {
    return {
      channelOptions: context as ChannelOptions,
      plugins: {},
      baseEncodedPreviousPayload: undefined,
    };
  }
  return context as EncodingDecodingContext;
}

export function normalizeCipherOptions(
  Crypto: IUntypedCryptoStatic | null,
  logger: Logger,
  options: API.ChannelOptions | null,
): ChannelOptions {
  if (options && options.cipher) {
    if (!Crypto) Utils.throwMissingPluginError('Crypto');
    const cipher = Crypto.getCipher(options.cipher, logger);
    return {
      cipher: cipher.cipherParams,
      channelCipher: cipher.cipher,
    };
  }
  return options ?? {};
}

function getMessageSize(msg: Message) {
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
  encoded: WireProtocolMessage,
  inputOptions?: API.ChannelOptions,
): Promise<Message> {
  const msg = fromWireProtocol(encoded);
  const options = normalizeCipherOptions(Crypto, logger, inputOptions ?? null);
  /* if decoding fails at any point, catch and return the message decoded to
   * the fullest extent possible */
  try {
    await decode(msg, options);
  } catch (e) {
    Logger.logAction(logger, Logger.LOG_ERROR, 'Message.fromEncoded()', (e as Error).toString());
  }
  return msg;
}

export async function fromEncodedArray(
  logger: Logger,
  Crypto: IUntypedCryptoStatic | null,
  encodedArray: Array<WireProtocolMessage>,
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
export async function _fromEncoded(encoded: WireProtocolMessage, channel: Channel): Promise<Message> {
  const msg = fromWireProtocol(encoded);
  try {
    await decode(msg, channel.channelOptions);
  } catch (e) {
    Logger.logAction(channel.logger, Logger.LOG_ERROR, 'Message._fromEncoded()', (e as Error).toString());
  }
  return msg;
}

export async function _fromEncodedArray(encodedArray: WireProtocolMessage[], channel: Channel): Promise<Message[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return _fromEncoded(encoded, channel);
    }),
  );
}

async function encrypt<T extends Message | PresenceMessage>(msg: T, options: CipherOptions): Promise<T> {
  let data = msg.data,
    encoding = msg.encoding,
    cipher = options.channelCipher;

  encoding = encoding ? encoding + '/' : '';
  if (!Platform.BufferUtils.isBuffer(data)) {
    data = Platform.BufferUtils.utf8Encode(String(data));
    encoding = encoding + 'utf-8/';
  }
  const ciphertext = await cipher.encrypt(data);
  msg.data = ciphertext;
  msg.encoding = encoding + 'cipher+' + cipher.algorithm;
  return msg;
}

export async function encode<T extends Message | PresenceMessage>(msg: T, options: CipherOptions): Promise<T> {
  const data = msg.data;
  const nativeDataType =
    typeof data == 'string' || Platform.BufferUtils.isBuffer(data) || data === null || data === undefined;

  if (!nativeDataType) {
    if (Utils.isObject(data) || Array.isArray(data)) {
      msg.data = JSON.stringify(data);
      msg.encoding = msg.encoding ? msg.encoding + '/json' : 'json';
    } else {
      throw new ErrorInfo('Data type is unsupported', 40013, 400);
    }
  }

  if (options != null && options.cipher) {
    return encrypt(msg, options);
  } else {
    return msg;
  }
}

export async function encodeArray(messages: Array<Message>, options: CipherOptions): Promise<Array<Message>> {
  return Promise.all(messages.map((message) => encode(message, options)));
}

export const serialize = Utils.encodeBody;

export async function decode(
  message: Message | PresenceMessage,
  inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
): Promise<void> {
  const context = normaliseContext(inputContext);

  let lastPayload = message.data;
  const encoding = message.encoding;
  if (encoding) {
    const xforms = encoding.split('/');
    let lastProcessedEncodingIndex,
      encodingsToProcess = xforms.length,
      data = message.data;

    let xform = '';
    try {
      while ((lastProcessedEncodingIndex = encodingsToProcess) > 0) {
        // eslint-disable-next-line security/detect-unsafe-regex
        const match = xforms[--encodingsToProcess].match(/([-\w]+)(\+([\w-]+))?/);
        if (!match) break;
        xform = match[1];
        switch (xform) {
          case 'base64':
            data = Platform.BufferUtils.base64Decode(String(data));
            if (lastProcessedEncodingIndex == xforms.length) {
              lastPayload = data;
            }
            continue;
          case 'utf-8':
            data = Platform.BufferUtils.utf8Decode(data);
            continue;
          case 'json':
            data = JSON.parse(data);
            continue;
          case 'cipher':
            if (
              context.channelOptions != null &&
              context.channelOptions.cipher &&
              context.channelOptions.channelCipher
            ) {
              const xformAlgorithm = match[3],
                cipher = context.channelOptions.channelCipher;
              /* don't attempt to decrypt unless the cipher params are compatible */
              if (xformAlgorithm != cipher.algorithm) {
                throw new Error('Unable to decrypt message with given cipher; incompatible cipher params');
              }
              data = await cipher.decrypt(data);
              continue;
            } else {
              throw new Error('Unable to decrypt message; not an encrypted channel');
            }
          case 'vcdiff':
            if (!context.plugins || !context.plugins.vcdiff) {
              throw new ErrorInfo('Missing Vcdiff decoder (https://github.com/ably-forks/vcdiff-decoder)', 40019, 400);
            }
            if (typeof Uint8Array === 'undefined') {
              throw new ErrorInfo(
                'Delta decoding not supported on this browser (need ArrayBuffer & Uint8Array)',
                40020,
                400,
              );
            }
            try {
              let deltaBase = context.baseEncodedPreviousPayload;
              if (typeof deltaBase === 'string') {
                deltaBase = Platform.BufferUtils.utf8Encode(deltaBase);
              }

              // vcdiff expects Uint8Arrays, can't copy with ArrayBuffers.
              const deltaBaseBuffer = Platform.BufferUtils.toBuffer(deltaBase as Buffer);
              data = Platform.BufferUtils.toBuffer(data);

              data = Platform.BufferUtils.arrayBufferViewToBuffer(context.plugins.vcdiff.decode(data, deltaBaseBuffer));
              lastPayload = data;
            } catch (e) {
              throw new ErrorInfo('Vcdiff delta decode failed with ' + e, 40018, 400);
            }
            continue;
          default:
            throw new Error('Unknown encoding');
        }
      }
    } catch (e) {
      const err = e as ErrorInfo;
      throw new ErrorInfo(
        'Error processing the ' + xform + ' encoding, decoder returned ‘' + err.message + '’',
        err.code || 40013,
        400,
      );
    } finally {
      message.encoding =
        (lastProcessedEncodingIndex as number) <= 0 ? null : xforms.slice(0, lastProcessedEncodingIndex).join('/');
      message.data = data;
    }
  }
  context.baseEncodedPreviousPayload = lastPayload;
}

export function fromValues(values: Properties<Message>): Message {
  return Object.assign(new Message(), values);
}

export function fromWireProtocol(values: WireProtocolMessage): Message {
  const action = toMessageActionString(values.action as number) || values.action;
  const res = Object.assign(new Message(), { ...values, action });
  res.expandFields();
  return res;
}

export function fromValuesArray(values: Properties<Message>[]): Message[] {
  return values.map(fromValues);
}

/* This should be called on encode()d (and encrypt()d) Messages (as it
 * assumes the data is a string or buffer) */
export function getMessagesSize(messages: Message[]): number {
  let msg,
    total = 0;
  for (let i = 0; i < messages.length; i++) {
    msg = messages[i];
    total += msg.size || (msg.size = getMessageSize(msg));
  }
  return total;
}

class Message {
  name?: string;
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  connectionKey?: string;
  data?: any;
  encoding?: string | null;
  extras?: any;
  size?: number;
  action?: API.MessageAction;
  serial?: string;
  refSerial?: string;
  refType?: string;
  createdAt?: number;
  version?: string;
  operation?: API.Operation;

  /**
   * Overload toJSON() to intercept JSON.stringify()
   * @return {*}
   */
  toJSON() {
    /* encode data to base64 if present and we're returning real JSON;
     * although msgpack calls toJSON(), we know it is a stringify()
     * call if it has a non-empty arguments list */
    let encoding = this.encoding;
    let data = this.data;
    if (data && Platform.BufferUtils.isBuffer(data)) {
      if (arguments.length > 0) {
        /* stringify call */
        encoding = encoding ? encoding + '/base64' : 'base64';
        data = Platform.BufferUtils.base64Encode(data);
      } else {
        /* Called by msgpack. toBuffer returns a datatype understandable by
         * that platform's msgpack implementation (Buffer in node, Uint8Array
         * in browsers) */
        data = Platform.BufferUtils.toBuffer(data);
      }
    }
    return {
      name: this.name,
      id: this.id,
      clientId: this.clientId,
      connectionId: this.connectionId,
      connectionKey: this.connectionKey,
      extras: this.extras,
      serial: this.serial,
      action: toMessageActionNumber(this.action as API.MessageAction) || this.action,
      refSerial: this.refSerial,
      refType: this.refType,
      createdAt: this.createdAt,
      version: this.version,
      operation: this.operation,
      encoding,
      data,
    };
  }

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

  toString(): string {
    let result = '[Message';
    if (this.name) result += '; name=' + this.name;
    if (this.id) result += '; id=' + this.id;
    if (this.timestamp) result += '; timestamp=' + this.timestamp;
    if (this.clientId) result += '; clientId=' + this.clientId;
    if (this.connectionId) result += '; connectionId=' + this.connectionId;
    if (this.encoding) result += '; encoding=' + this.encoding;
    if (this.extras) result += '; extras =' + JSON.stringify(this.extras);
    if (this.data) {
      if (typeof this.data == 'string') result += '; data=' + this.data;
      else if (Platform.BufferUtils.isBuffer(this.data))
        result += '; data (buffer)=' + Platform.BufferUtils.base64Encode(this.data);
      else result += '; data (json)=' + JSON.stringify(this.data);
    }
    if (this.extras) result += '; extras=' + JSON.stringify(this.extras);

    if (this.action) result += '; action=' + this.action;
    if (this.serial) result += '; serial=' + this.serial;
    if (this.version) result += '; version=' + this.version;
    if (this.refSerial) result += '; refSerial=' + this.refSerial;
    if (this.refType) result += '; refType=' + this.refType;
    if (this.createdAt) result += '; createdAt=' + this.createdAt;
    if (this.operation) result += '; operation=' + JSON.stringify(this.operation);
    result += ']';
    return result;
  }
}

export default Message;
