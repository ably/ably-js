if(typeof window !== 'object') {
	console.log("Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm");
}

function allowComet() {
	/* xhr requests from local files are unreliable in some browsers, such as Chrome 65 and higher -- see eg
	 * https://stackoverflow.com/questions/49256429/chrome-65-unable-to-make-post-requests-from-local-files-to-flask
	 * So if websockets are supported, then just forget about comet transports and use that */
	var loc = window.location;
	return (!window.WebSocket || !loc || !loc.origin || loc.origin.indexOf("http") > -1);
}

var Platform = {
	libver: 'js-web-',
	logTimestamps: true,
	noUpgrade: navigator && navigator.userAgent.toString().match(/MSIE\s8\.0/),
	binaryType: 'arraybuffer',
	WebSocket: window.WebSocket || window.MozWebSocket,
	xhrSupported: window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest(),
	jsonpSupported: typeof(document) !== 'undefined',
	allowComet: allowComet(),
	streamingSupported: true,
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: msgpack,
	supportsBinary: !!window.TextDecoder,
	preferBinary: false,
	ArrayBuffer: window.ArrayBuffer,
	atob: window.atob,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: window.addEventListener,
	inspect: JSON.stringify,
	getRandomValues: (function(crypto) {
		if (crypto === undefined) {
			return undefined;
		}
		return function(arr, callback) {
			crypto.getRandomValues(arr);
			callback(null);
		};
	})(window.crypto || window.msCrypto) // mscrypto for IE11
};
