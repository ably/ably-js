import { IPlatformConfig } from './types/IPlatformConfig';
import { IHttp } from './types/http';
import { IConnectionManagerConstructor } from './lib/transport/connectionmanager';
import IDefaults from './types/IDefaults';
import IWebStorage from './types/IWebStorage';
import IBufferUtils from './types/IBufferUtils';
import { Transport } from './lib/transport/transport';
import * as WebBufferUtils from '../platform/web/lib/util/bufferutils';
import * as NodeBufferUtils from '../platform/nodejs/lib/util/bufferutils';

type Bufferlike = WebBufferUtils.Bufferlike | NodeBufferUtils.Bufferlike;
type BufferUtilsOutput = WebBufferUtils.Output | NodeBufferUtils.Output;
type ToBufferOutput = WebBufferUtils.ToBufferOutput | NodeBufferUtils.ToBufferOutput;

export default class Platform {
  static Config: IPlatformConfig;
  /*
     What we actually _want_ is for Platform to be a generic class
     parameterised by Bufferlike etc, but that requires far-reaching changes to
     components that make use of Platform. So instead we have to advertise a
     BufferUtils object that accepts a broader range of data types than it
     can in reality handle.
   */
  static BufferUtils: IBufferUtils<Bufferlike, BufferUtilsOutput, ToBufferOutput>;
  /*
     This should be a class whose static methods implement the ICryptoStatic
     interface, but (for the same reasons as described in the BufferUtils
     comment above) Platform doesn’t currently allow us to express the
     generic parameters, hence keeping the type as `any`.
   */
  static Crypto: any;
  static Http: typeof IHttp;
  // TODO here I've changed this from IConnectionManager to IConnectionManagerConstructor — did i get it wrong in the first place?
  static Transports: Array<(connectionManager: IConnectionManagerConstructor) => Transport>;
  static Defaults: IDefaults;
  static WebStorage: IWebStorage | null;
}
