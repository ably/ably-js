// Common
import { DefaultRest } from '../../common/lib/client/defaultrest';
import { DefaultRealtime } from '../../common/lib/client/defaultrealtime';
import Platform from '../../common/platform';
import ErrorInfo from '../../common/lib/types/errorinfo';
import { makeFromDeserializedWithDependencies as makeProtocolMessageFromDeserialized } from '../../common/lib/types/protocolmessage';

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
import { defaultBundledRequestImplementations } from './lib/http/request';

const Crypto = createCryptoClass(Config, BufferUtils);

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

for (const clientClass of [DefaultRest, DefaultRealtime]) {
  clientClass.Crypto = Crypto;
  // MsgPack no longer bundled in the browser build. Browsers default to JSON
  // (preferBinary: false). MsgPack is available as an optional plugin via:
  //   import { MsgPack } from 'ably/modular';
  //   new Ably.Realtime({ plugins: { MsgPack } });
}

Http.bundledRequestImplementations = defaultBundledRequestImplementations;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export { DefaultRest as Rest, DefaultRealtime as Realtime, makeProtocolMessageFromDeserialized, ErrorInfo };

export default {
  ErrorInfo,
  Rest: DefaultRest,
  Realtime: DefaultRealtime,
  makeProtocolMessageFromDeserialized,
};
