import msgpack from '../lib/util/msgpack';
import { TypedArray, IPlatform } from '../../common/types/IPlatform';

declare var MozWebSocket: typeof WebSocket; // For Chrome 14 and Firefox 7
declare var msCrypto: typeof crypto; // for IE11

if(typeof Window === 'undefined' && typeof WorkerGlobalScope === 'undefined') {
	console.log("Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm");
}

function allowComet() {
	/* xhr requests from local files are unreliable in some browsers, such as Chrome 65 and higher -- see eg
	 * https://stackoverflow.com/questions/49256429/chrome-65-unable-to-make-post-requests-from-local-files-to-flask
	 * So if websockets are supported, then just forget about comet transports and use that */
	const loc = global.location;
	return (!global.WebSocket || !loc || !loc.origin || loc.origin.indexOf("http") > -1);
}

const userAgent = global.navigator && global.navigator.userAgent.toString();
const currentUrl = global.location && global.location.href;

const Platform: IPlatform = {
	agent: 'browser',
	logTimestamps: true,
	userAgent: userAgent,
	currentUrl: currentUrl,
	noUpgrade: userAgent && !!userAgent.match(/MSIE\s8\.0/),
	binaryType: 'arraybuffer',
	WebSocket: global.WebSocket || MozWebSocket,
	xhrSupported: global.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest(),
	jsonpSupported: typeof(document) !== 'undefined',
	allowComet: allowComet(),
	streamingSupported: true,
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: msgpack,
	supportsBinary: !!global.TextDecoder,
	preferBinary: false,
	ArrayBuffer: global.ArrayBuffer,
	atob: global.atob,
	nextTick: typeof global.setImmediate !== 'undefined' ? global.setImmediate.bind(global) : function(f: () => void) { setTimeout(f, 0); },
	addEventListener: global.addEventListener,
	inspect: JSON.stringify,
	stringByteSize: function(str: string) {
		/* str.length will be an underestimate for non-ascii strings. But if we're
		 * in a browser too old to support TextDecoder, not much we can do. Better
		 * to underestimate, so if we do go over-size, the server will reject the
		 * message */
		return global.TextDecoder &&
			(new global.TextEncoder().encode(str)).length ||
			str.length;
	},
	TextEncoder: global.TextEncoder,
	TextDecoder: global.TextDecoder,
	Promise: global.Promise,
	getRandomValues: (function(crypto) {
		if (crypto === undefined) {
			return undefined;
		}
		return function(arr: TypedArray, callback?: (error: Error | null) => void) {
			crypto.getRandomValues(arr);
			if(callback) {
				callback(null);
			}
		};
	})(global.crypto || msCrypto) 
};

export default Platform;
