if(typeof window !== 'object') {
	console.log("Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm");
}

var Platform = {
	noUpgrade: navigator && navigator.userAgent.toString().match(/MSIE\s8\.0/),
	binaryType: 'arraybuffer',
	WebSocket: window.WebSocket || window.MozWebSocket,
	xhrSupported: (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()),
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: Ably.msgpack,
	supportsBinary: !!window.TextDecoder,
	preferBinary: false,
	ArrayBuffer: window.ArrayBuffer,
	atob: window.atob,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: window.addEventListener,
	getRandomValues: (function(getRandomValues) {
		return function(arr, callback) {
			getRandomValues(arr);
			callback(null);
		};
	})((window.crypto || window.msCrypto).getRandomValues // mscrypto for IE11
};

