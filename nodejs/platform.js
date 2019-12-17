this.Platform = {
	libver: 'js-node',
	logTimestamps: true,
	userAgent: null,
	binaryType: 'nodebuffer',
	WebSocket: require('ws'),
	useProtocolHeartbeats: false,
	createHmac: require('crypto').createHmac,
	msgpack: require('@ably/msgpack-js'),
	supportsBinary: true,
	preferBinary: true,
	nextTick: process.nextTick,
	inspect: require('util').inspect,
	stringByteSize: Buffer.byteLength,
	inherits: require('util').inherits,
	addEventListener: null,
	getRandomValues: function(arr, callback) {
		var bytes = require('crypto').randomBytes(arr.length);
		arr.set(bytes);
		if(callback) {
			callback(null);
		}
	},
	Promise: global && global.Promise,
};
