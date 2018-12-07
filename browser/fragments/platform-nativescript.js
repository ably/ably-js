require('nativescript-websockets');

var randomBytes;
if (global.android) {
	randomBytes = function(size) {
		var sr = new java.security.SecureRandom();
		var buffer = Array.create("byte", size);
		sr.nextBytes(buffer);
		return android.util.Base64.encodeToString(buffer, android.util.Base64.DEFAULT);
	};
} else {
	randomBytes = function(size) {
		var bytes = NSMutableData.dataWithLength(size);
		SecRandomCopyBytes(kSecRandomDefault, size, bytes.mutableBytes());
		return bytes.base64EncodedStringWithOptions(0);
	};
}

var Platform = {
	libver: 'js-ns-',
	logTimestamps: true,
	noUpgrade: false,
	binaryType: 'arraybuffer',
	WebSocket: WebSocket,
	xhrSupported: XMLHttpRequest,
	allowComet: true,
	jsonpSupported: false,
	streamingSupported: false,
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: msgpack,
	supportsBinary: (typeof TextDecoder !== 'undefined') && TextDecoder,
	preferBinary: false,
	ArrayBuffer: ArrayBuffer,
	atob: null,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: null,
	inspect: JSON.stringify,
	getRandomValues: function(arr, callback) {
		var bytes = randomBytes(arr.length);
		for (var i = 0; i < arr.length; i++) {
			arr[i] = bytes[i];
		}
		if(callback) {
			callback(null);
		}
	}
};

