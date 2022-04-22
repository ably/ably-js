import { IPlatform } from "./types/IPlatform";
import { IHttp } from "./types/http";
import ConnectionManager from "./lib/transport/connectionmanager";
import IDefaults from "./types/IDefaults";
import IWebStorage from "./types/IWebStorage";
import IBufferUtils from "./types/IBufferUtils";


export default class Platform {
  static Config: IPlatform;
  static BufferUtils: IBufferUtils;
  static Crypto: any; //Not typed
  static Http: typeof IHttp;
  static Transports: Array<(connectionManager: typeof ConnectionManager) => Transport>;
  static Defaults: IDefaults;
  static WebStorage: IWebStorage;
}
