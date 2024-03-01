// Common
import { BaseRest } from '../../common/lib/client/baserest';
import BaseRealtime from '../../common/lib/client/baserealtime';
import Platform from '../../common/platform';
import ErrorInfo from '../../common/lib/types/errorinfo';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import Http from './lib/http/http';
import Config from './config';
// @ts-ignore
import { ModulesTransports } from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from './lib/util/defaults';
import { modulesBundledRequestImplementations } from './lib/http/request';

Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = ModulesTransports;
Platform.WebStorage = WebStorage;

Http.bundledRequestImplementations = modulesBundledRequestImplementations;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export * from './modules/crypto';
export * from './modules/message';
export * from './modules/presencemessage';
export * from './modules/msgpack';
export * from './modules/realtimepresence';
export * from './modules/transports';
export * from './modules/http';
export { Rest } from '../../common/lib/client/rest';
export { FilteredSubscriptions as MessageInteractions } from '../../common/lib/client/filteredsubscriptions';
export { BaseRest, BaseRealtime, ErrorInfo };
