import Platform from 'common/platform';
import Logger from '../util/logger';
import ErrorInfo from './errorinfo';
import * as Utils from '../util/utils';
import { Bufferlike as BrowserBufferlike } from '../../../platform/web/lib/util/bufferutils';
import * as API from '../../../../ably';
import { actions } from './protocolmessagecommon';

import type { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import type { ChannelOptions } from '../../types/channel';
import type ProtocolMessage from './protocolmessage';

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

async function encrypt<T extends BaseMessage>(msg: T, options: CipherOptions): Promise<T> {
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

export async function encode<T extends BaseMessage>(msg: T, options: unknown): Promise<T> {
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

  if (options != null && (options as CipherOptions).cipher) {
    return encrypt(msg, options as CipherOptions);
  } else {
    return msg;
  }
}

export async function decode<T extends BaseMessage>(
  message: T,
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

export function wireToJSON(this: BaseMessage, ...args: any[]): any {
  /* encode data to base64 if present and we're returning real JSON;
   * although msgpack calls toJSON(), we know it is a stringify()
   * call if it has a non-empty arguments list */
  let encoding = this.encoding;
  let data = this.data;
  if (data && Platform.BufferUtils.isBuffer(data)) {
    if (args.length > 0) {
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
  return Object.assign({}, this, { encoding, data });
}

// in-place, generally called on the protocol message before decoding
export function populateFieldsFromParent(parent: ProtocolMessage) {
  const { id, connectionId, timestamp } = parent;

  let msgs: BaseMessage[];
  switch (parent.action) {
    case actions.MESSAGE: {
      msgs = parent.messages!;
      break;
    }
    case actions.PRESENCE:
    case actions.SYNC:
      msgs = parent.presence!;
      break;
    case actions.ANNOTATION:
      msgs = parent.annotations!;
      break;
    default:
      throw new ErrorInfo('Unexpected action ' + parent.action, 40000, 400);
  }

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (!msg.connectionId) {
      msg.connectionId = connectionId;
    }
    if (!msg.timestamp) {
      msg.timestamp = timestamp;
    }
    if (id && !msg.id) {
      msg.id = id + ':' + i;
    }
  }
}

export function strMsg(m: any, cls: string) {
  let result = '[' + cls;
  for (const attr in m) {
    if (attr === 'data') {
      if (typeof m.data == 'string') {
        result += '; data=' + m.data;
      } else if (Platform.BufferUtils.isBuffer(m.data)) {
        result += '; data (buffer)=' + Platform.BufferUtils.base64Encode(m.data);
      } else {
        result += '; data (json)=' + JSON.stringify(m.data);
      }
    } else if (attr && (attr === 'extras' || attr === 'operation')) {
      result += '; ' + attr + '=' + JSON.stringify(m[attr]);
    } else if (m[attr] !== undefined) {
      result += '; ' + attr + '=' + m[attr];
    }
  }
  result += ']';
  return result;
}

export abstract class BaseMessage {
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  data?: any;
  encoding?: string | null;
  extras?: any;
  size?: number;
}
