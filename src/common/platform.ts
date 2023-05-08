import { IPlatformConfig } from './types/IPlatformConfig';
import { IHttp } from './types/http';
import ConnectionManager from './lib/transport/connectionmanager';
import IDefaults from './types/IDefaults';
import IWebStorage from './types/IWebStorage';
import IBufferUtils from './types/IBufferUtils';
import Transport from './lib/transport/transport';
import * as WebBufferUtils from '../platform/web/lib/util/bufferutils';
import * as NodeBufferUtils from '../platform/nodejs/lib/util/bufferutils';

export type Bufferlike = WebBufferUtils.Bufferlike | NodeBufferUtils.Bufferlike;
export type BufferUtilsOutput = WebBufferUtils.Output | NodeBufferUtils.Output;

export default class Platform {
  static Config: IPlatformConfig;
  static BufferUtils: IBufferUtils<Bufferlike, BufferUtilsOutput>;
  static Crypto: any; //Not typed
  static Http: typeof IHttp;
  static Transports: Array<(connectionManager: typeof ConnectionManager) => Transport>;
  static Defaults: IDefaults;
  static WebStorage: IWebStorage | null;
}
