this.Platform = {
	libver: 'js-node-',
	logTimestamps: true,
	hasWindow: false,
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
	push: {
		getPushDeviceDetails: function(machine) {
			var channel = machine.rest.options.pushRecipientChannel;
			if (!channel) {
				throw new Error('missing ClientOptions.pushRecipientChannel');
			}
			var ablyKey = machine.rest.options.pushAblyKey || machine.rest.options.key;
			if (!ablyKey) {
				throw new Error('missing ClientOptions.pushAblyKey');
			}
			var ablyUrl = machine.rest.baseUri(Defaults.getHosts(machine.rest.options)[0]);

			var device = machine.getDevice();
			device.push.recipient = {
				transportType: 'ablyChannel',
				channel: channel,
				ablyKey: ablyKey,
				ablyUrl: ablyUrl,
			};
			console.log('PERSIST');
			device.persist();

			machine.handleEvent(new machine.constructor.GotPushDeviceDetails());
		},
		storage: (function() {
			var values = {};
			return {
				set: function(name, value) { values[name] = value; },
				get: function(name) { return values[name]; },
				remove: function(name) { delete values[name]; },
			};
		})(),
		platform: 'browser',
		formFactor: 'desktop', // TODO: actually detect this
	},
};
