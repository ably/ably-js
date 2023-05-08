import { IPlatformConfig } from './types/IPlatformConfig';
import { IHttp } from './types/http';
import ConnectionManager from './lib/transport/connectionmanager';
import IDefaults from './types/IDefaults';
import IWebStorage from './types/IWebStorage';
import IBufferUtils from './types/IBufferUtils';
import Transport from './lib/transport/transport';
import * as WebBufferUtils from '../platform/web/lib/util/bufferutils';
import * as NodeBufferUtils from '../platform/nodejs/lib/util/bufferutils';

type Bufferlike = WebBufferUtils.Bufferlike | NodeBufferUtils.Bufferlike;
type BufferUtilsOutput = WebBufferUtils.Output | NodeBufferUtils.Output;
type ToBufferOutput = WebBufferUtils.ToBufferOutput | NodeBufferUtils.ToBufferOutput;
type ComparableBuffer = WebBufferUtils.ComparableBuffer | NodeBufferUtils.ComparableBuffer;

export default class Platform {
  static Config: IPlatformConfig;
  /*
     What we actually _want_ is for Platform to be a generic class
     parameterised by Bufferlike etc, but that requires far-reaching changes to
     components that make use of Platform. So instead we have to advertise a
     BufferUtils object that accepts a broader range of data types than it
     can in reality handle.
   */
  static BufferUtils: IBufferUtils<Bufferlike, BufferUtilsOutput, ToBufferOutput, ComparableBuffer>;
  static Crypto: any; //Not typed
  static Http: typeof IHttp;
  static Transports: Array<(connectionManager: typeof ConnectionManager) => Transport>;
  static Defaults: IDefaults;
  static WebStorage: IWebStorage | null;
}
