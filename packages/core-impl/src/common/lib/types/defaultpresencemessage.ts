import * as API from '@ably/pubsub-core/api';
import Logger from '../util/logger';
import PresenceMessage, { fromEncoded, fromEncodedArray, WirePresenceMessage } from './presencemessage';
import Platform from 'common/platform';
import type { Properties } from '../util/utils';

/**
 `DefaultPresenceMessage` is the class that the non tree-shakable version of the library exports as `PresenceMessage`, and that `DefaultPubSubHttpClient` and `DefaultPubSubRealtimeClient` also carry as their `PresenceMessage` static property. It introduces the static methods that the public API declares on the `PresenceMessage` class.
 */
export class DefaultPresenceMessage extends PresenceMessage {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<PresenceMessage> {
    return fromEncoded(Logger.defaultLogger, Platform.Crypto, encoded as WirePresenceMessage, inputOptions);
  }

  static async fromEncodedArray(
    encodedArray: Array<unknown>,
    options?: API.ChannelOptions,
  ): Promise<PresenceMessage[]> {
    return fromEncodedArray(Logger.defaultLogger, Platform.Crypto, encodedArray as WirePresenceMessage[], options);
  }

  static fromValues(values: Omit<Properties<PresenceMessage>, 'memberKey'>): PresenceMessage {
    return PresenceMessage.fromValues(values);
  }
}
