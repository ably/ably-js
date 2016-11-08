this.Platform = {
	hasWindow: false,
	userAgent: null,
	binaryType: 'nodebuffer',
	WebSocket: require('ws'),
	useProtocolHeartbeats: true,
	createHmac: require('crypto').createHmac,
	msgpack: require('msgpack-js'),
	supportsBinary: true,
	nextTick: process.nextTick,
	addEventListener: null
};
