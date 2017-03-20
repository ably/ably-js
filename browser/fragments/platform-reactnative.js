var Platform = {
	libver: 'js-rn-',
	noUpgrade: false,
	binaryType: 'arraybuffer',
	WebSocket: WebSocket,
	xhrSupported: XMLHttpRequest,
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

