// Common
import { DefaultRest as Rest } from '../../common/lib/client/defaultrest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform';
import Message from '../../common/lib/types/message';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import { Crypto } from './modules/crypto';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';
import msgpack from './lib/util/msgpack';

Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

Rest.Crypto = Crypto;
Realtime.Crypto = Crypto;
Message._Crypto = Crypto;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

/* If using IE8, don't attempt to upgrade from xhr_polling to xhr_streaming -
 * while it can do streaming, the low max http-connections-per-host limit means
 * that the polling transport is crippled during the upgrade process. So just
 * leave it at the base transport */
if (Platform.Config.noUpgrade) {
  Platform.Defaults.upgradeTransports = [];
}

export { Rest, Realtime, msgpack };

export default {
  Rest,
  Realtime,
  msgpack,
};
