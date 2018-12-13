var Platform = {
	libver: 'js-rn-',
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
	getRandomValues: (function(randomBytes) {
		return function(arr, callback) {
			randomBytes(arr.length, function(err, bytes) {
				if (err) {
					callback(err);
					return;
				}

				for (var i = 0; i < arr.length; i++) {
					arr[i] = bytes[i];
				}
				callback(null);
			});
		};
	})(require('react-native-randombytes').randomBytes)
};

