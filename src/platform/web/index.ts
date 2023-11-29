// Common
import { DefaultRest } from '../../common/lib/client/defaultrest';
import { DefaultRealtime } from '../../common/lib/client/defaultrealtime';
import Platform from '../../common/platform';
import ErrorInfo from '../../common/lib/types/errorinfo';
import { fromDeserializedIncludingDependencies as protocolMessageFromDeserialized } from '../../common/lib/types/protocolmessage';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import { createCryptoClass } from './lib/util/crypto';
import Http from './lib/http/http';
import Config from './config';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';
import msgpack from './lib/util/msgpack';
import { defaultBundledRequestImplementations } from './lib/http/request';

const Crypto = createCryptoClass(Config, BufferUtils);

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;
// To use vcdiff on web you must use the modular variant of the library
Platform.Vcdiff = {
  supported: false,
  errorMessage: 'For vcdiff functionality in the browser, you must use the modular variant of ably-js',
};

for (const clientClass of [DefaultRest, DefaultRealtime]) {
  clientClass.Crypto = Crypto;
  clientClass._MsgPack = msgpack;
}

Http.bundledRequestImplementations = defaultBundledRequestImplementations;

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

export { DefaultRest as Rest, DefaultRealtime as Realtime, msgpack, protocolMessageFromDeserialized };

export default {
  ErrorInfo,
  Rest: DefaultRest,
  Realtime: DefaultRealtime,
  msgpack,
};
