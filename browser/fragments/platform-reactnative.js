var Platform = (function() {
	let storage = {}
	const STORAGE_KEY = '__ably_react_native'

	const ReactNative = require('react-native');
	const AsyncStorage = require('@react-native-community/async-storage').default;

	// TODO: Replace with lodash.debounce
	function debounce(callback, timeout) {
		let timerId = null
		return function() {
			clearTimeout(timerId)
			timerId = setTimeout(callback, timeout)
		}
	}

	function persistStorage() {
		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage)).catch(error => {
			console.error('[ably] Error persisting state to Async Storage', err)
		})
	}

	const debouncedPersistStorage = debounce(persistStorage, 250)

	AsyncStorage.getItem(STORAGE_KEY).then(contents => {
		storage = {
			...JSON.parse(contents || '{}'),
			storage,
		}
	}).catch(err => {
		console.error('[ably] Error initializing Ably', err)
	})

	const _Platform = {
		libver: 'js-rn',
		logTimestamps: true,
		noUpgrade: false,
		binaryType: 'arraybuffer',
		WebSocket: WebSocket,
		xhrSupported: XMLHttpRequest,
		allowComet: true,
		jsonpSupported: false,
		streamingSupported: true,
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
		stringByteSize: function(str) {
			/* str.length will be an underestimate for non-ascii strings. But if we're
			 * in a browser too old to support TextDecoder, not much we can do. Better
			 * to underestimate, so if we do go over-size, the server will reject the
			 * message */
			return (typeof TextDecoder !== 'undefined') &&
				(new TextEncoder().encode(str)).length ||
				str.length;
		},
		TextEncoder: global.TextEncoder,
		TextDecoder: global.TextDecoder,
		Promise: global.Promise,
		getRandomWordArray: function(byteLength, callback) {
			ReactNative.NativeModules.RNRandomBytes.randomBytes(byteLength, function(err, base64String) {
				callback(err, !err && CryptoJS.enc.Base64.parse(base64String));
			});
		},
		push: {
			_pushDetails: null,
			// ^ Value set by configurePush() in ably-js-react-native

			getPushDeviceDetails(machine) {
				const {_pushDetails} = _Platform.push
				if (_pushDetails == null) {
					throw new Error(`Unable to get device push details. Please call ably-js-react-native#configurePush() first`)
				}
				if (_pushDetails instanceof Error) {
					machine.handleEvent(new machine.constructor.GettingPushDeviceDetailsFailed(_pushDetails));
					return
				}
				var device = machine.getDevice();
				device.push.recipient = _pushDetails;
				device.persist();

				machine.handleEvent(new machine.constructor.GotPushDeviceDetails());
			},
			storage: {
				get(name) {
					return storage[name]
				},
				set(name, value) {
					storage[name] = value
					debouncedPersistStorage()
				},
				remove(name) {
					storage[name] = undefined
					debouncedPersistStorage()
				},
			},
			platform: ReactNative.Platform.OS,
			// ^ ENUM(android, ios, macos, windows, web)
			formFactor: ['android', 'ios'].includes(ReactNative.Platform.OS) ? 'phone' : 'desktop',
		},
	}

	return _Platform
})();
