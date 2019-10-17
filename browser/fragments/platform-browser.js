if(typeof Window === 'undefined' && typeof WorkerGlobalScope === 'undefined') {
	console.log("Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm");
}

function allowComet() {
	/* xhr requests from local files are unreliable in some browsers, such as Chrome 65 and higher -- see eg
	 * https://stackoverflow.com/questions/49256429/chrome-65-unable-to-make-post-requests-from-local-files-to-flask
	 * So if websockets are supported, then just forget about comet transports and use that */
	var loc = global.location;
	return (!global.WebSocket || !loc || !loc.origin || loc.origin.indexOf("http") > -1);
}

var userAgent = global.navigator && global.navigator.userAgent.toString();
var currentUrl = global.location && global.location.href;

var Platform = {
	libver: 'js-web',
	logTimestamps: true,
	userAgent: userAgent,
	currentUrl: currentUrl,
	noUpgrade: userAgent && userAgent.match(/MSIE\s8\.0/),
	binaryType: 'arraybuffer',
	WebSocket: global.WebSocket || global.MozWebSocket,
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
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: global.addEventListener,
	inspect: JSON.stringify,
	stringByteSize: function(str) {
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
		return function(arr, callback) {
			crypto.getRandomValues(arr);
			if(callback) {
				callback(null);
			}
		};
	})(global.crypto || global.msCrypto) // mscrypto for IE11
};
