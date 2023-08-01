// Common
import { BaseClient } from '../../common/lib/client/baseclient';
import Rest from '../../common/lib/client/rest';
import Platform from '../../common/platform';
import Message from '../../common/lib/types/message';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';

Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.WebStorage = WebStorage;

Message._Crypto = null;

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

export * from './modules/crypto';
export * from './modules/message';
export { BaseClient, Rest };
