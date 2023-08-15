import Message, { fromEncoded, fromEncodedArray } from './message';
import * as API from '../../../../ably';
import Platform from 'common/platform';

/**
 `DefaultMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Message` static property. It introduces the static methods described in the `MessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultMessage extends Message {
  static async fromEncoded(encoded: unknown, inputOptions?: API.Types.ChannelOptions): Promise<Message> {
    return fromEncoded(Platform.Crypto, encoded, inputOptions);
  }

  static async fromEncodedArray(encodedArray: Array<unknown>, options?: API.Types.ChannelOptions): Promise<Message[]> {
    return fromEncodedArray(Platform.Crypto, encodedArray, options);
  }
}
