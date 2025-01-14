import Platform from 'common/platform';
import Logger from '../util/logger';
import ErrorInfo from './errorinfo';
import { ChannelOptions } from '../../types/channel';
import PresenceMessage from './presencemessage';
import * as Utils from '../util/utils';
import { Bufferlike as BrowserBufferlike } from '../../../platform/web/lib/util/bufferutils';
import * as API from '../../../../ably';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';

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

function normalizeCipherOptions(
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
  encoded: unknown,
  inputOptions?: API.ChannelOptions,
): Promise<Message> {
  const msg = fromValues(encoded as Message | Record<string, unknown>, { stringifyAction: true });
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
  encodedArray: Array<unknown>,
  options?: API.ChannelOptions,
): Promise<Message[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return fromEncoded(logger, Crypto, encoded, options);
    }),
  );
}

async function encrypt<T extends Message | PresenceMessage>(msg: T, cipherOptions: CipherOptions): Promise<T> {
  const { data, encoding } = await encryptData(msg.data, msg.encoding, cipherOptions);
  msg.data = data;
  msg.encoding = encoding;
  return msg;
}

export async function encryptData(
  data: any,
  encoding: string | null | undefined,
  cipherOptions: CipherOptions,
): Promise<{ data: any; encoding: string | null | undefined }> {
  let cipher = cipherOptions.channelCipher;
  let dataToEncrypt = data;
  let finalEncoding = encoding ? encoding + '/' : '';

  if (!Platform.BufferUtils.isBuffer(dataToEncrypt)) {
    dataToEncrypt = Platform.BufferUtils.utf8Encode(String(dataToEncrypt));
    finalEncoding = finalEncoding + 'utf-8/';
  }

  const ciphertext = await cipher.encrypt(dataToEncrypt);
  finalEncoding = finalEncoding + 'cipher+' + cipher.algorithm;

  return {
    data: ciphertext,
    encoding: finalEncoding,
  };
}

/**
 * Protocol agnostic encoding and encryption of the message's payload. Mutates the message.
 * Implements RSL4 (only parts that are common for all protocols), and RSL5.
 *
 * Since this encoding function is protocol agnostic, it won't apply the final encodings
 * required by the protocol used by the client (like encoding binary data to the appropriate representation).
 */
export async function encode<T extends Message | PresenceMessage>(msg: T, cipherOptions: CipherOptions): Promise<T> {
  const { data, encoding } = encodeData(msg.data, msg.encoding);
  msg.data = data;
  msg.encoding = encoding;

  if (cipherOptions != null && cipherOptions.cipher) {
    return encrypt(msg, cipherOptions);
  } else {
    return msg;
  }
}

/**
 * Protocol agnostic encoding of the provided payload data. Implements RSL4 (only parts that are common for all protocols).
 */
export function encodeData(
  data: any,
  encoding: string | null | undefined,
): { data: any; encoding: string | null | undefined } {
  // RSL4a, supported types
  const nativeDataType =
    typeof data == 'string' || Platform.BufferUtils.isBuffer(data) || data === null || data === undefined;

  if (nativeDataType) {
    // nothing to do with the native data types at this point
    return {
      data,
      encoding,
    };
  }

  if (Utils.isObject(data) || Array.isArray(data)) {
    // RSL4c3 and RSL4d3, encode objects and arrays as strings
    return {
      data: JSON.stringify(data),
      encoding: encoding ? encoding + '/json' : 'json',
    };
  }

  // RSL4a, throw an error for unsupported types
  throw new ErrorInfo('Data type is unsupported', 40013, 400);
}

/**
 * Prepares the payload data to be transmitted over the wire to Ably.
 * Encodes the data depending on the selected protocol format.
 *
 * Implements RSL4c1 and RSL4d1
 */
export function encodeDataForWireProtocol(
  data: any,
  encoding: string | null | undefined,
  format: Utils.Format,
): { data: any; encoding: string | null | undefined } {
  if (!data || !Platform.BufferUtils.isBuffer(data)) {
    // no transformation required for non-buffer payloads
    return {
      data,
      encoding,
    };
  }

  if (format === Utils.Format.msgpack) {
    // RSL4c1
    // BufferUtils.toBuffer returns a datatype understandable by that platform's msgpack implementation:
    // Buffer in node, Uint8Array in browsers
    return {
      data: Platform.BufferUtils.toBuffer(data),
      encoding,
    };
  }

  // RSL4d1, encode binary payload as base64 string
  return {
    data: Platform.BufferUtils.base64Encode(data),
    encoding: encoding ? encoding + '/base64' : 'base64',
  };
}

export async function encodeArray(messages: Array<Message>, options: CipherOptions): Promise<Array<Message>> {
  return Promise.all(messages.map((message) => encode(message, options)));
}

export const serialize = Utils.encodeBody;

export async function decode(
  message: Message | PresenceMessage,
  inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
): Promise<void> {
  // data can be decoded partially and throw an error on a later decoding step.
  // so we need to reassign the data and encoding values we got, and only then throw an error if there is one
  const { data, encoding, error } = await decodeData(message.data, message.encoding, inputContext);
  message.data = data;
  message.encoding = encoding;

  if (error) {
    throw error;
  }
}

/**
 * Implements RSL6
 */
