import * as API from '../../../../ably';
import Logger from '../util/logger';
import PresenceMessage, {
  fromEncoded,
  fromEncodedArray,
  fromValues,
  WireProtocolPresenceMessage,
} from './presencemessage';
import Platform from 'common/platform';
import type { Properties } from '../util/utils';

/**
 `DefaultPresenceMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `PresenceMessage` static property. It introduces the static methods described in the `PresenceMessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultPresenceMessage extends PresenceMessage {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<PresenceMessage> {
    return fromEncoded(Logger.defaultLogger, Platform.Crypto, encoded as WireProtocolPresenceMessage, inputOptions);
  }

  static async fromEncodedArray(
    encodedArray: Array<unknown>,
    options?: API.ChannelOptions,
  ): Promise<PresenceMessage[]> {
    return fromEncodedArray(
      Logger.defaultLogger,
      Platform.Crypto,
      encodedArray as WireProtocolPresenceMessage[],
      options,
    );
  }

  static fromValues(values: Properties<PresenceMessage>): PresenceMessage {
    return fromValues(values);
  }
}
