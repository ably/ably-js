// Common
import { BaseClient } from '../../common/lib/client/baseclient';
import { channelClassFactory } from '../../common/lib/client/channel';
import { restClassFactory } from '../../common/lib/client/rest';
import Platform from '../../common/platform';
import { messageClassFactory } from 'common/lib/types/message';
import { presenceMessageClassFactory } from 'common/lib/types/presencemessage';
import { presenceClassFactory } from 'common/lib/client/presence';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import CryptoFactory from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';

const Crypto = CryptoFactory(Config, BufferUtils);

Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.WebStorage = WebStorage;

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

const Message = messageClassFactory();
const PresenceMessage = presenceMessageClassFactory(Message);
const Presence = presenceClassFactory(PresenceMessage);
const Channel = channelClassFactory(Message, Presence);
const Rest = restClassFactory(Channel);

export { BaseClient, Rest, Crypto };
