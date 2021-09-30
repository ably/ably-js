import IPlatform, { TypedArray } from '../common/types/IPlatform';

const Platform: IPlatform = {
	agent: 'nodejs/' + process.versions.node,
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
	getRandomValues: function(arr: TypedArray, callback: Function) {
		var bytes = require('crypto').randomBytes(arr.length);
		arr.set(bytes);
		if(callback) {
			callback(null);
		}
	},
	Promise: global && global.Promise
};

export default Platform;
