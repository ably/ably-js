import { TypedArray, IPlatform } from '../common/types/IPlatform';
import crypto from 'crypto';
import WebSocket from 'ws';
import util from 'util';

const Platform: IPlatform = {
	agent: 'nodejs/' + process.versions.node,
	logTimestamps: true,
	userAgent: null,
	binaryType: 'nodebuffer' as BinaryType,
	WebSocket,
	useProtocolHeartbeats: false,
	createHmac: crypto.createHmac,
	msgpack: require('@ably/msgpack-js'),
	supportsBinary: true,
	preferBinary: true,
	nextTick: process.nextTick,
	inspect: util.inspect,
	stringByteSize: Buffer.byteLength,
	inherits: util.inherits,
	addEventListener: null,
	getRandomValues: function (arr: TypedArray, callback?: (err?: Error | null) => void): void {
		const bytes = crypto.randomBytes(arr.length);
		arr.set(bytes);
		if (callback) {
			callback(null);
		}
	},
	Promise: global && global.Promise,
};

export default Platform;
