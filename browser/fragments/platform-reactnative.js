var Platform = {
	libver: 'js-rn',
	logTimestamps: true,
	noUpgrade: false,
	binaryType: 'arraybuffer',
	WebSocket: WebSocket,
	xhrSupported: XMLHttpRequest,
	allowComet: true,
	jsonpSupported: false,
	streamingSupported: true,
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: msgpack,
	supportsBinary: (typeof TextDecoder !== 'undefined') && TextDecoder,
	preferBinary: false,
	ArrayBuffer: (typeof ArrayBuffer !== 'undefined') && ArrayBuffer,
	atob: global.atob,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: null,
	inspect: JSON.stringify,
	stringByteSize: function(str) {
		/* str.length will be an underestimate for non-ascii strings. But if we're
		 * in a browser too old to support TextDecoder, not much we can do. Better
		 * to underestimate, so if we do go over-size, the server will reject the
		 * message */
		return (typeof TextDecoder !== 'undefined') &&
			(new TextEncoder().encode(str)).length ||
			str.length;
	},
	TextEncoder: global.TextEncoder,
	TextDecoder: global.TextDecoder,
	Promise: global.Promise,
	getRandomWordArray: (function(RNRandomBytes) {
		return function(byteLength, callback) {
			RNRandomBytes.randomBytes(byteLength, function(err, base64String) {
				callback(err, !err && CryptoJS.enc.Base64.parse(base64String));
			});
		};
	})(require('react-native').NativeModules.RNRandomBytes)
};
