import Platform from 'common/platform';
import { IPresenceMessageConstructor, presenceMessageClassFactory } from '../types/presencemessage';
import { baseClientClassFactory, ModulesMap } from './baseclient';
import { restClassFactory } from './rest';
import { IChannelConstructor } from './channel';

const defaultRestClassFactory = (
  channelClass: IChannelConstructor,
  presenceMessageClass: IPresenceMessageConstructor,
  platformModules: ModulesMap
) => {
  const Rest = restClassFactory(channelClass);

  /**
   * Preloaded BaseClient with all REST features, used as the default non-treeshakeable Rest export
   */
  return class DefaultRest extends baseClientClassFactory({ ...platformModules, Rest }) {
    static Platform = Platform;
    static Crypto?: typeof Platform.Crypto;
    static PresenceMessage = presenceMessageClassFactory;
  };
};

export { defaultRestClassFactory };
