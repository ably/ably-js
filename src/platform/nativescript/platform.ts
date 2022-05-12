/* eslint-disable no-undef */
import msgpack from '../web/lib/util/msgpack';
import { IPlatform } from "../../common/types/IPlatform";
import '@nativescript/types';
require('nativescript-websockets');

var randomBytes: (size: number)=>string;
if (global.android) {
  randomBytes = function (size) {
    var sr = new java.security.SecureRandom();
    var buffer = Array.create('byte', size);
    sr.nextBytes(buffer);
    return android.util.Base64.encodeToString(buffer, android.util.Base64.DEFAULT);
  };
} else {
  randomBytes = function (size) {
    var bytes = NSMutableData.dataWithLength(size);
    //@ts-ignore
    SecRandomCopyBytes(kSecRandomDefault, size, bytes.mutableBytes());
    return bytes.base64EncodedStringWithOptions(0);
  };
}

const Platform: IPlatform = {
  agent: 'nativescript',
  logTimestamps: true,
  noUpgrade: false,
  binaryType: 'arraybuffer',
  WebSocket: WebSocket,
  xhrSupported: !!XMLHttpRequest,
  allowComet: true,
  jsonpSupported: false,
  streamingSupported: false,
  useProtocolHeartbeats: true,
  createHmac: null,
  msgpack: msgpack,
  supportsBinary: typeof TextDecoder !== 'undefined' && !!TextDecoder,
  preferBinary: false,
  ArrayBuffer: ArrayBuffer,
  atob: null,
  nextTick: (f: ()=>void) => {
    setTimeout(f, 0);
  },
  addEventListener: null,
  inspect: JSON.stringify,
  stringByteSize: function (str: string) {
    /* str.length will be an underestimate for non-ascii strings. But if we're
     * in a browser too old to support TextDecoder, not much we can do. Better
     * to underestimate, so if we do go over-size, the server will reject the
     * message */
    return (typeof TextDecoder !== 'undefined' && new TextEncoder().encode(str).length) || str.length;
  },
  TextEncoder: global.TextEncoder,
  TextDecoder: global.TextDecoder,
  Promise: global.Promise,
  getRandomValues: function (arr: any, callback: any) {
    var bytes = randomBytes(arr.length);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = bytes[i];
    }
    if (callback) {
      callback(null);
    }
  },
};

export default Platform;
