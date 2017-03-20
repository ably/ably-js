this.Platform = {
	libver: 'js-node-',
	hasWindow: false,
	userAgent: null,
	binaryType: 'nodebuffer',
	WebSocket: require('ws'),
	useProtocolHeartbeats: true,
	createHmac: require('crypto').createHmac,
	msgpack: require('msgpack-js'),
	supportsBinary: true,
	preferBinary: true,
	nextTick: process.nextTick,
	inspect: require('util').inspect,
	inherits: require('util').inherits,
	addEventListener: null
};
