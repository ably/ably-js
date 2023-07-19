import Platform from 'common/platform';
import ClientOptions from 'common/types/ClientOptions';
import Message from '../types/message';
import PresenceMessage from '../types/presencemessage';
import { BaseClient } from './baseclient';
import Rest from './rest';

/**
 * Preloaded BaseClient with all REST features, used as the default non-treeshakeable Rest export
 */
class DefaultRest extends BaseClient {
  constructor(options: string | ClientOptions) {
    super(options, {
      Rest,
    });
  }

  static Platform = Platform;
  static Crypto?: typeof Platform.Crypto;
  static Message = Message;
  static PresenceMessage = PresenceMessage;
}

export { DefaultRest };
