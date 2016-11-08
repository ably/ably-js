var Platform = {
	noUpgrade: false,
	binaryType: 'arraybuffer',
	WebSocket: WebSocket,
	xhrSupported: XMLHttpRequest && ('withCredentials' in new XMLHttpRequest()),
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: (typeof require === 'function') ? require('msgpack-js') : Ably.msgpack,
	supportsBinary: (typeof TextDecoder !== 'undefined') && TextDecoder,
	preferBinary: false,
	ArrayBuffer: (typeof ArrayBuffer !== 'undefined') && ArrayBuffer,
	atob: global.atob,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: null
};

