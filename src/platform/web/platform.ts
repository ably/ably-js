import msgpack from './lib/util/msgpack';
import { IPlatform, TypedArray } from '../../common/types/IPlatform';

// Workaround for salesforce lightning locker compat
const globalOrWindow = global || window;

declare var msCrypto: typeof crypto; // for IE11

if (typeof Window === 'undefined' && typeof WorkerGlobalScope === 'undefined') {
  console.log(
    "Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm"
  );
}

function allowComet() {
  /* xhr requests from local files are unreliable in some browsers, such as Chrome 65 and higher -- see eg
   * https://stackoverflow.com/questions/49256429/chrome-65-unable-to-make-post-requests-from-local-files-to-flask
   * So if websockets are supported, then just forget about comet transports and use that */
  const loc = globalOrWindow.location;
  return !globalOrWindow.WebSocket || !loc || !loc.origin || loc.origin.indexOf('http') > -1;
}

const userAgent = globalOrWindow.navigator && globalOrWindow.navigator.userAgent.toString();
const currentUrl = globalOrWindow.location && globalOrWindow.location.href;

const Platform: IPlatform = {
  agent: 'browser',
  logTimestamps: true,
  userAgent: userAgent,
  currentUrl: currentUrl,
  noUpgrade: userAgent && !!userAgent.match(/MSIE\s8\.0/),
  binaryType: 'arraybuffer',
  WebSocket: globalOrWindow.WebSocket,
  xhrSupported: globalOrWindow.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest(),
  jsonpSupported: typeof document !== 'undefined',
  allowComet: allowComet(),
  streamingSupported: true,
  useProtocolHeartbeats: true,
  createHmac: null,
  msgpack: msgpack,
  supportsBinary: !!globalOrWindow.TextDecoder,
  preferBinary: false,
  ArrayBuffer: globalOrWindow.ArrayBuffer,
  atob: globalOrWindow.atob,
  nextTick:
    typeof globalOrWindow.setImmediate !== 'undefined'
      ? globalOrWindow.setImmediate.bind(globalOrWindow)
      : function (f: () => void) {
          setTimeout(f, 0);
        },
  addEventListener: globalOrWindow.addEventListener,
  inspect: JSON.stringify,
  stringByteSize: function (str: string) {
    /* str.length will be an underestimate for non-ascii strings. But if we're
     * in a browser too old to support TextDecoder, not much we can do. Better
     * to underestimate, so if we do go over-size, the server will reject the
     * message */
    return (globalOrWindow.TextDecoder && new globalOrWindow.TextEncoder().encode(str).length) || str.length;
  },
  TextEncoder: globalOrWindow.TextEncoder,
  TextDecoder: globalOrWindow.TextDecoder,
  Promise: globalOrWindow.Promise,
  getRandomValues: (function (crypto) {
    if (crypto === undefined) {
      return undefined;
    }
    return function (arr: TypedArray, callback?: (error: Error | null) => void) {
      crypto.getRandomValues(arr);
      if (callback) {
        callback(null);
      }
    };
  })(globalOrWindow.crypto || msCrypto),
};

export default Platform;
