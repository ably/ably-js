// Common
import { defaultRestClassFactory } from '../../common/lib/client/defaultrest';
import { realtimeClassFactory } from '../../common/lib/client/realtime';
import { channelClassFactory } from '../../common/lib/client/channel';
import Platform from '../../common/platform';

// Platform Specific
import BufferUtils from '../web/lib/util/bufferutils';
// @ts-ignore
import Http from '../web/lib/util/http';
import Config from '../web/config';
// @ts-ignore
import Transports from '../web/lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from '../web/lib/util/webstorage';
import PlatformDefaults from '../web/lib/util/defaults';
import msgpack from '../web/lib/util/msgpack';

const Channel = channelClassFactory();
const DefaultRest = defaultRestClassFactory(Channel, {});
const Realtime = realtimeClassFactory(DefaultRest, Channel);

Platform.Crypto = null;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

DefaultRest.Crypto = null;
Realtime.Crypto = null;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  Rest: DefaultRest,
  Realtime,
  msgpack,
};
