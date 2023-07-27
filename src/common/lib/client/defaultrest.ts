import Platform from 'common/platform';
import Message from '../types/message';
import PresenceMessage from '../types/presencemessage';
import { baseClientClassFactory, ModulesMap } from './baseclient';
import Rest from './rest';

const defaultRestClassFactory = (platformModules: ModulesMap) => {
  /**
   * Preloaded BaseClient with all REST features, used as the default non-treeshakeable Rest export
   */
  return class DefaultRest extends baseClientClassFactory({ ...platformModules, Rest }) {
    static Platform = Platform;
    static Crypto?: typeof Platform.Crypto;
    static Message = Message;
    static PresenceMessage = PresenceMessage;
  };
};

export { defaultRestClassFactory };
