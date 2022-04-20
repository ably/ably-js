import msgpack from '../lib/util/msgpack';
import { parse as parseBase64 } from 'crypto-js/build/enc-base64';
import { IPlatform } from '../../common/types/IPlatform';
import ReactNative from 'react-native';

const Platform: IPlatform = {
  agent: 'reactnative',
  logTimestamps: true,
  noUpgrade: false,
  binaryType: 'arraybuffer',
  WebSocket: WebSocket,
  xhrSupported: true,
  allowComet: true,
  jsonpSupported: false,
  streamingSupported: true,
  useProtocolHeartbeats: true,
  createHmac: null,
  msgpack: msgpack,
  supportsBinary: typeof TextDecoder !== 'undefined' && TextDecoder ? true : false,
  preferBinary: false,
  ArrayBuffer: typeof ArrayBuffer !== 'undefined' && ArrayBuffer,
  atob: global.atob,
  nextTick: function (f: Function) {
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
  getRandomWordArray: (function (RNRandomBytes) {
    return function (byteLength: number, callback: Function) {
      RNRandomBytes.randomBytes(byteLength, function (err: Error, base64String: string) {
        callback(err, !err && parseBase64(base64String));
      });
    };
  })(ReactNative.NativeModules.RNRandomBytes),
};

export default Platform;
