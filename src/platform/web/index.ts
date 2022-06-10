// Common
import Rest from '../../common/lib/client/rest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import Crypto from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './platform';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import ConnectionManager from '../../common/lib/transport/connectionmanager';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';
import msgpack from './lib/util/msgpack';
import Message from 'common/lib/types/message';
import PresenceMessage from 'common/lib/types/presencemessage';

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

Rest.Crypto = Crypto;
Realtime.Crypto = Crypto;

Rest.Message = Message;
Realtime.Message = Message;

Rest.PresenceMessage = PresenceMessage;
Realtime.PresenceMessage = PresenceMessage;

Realtime.ConnectionManager = ConnectionManager;

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

export default {
  Rest,
  Realtime,
  msgpack,
};
