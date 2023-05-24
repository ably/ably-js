import Platform from 'common/platform';
import Logger from '../util/logger';
import ErrorInfo from './errorinfo';
import { ChannelOptions } from '../../types/channel';
import PresenceMessage from './presencemessage';
import * as Utils from '../util/utils';
import { Bufferlike as BrowserBufferlike } from '../../../platform/web/lib/util/bufferutils';
import * as API from '../../../../ably';

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

type EncodingDecodingContext = {
  channelOptions: ChannelOptions;
  plugins: {
    vcdiff?: {
      encrypt: Function;
      decode: Function;
    };
  };
  baseEncodedPreviousPayload?: Buffer | BrowserBufferlike;
};

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

function normalizeCipherOptions(options: API.Types.ChannelOptions | null): ChannelOptions {
  if (options && options.cipher) {
    if (!Platform.Crypto) throw new Error('Encryption not enabled; use ably.encryption.js instead');
    const cipher = Platform.Crypto.getCipher(options.cipher);
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
      encoding,
      data,
    };
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
    result += ']';
    return result;
  }

  static encrypt(msg: Message | PresenceMessage, options: CipherOptions, callback: Function) {
    let data = msg.data,
      encoding = msg.encoding,
      cipher = options.channelCipher;

    encoding = encoding ? encoding + '/' : '';
    if (!Platform.BufferUtils.isBuffer(data)) {
      data = Platform.BufferUtils.utf8Encode(String(data));
      encoding = encoding + 'utf-8/';
    }
    cipher.encrypt(data, function (err: Error, data: unknown) {
      if (err) {
        callback(err);
        return;
      }
      msg.data = data;
      msg.encoding = encoding + 'cipher+' + cipher.algorithm;
      callback(null, msg);
    });
  }

  static encode(msg: Message | PresenceMessage, options: CipherOptions, callback: Function): void {
    const data = msg.data;
    const nativeDataType =
      typeof data == 'string' || Platform.BufferUtils.isBuffer(data) || data === null || data === undefined;

    if (!nativeDataType) {
      if (Utils.isObject(data) || Utils.isArray(data)) {
        msg.data = JSON.stringify(data);
        msg.encoding = msg.encoding ? msg.encoding + '/json' : 'json';
      } else {
        throw new ErrorInfo('Data type is unsupported', 40013, 400);
      }
    }

    if (options != null && options.cipher) {
      Message.encrypt(msg, options, callback);
    } else {
      callback(null, msg);
    }
  }

  static encodeArray(messages: Array<Message>, options: CipherOptions, callback: Function): void {
    let processed = 0;
    for (let i = 0; i < messages.length; i++) {
      Message.encode(messages[i], options, function (err: Error) {
        if (err) {
          callback(err);
          return;
        }
        processed++;
        if (processed == messages.length) {
          callback(null, messages);
        }
      });
    }
  }

  static serialize = Utils.encodeBody;

  static decode(
    message: Message | PresenceMessage,
    inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions
  ): void {
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
                data = cipher.decrypt(data);
                continue;
              } else {
                throw new Error('Unable to decrypt message; not an encrypted channel');
              }
            case 'vcdiff':
              if (!context.plugins || !context.plugins.vcdiff) {
                throw new ErrorInfo(
                  'Missing Vcdiff decoder (https://github.com/ably-forks/vcdiff-decoder)',
                  40019,
                  400
                );
              }
              if (typeof Uint8Array === 'undefined') {
                throw new ErrorInfo(
                  'Delta decoding not supported on this browser (need ArrayBuffer & Uint8Array)',
                  40020,
                  400
                );
              }
              try {
                let deltaBase = context.baseEncodedPreviousPayload;
                if (typeof deltaBase === 'string') {
                  deltaBase = Platform.BufferUtils.utf8Encode(deltaBase);
                }

                /* vcdiff expects Uint8Arrays, can't copy with ArrayBuffers. (also, if we
                 * don't have a TextDecoder, deltaBase might be a WordArray here, so need
                 * to process it into a buffer anyway) */
                deltaBase = Platform.BufferUtils.toBuffer(deltaBase as Buffer);
                data = Platform.BufferUtils.toBuffer(data);

                data = Platform.BufferUtils.typedArrayToBuffer(context.plugins.vcdiff.decode(data, deltaBase));
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
          400
        );
      } finally {
        message.encoding =
          (lastProcessedEncodingIndex as number) <= 0 ? null : xforms.slice(0, lastProcessedEncodingIndex).join('/');
        message.data = data;
      }
    }
    context.baseEncodedPreviousPayload = lastPayload;
  }

  static fromResponseBody(
    body: Array<Message>,
    options: ChannelOptions | EncodingDecodingContext,
    format?: Utils.Format
  ): Message[] {
    if (format) {
      body = Utils.decodeBody(body, format);
    }

    for (let i = 0; i < body.length; i++) {
      const msg = (body[i] = Message.fromValues(body[i]));
      try {
        Message.decode(msg, options);
      } catch (e) {
        Logger.logAction(Logger.LOG_ERROR, 'Message.fromResponseBody()', (e as Error).toString());
      }
    }
    return body;
  }

  static fromValues(values: unknown): Message {
    return Object.assign(new Message(), values);
  }

  static fromValuesArray(values: unknown[]): Message[] {
    const count = values.length,
      result = new Array(count);
    for (let i = 0; i < count; i++) result[i] = Message.fromValues(values[i]);
    return result;
  }

  static fromEncoded(encoded: unknown, inputOptions?: API.Types.ChannelOptions): Message {
    const msg = Message.fromValues(encoded);
    const options = normalizeCipherOptions(inputOptions ?? null);
    /* if decoding fails at any point, catch and return the message decoded to
     * the fullest extent possible */
    try {
      Message.decode(msg, options);
    } catch (e) {
      Logger.logAction(Logger.LOG_ERROR, 'Message.fromEncoded()', (e as Error).toString());
    }
    return msg;
  }

  static fromEncodedArray(encodedArray: Array<unknown>, options?: API.Types.ChannelOptions): Message[] {
    return encodedArray.map(function (encoded) {
      return Message.fromEncoded(encoded, options);
    });
  }

  /* This should be called on encode()d (and encrypt()d) Messages (as it
   * assumes the data is a string or buffer) */
  static getMessagesSize(messages: Message[]): number {
    let msg,
      total = 0;
    for (let i = 0; i < messages.length; i++) {
      msg = messages[i];
      total += msg.size || (msg.size = getMessageSize(msg));
    }
    return total;
  }
}

export default Message;
