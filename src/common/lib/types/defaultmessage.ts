import Message, {
  CipherOptions,
  fromEncoded,
  fromEncodedArray,
  encode,
  decode,
  EncodingDecodingContext,
} from './message';
import * as API from '../../../../ably';
import Platform from 'common/platform';
import PresenceMessage from './presencemessage';
import { ChannelOptions } from 'common/types/channel';
import Logger from '../util/logger';

/**
 `DefaultMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Message` static property. It introduces the static methods described in the `MessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultMessage extends Message {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<Message> {
    return fromEncoded(Logger.defaultLogger, Platform.Crypto, encoded, inputOptions);
  }

  static async fromEncodedArray(encodedArray: Array<unknown>, options?: API.ChannelOptions): Promise<Message[]> {
    return fromEncodedArray(Logger.defaultLogger, Platform.Crypto, encodedArray, options);
  }

  // Used by tests
  static fromValues(values: unknown): Message {
    return Object.assign(new Message(), values);
  }

  // Used by tests
  static async encode<T extends Message | PresenceMessage>(msg: T, options: CipherOptions): Promise<T> {
    return encode(msg, options);
  }

  // Used by tests
  static async decode(
    message: Message | PresenceMessage,
    inputContext: CipherOptions | EncodingDecodingContext | ChannelOptions,
  ): Promise<void> {
    return decode(message, inputContext);
  }
}
