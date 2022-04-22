// Common
import Rest from '../../common/lib/client/rest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform'

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
import Crypto from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './platform'
import Transports from './lib/transport'


Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = null;

export default {
  Rest,
  Realtime,
  msgpack: null,
};
