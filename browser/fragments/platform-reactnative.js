var Platform = (function() {
	const ReactNative = require('react-native');
	const AsyncStorage = require('@react-native-community/async-storage').default;

	const _Platform = {
		libver: 'js-rn',
		logTimestamps: true,
		noUpgrade: false,
		binaryType: 'arraybuffer',
		WebSocket,
		xhrSupported: XMLHttpRequest,
		allowComet: true,
		jsonpSupported: false,
		streamingSupported: true,
		useProtocolHeartbeats: true,
		createHmac: null,
		msgpack,
		supportsBinary: (typeof TextDecoder !== 'undefined') && TextDecoder,
		preferBinary: false,
		ArrayBuffer: (typeof ArrayBuffer !== 'undefined') && ArrayBuffer,
		atob: global.atob,
		nextTick: function(f) { setTimeout(f, 0); },
		addEventListener: null,
		inspect: JSON.stringify,
		stringByteSize: str => Buffer.byteLength(str),
		TextEncoder: global.TextEncoder,
		TextDecoder: global.TextDecoder,
		Promise: global.Promise,
		getRandomWordArray: function(byteLength, callback) {
			ReactNative.NativeModules.RNRandomBytes.randomBytes(byteLength, function(err, base64String) {
				callback(err, !err && CryptoJS.enc.Base64.parse(base64String));
			});
		},
		push: {
			_pushObserver: null,
			// ^ Value set by ably-js-react-native

			getPushDeviceDetails(machine) {
				const {_pushObserver} = _Platform.push;
				if (_pushObserver == null) {
					throw new Error(`Unable to get device push details. Please make sure you've setup ably-js-react-native correctly`);
				}

				_pushObserver.subscribe({
					next(pushDetails) {
						var device = machine.getDevice();
						device.push.recipient = pushDetails;
						device.persist();

						machine.handleEvent(new machine.constructor.GotPushDeviceDetails());
					},
					error(pushError) {
						machine.handleEvent(new machine.constructor.GettingPushDeviceDetailsFailed(pushError));
					},
				});
			},
			storage: {
				get(name) {
					return AsyncStorage.getItem(name);
				},
				set(name, value) {
					return AsyncStorage.setItem(name, value);
				},
				remove(name) {
					return AsyncStorage.removeItem(name);
				},
			},
			platform: ReactNative.Platform.OS,
			// ^ ENUM(android, ios, macos, windows, web)
			formFactor: ['android', 'ios'].includes(ReactNative.Platform.OS) ? 'phone' : 'desktop',
		},
	}

	return _Platform
})();
