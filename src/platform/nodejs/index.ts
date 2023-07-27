// Common
import { defaultRestClassFactory } from '../../common/lib/client/defaultrest';
import { realtimeClassFactory } from '../../common/lib/client/realtime';
import { channelClassFactory } from '../../common/lib/client/channel';
import Platform from '../../common/platform';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import CryptoFactory from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import PlatformDefaults from './lib/util/defaults';

const Crypto = CryptoFactory(BufferUtils);

const Channel = channelClassFactory();
const DefaultRest = defaultRestClassFactory(Channel, {});
const Realtime = realtimeClassFactory(DefaultRest, Channel);

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils as typeof Platform.BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = null;

DefaultRest.Crypto = Crypto;
Realtime.Crypto = Crypto;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  Rest: DefaultRest,
  Realtime,
  msgpack: null,
};
