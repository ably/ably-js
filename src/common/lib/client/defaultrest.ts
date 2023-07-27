import Platform from 'common/platform';
import Message from '../types/message';
import PresenceMessage from '../types/presencemessage';
import { baseClientClassFactory } from './baseclient';
import Rest from './rest';

/**
 * Preloaded BaseClient with all REST features, used as the default non-treeshakeable Rest export
 */
class DefaultRest extends baseClientClassFactory({ Rest }) {
  static Platform = Platform;
  static Crypto?: typeof Platform.Crypto;
  static Message = Message;
  static PresenceMessage = PresenceMessage;
}

export { DefaultRest };