export async function decodeData(
  data: any,
  encoding: string | null | undefined,
  inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
): Promise<{
  error?: ErrorInfo;
  data: any;
  encoding: string | null | undefined;
}> {
  const context = normaliseContext(inputContext);
  let lastPayload = data;
  let decodedData = data;
  let finalEncoding = encoding;
  let decodingError: ErrorInfo | undefined;

  if (encoding) {
    const xforms = encoding.split('/');
    let lastProcessedEncodingIndex;
    let encodingsToProcess = xforms.length;
    let xform = '';

    try {
      while ((lastProcessedEncodingIndex = encodingsToProcess) > 0) {
        // eslint-disable-next-line security/detect-unsafe-regex
        const match = xforms[--encodingsToProcess].match(/([-\w]+)(\+([\w-]+))?/);
        if (!match) break;
        xform = match[1];
        switch (xform) {
          case 'base64':
            decodedData = Platform.BufferUtils.base64Decode(String(decodedData));
            if (lastProcessedEncodingIndex == xforms.length) {
              lastPayload = decodedData;
            }
            continue;
          case 'utf-8':
            decodedData = Platform.BufferUtils.utf8Decode(decodedData);
            continue;
          case 'json':
            decodedData = JSON.parse(decodedData);
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
              decodedData = await cipher.decrypt(decodedData);
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
              decodedData = Platform.BufferUtils.toBuffer(decodedData);

              decodedData = Platform.BufferUtils.arrayBufferViewToBuffer(
                context.plugins.vcdiff.decode(decodedData, deltaBaseBuffer),
              );
              lastPayload = decodedData;
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
      decodingError = new ErrorInfo(
        `Error processing the ${xform} encoding, decoder returned ‘${err.message}’`,
        err.code || 40013,
        400,
      );
    } finally {
      finalEncoding =
        (lastProcessedEncodingIndex as number) <= 0 ? null : xforms.slice(0, lastProcessedEncodingIndex).join('/');
    }
  }

  if (decodingError) {
    return {
      error: decodingError,
      data: decodedData,
      encoding: finalEncoding,
    };
  }

  context.baseEncodedPreviousPayload = lastPayload;
  return {
    data: decodedData,
    encoding: finalEncoding,
  };
}

export async function fromResponseBody(
  body: Array<Message>,
  options: ChannelOptions | EncodingDecodingContext,
  logger: Logger,
  MsgPack: MsgPack | null,
  format?: Utils.Format,
): Promise<Message[]> {
  if (format) {
    body = Utils.decodeBody(body, MsgPack, format);
  }

  for (let i = 0; i < body.length; i++) {
    const msg = (body[i] = fromValues(body[i], { stringifyAction: true }));
    try {
      await decode(msg, options);
    } catch (e) {
      Logger.logAction(logger, Logger.LOG_ERROR, 'Message.fromResponseBody()', (e as Error).toString());
    }
  }
  return body;
}

export function fromValues(
  values: Message | Record<string, unknown>,
  options?: { stringifyAction?: boolean },
): Message {
  const stringifyAction = options?.stringifyAction;
  if (stringifyAction) {
    const action = toMessageActionString(values.action as number) || values.action;
    return Object.assign(new Message(), { ...values, action });
  }
  return Object.assign(new Message(), values);
}

export function fromValuesArray(values: unknown[]): Message[] {
  const count = values.length,
    result = new Array(count);
  for (let i = 0; i < count; i++) result[i] = fromValues(values[i] as Record<string, unknown>);
  return result;
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

export const MessageEncoding = {
  encryptData,
  encodeData,
  encodeDataForWireProtocol,
  decodeData,
};

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
  action?: API.MessageAction | number;
  serial?: string;
  refSerial?: string;
  refType?: string;
  updatedAt?: number;
  updateSerial?: string;
  operation?: API.Operation;

  /**
   * Overload toJSON() to intercept JSON.stringify().
   *
   * This will prepare the message to be transmitted over the wire to Ably.
   * It will encode the data payload according to the wire protocol used on the client.
   * It will transform any client-side enum string representations into their corresponding numbers, if needed (like "action" fields).
   */
  toJSON() {
    // we can infer the format used by client by inspecting with what arguments this method was called.
    // if JSON protocol is being used, the JSON.stringify() will be called and this toJSON() method will have a non-empty arguments list.
    // MSGPack protocol implementation also calls toJSON(), but with an empty arguments list.
    const format = arguments.length > 0 ? Utils.Format.json : Utils.Format.msgpack;
    const { data, encoding } = encodeDataForWireProtocol(this.data, this.encoding, format);

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
      updatedAt: this.updatedAt,
      updateSerial: this.updateSerial,
      operation: this.operation,
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

    if (this.action) result += '; action=' + this.action;
    if (this.serial) result += '; serial=' + this.serial;
    if (this.refSerial) result += '; refSerial=' + this.refSerial;
    if (this.refType) result += '; refType=' + this.refType;
    if (this.updatedAt) result += '; updatedAt=' + this.updatedAt;
    if (this.updateSerial) result += '; updateSerial=' + this.updateSerial;
    if (this.operation) result += '; operation=' + JSON.stringify(this.operation);
    result += ']';
    return result;
  }
}

export default Message;
