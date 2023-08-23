// Common
import Rest from '../../common/lib/client/rest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform';
import ErrorInfo from '../../common/lib/types/errorinfo';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import Crypto from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import PlatformDefaults from './lib/util/defaults';

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils as typeof Platform.BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = null;

Rest.Crypto = Crypto;
Realtime.Crypto = Crypto;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  ErrorInfo,
  Rest,
  Realtime,
  msgpack: null,
};
