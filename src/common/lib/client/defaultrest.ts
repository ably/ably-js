import ClientOptions from 'common/types/ClientOptions';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
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
      Crypto: DefaultRest.Crypto,
    });
  }

  // TODO does this mean we can make it generic now?
  static Crypto?: IUntypedCryptoStatic;
  static Message = Message;
  static PresenceMessage = PresenceMessage;
}

export { DefaultRest };
