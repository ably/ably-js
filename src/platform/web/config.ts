import { IPlatformConfig } from '../../common/types/IPlatformConfig';
import * as Utils from 'common/lib/util/utils';

// Workaround for salesforce lightning locker compat
const globalObject = Utils.getGlobalObject();

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
  const loc = globalObject.location;
  return !globalObject.WebSocket || !loc || !loc.origin || loc.origin.indexOf('http') > -1;
}

// from: https://stackoverflow.com/a/18002694
export function isWebWorkerContext(): boolean {
  // run this in global scope of window or worker. since window.self = window, we're ok
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    return true;
  } else {
    return false;
  }
}

const userAgent = globalObject.navigator && globalObject.navigator.userAgent.toString();
const currentUrl = globalObject.location && globalObject.location.href;

const Config: IPlatformConfig = {
  agent: 'browser',
  logTimestamps: true,
  userAgent: userAgent,
  currentUrl: currentUrl,
  noUpgrade: userAgent && !!userAgent.match(/MSIE\s8\.0/),
  binaryType: 'arraybuffer',
  WebSocket: globalObject.WebSocket,
  fetchSupported: !!globalObject.fetch,
  xhrSupported: globalObject.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest(),
  allowComet: allowComet(),
  streamingSupported: true,
  useProtocolHeartbeats: true,
  supportsBinary: !!globalObject.TextDecoder,
  preferBinary: false,
  ArrayBuffer: globalObject.ArrayBuffer,
  atob: globalObject.atob,
  nextTick:
    typeof globalObject.setImmediate !== 'undefined'
      ? globalObject.setImmediate.bind(globalObject)
      : function (f: () => void) {
          setTimeout(f, 0);
        },
  addEventListener: globalObject.addEventListener,
  inspect: JSON.stringify,
  stringByteSize: function (str: string) {
    /* str.length will be an underestimate for non-ascii strings. But if we're
     * in a browser too old to support TextDecoder, not much we can do. Better
     * to underestimate, so if we do go over-size, the server will reject the
     * message */
    return (globalObject.TextDecoder && new globalObject.TextEncoder().encode(str).length) || str.length;
  },
  TextEncoder: globalObject.TextEncoder,
  TextDecoder: globalObject.TextDecoder,
  getRandomValues: (function (crypto) {
    if (crypto === undefined) {
      return undefined;
    }
    return async function (arr: ArrayBufferView) {
      crypto.getRandomValues(arr);
    };
  })(globalObject.crypto || msCrypto),
  isWebworker: isWebWorkerContext(),
};

export default Config;
