// Common
import Rest from '../../common/lib/client/rest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform'

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import Crypto from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './platform'
// @ts-ignore
import Transports from './lib/transport'
import Logger from "../../common/lib/util/logger";
import Defaults from "../../common/lib/util/defaults";
import ConnectionManager from "../../common/lib/transport/connectionmanager";
import PlatformDefaults from './lib/util/defaults'

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = null;

Realtime.ConnectionManager = ConnectionManager;

Logger.initLogHandlers();

if (Platform.Config.agent) {
  // @ts-ignore
  Defaults.agent += ' ' + Platform.Config.agent;
}

Platform.Defaults = Defaults();

console.log("Defaults:");
console.log(Defaults);
console.log("Platform Defaults:");
console.log(Platform.Defaults);
console.log("---");

export default {
  Rest,
  Realtime,
  msgpack: null,
};
