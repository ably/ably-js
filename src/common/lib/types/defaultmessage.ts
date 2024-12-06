import Message, {
  WireProtocolMessage,
  CipherOptions,
  decode,
  encode,
  EncodingDecodingContext,
  fromEncoded,
  fromEncodedArray,
  fromValues,
  fromWireProtocol,
} from './message';
import * as API from '../../../../ably';
import Platform from 'common/platform';
import PresenceMessage from './presencemessage';
import { ChannelOptions } from 'common/types/channel';
import Logger from '../util/logger';
import type { Properties } from '../util/utils';

/**
 `DefaultMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Message` static property. It introduces the static methods described in the `MessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultMessage extends Message {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<Message> {
    return fromEncoded(Logger.defaultLogger, Platform.Crypto, encoded as WireProtocolMessage, inputOptions);
  }

  static async fromEncodedArray(encodedArray: Array<unknown>, options?: API.ChannelOptions): Promise<Message[]> {
    return fromEncodedArray(Logger.defaultLogger, Platform.Crypto, encodedArray as WireProtocolMessage[], options);
  }

  // Used by tests
  static fromValues(values: Properties<Message>): Message {
    return fromValues(values);
  }

  // Used by tests
  static fromWireProtocol(values: WireProtocolMessage): Message {
    return fromWireProtocol(values);
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
