import msgpack from '../web/lib/util/msgpack';
import { IPlatformConfig } from '../../common/types/IPlatformConfig';
import BufferUtils from '../web/lib/util/bufferutils';

export default function (bufferUtils: typeof BufferUtils): IPlatformConfig {
  const getRandomArrayBuffer = (function (RNRandomBytes) {
    return function (byteLength: number, callback: (err: Error | null, result: ArrayBuffer | null) => void) {
      RNRandomBytes.randomBytes(byteLength, function (err: Error | null, base64String: string | null) {
        callback(err, base64String ? bufferUtils.toArrayBuffer(bufferUtils.base64Decode(base64String)) : null);
      });
    };
    // Installing @types/react-native would fix this but conflicts with @types/node
    // See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/15960
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  })(require('react-native').NativeModules.RNRandomBytes);

  return {
    agent: 'reactnative',
    logTimestamps: true,
    noUpgrade: false,
    binaryType: 'arraybuffer',
    WebSocket: WebSocket,
    xhrSupported: true,
    allowComet: true,
    streamingSupported: true,
    useProtocolHeartbeats: true,
    msgpack: msgpack,
    supportsBinary: !!(typeof TextDecoder !== 'undefined' && TextDecoder),
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
    getRandomArrayBuffer,
    getRandomValues: (arr: ArrayBufferView, callback?: (error: Error | null) => void) => {
      getRandomArrayBuffer(arr.byteLength, (err, randomArrayBuffer) => {
        if (err) {
          if (callback) {
            callback(err);
          }
          return;
        }

        const randomArrayBufferDataView = new DataView(randomArrayBuffer!);
        const outputDataView = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

        for (let i = 0; i < randomArrayBufferDataView.byteLength; i++) {
          outputDataView.setUint8(i, randomArrayBufferDataView.getUint8(i));
        }
      });
    },
  };
}
