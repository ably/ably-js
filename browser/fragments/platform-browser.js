if(typeof window !== 'object') {
	console.log("Warning: this distribution of Ably is intended for browsers. On nodejs, please use the 'ably' package on npm");
}

function allowComet() {
	/* xhr requests from local files are unreliable in some browsers, such as Chrome 65 and higher -- see eg
	 * https://stackoverflow.com/questions/49256429/chrome-65-unable-to-make-post-requests-from-local-files-to-flask
	 * So if websockets are supported, then just forget about comet transports and use that */
	var loc = window.location;
	return (!window.WebSocket || !loc || !loc.origin || loc.origin.indexOf("http") > -1);
}

var Platform = {
	libver: 'js-web-',
	logTimestamps: true,
	noUpgrade: navigator && navigator.userAgent.toString().match(/MSIE\s8\.0/),
	binaryType: 'arraybuffer',
	WebSocket: window.WebSocket || window.MozWebSocket,
	xhrSupported: window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest(),
	jsonpSupported: typeof(document) !== 'undefined',
	allowComet: allowComet(),
	streamingSupported: true,
	useProtocolHeartbeats: true,
	createHmac: null,
	msgpack: msgpack,
	supportsBinary: !!window.TextDecoder,
	preferBinary: false,
	ArrayBuffer: window.ArrayBuffer,
	atob: window.atob,
	nextTick: function(f) { setTimeout(f, 0); },
	addEventListener: window.addEventListener,
	inspect: JSON.stringify,
	stringByteSize: function(str) {
		/* str.length will be an underestimate for non-ascii strings. But if we're
		 * in a browser too old to support TextDecoder, not much we can do. Better
		 * to underestimate, so if we do go over-size, the server will reject the
		 * message */
		return window.TextDecoder &&
			(new window.TextEncoder().encode(str)).length ||
			str.length;
	},
	Promise: window.Promise,
	getRandomValues: (function(crypto) {
		if (crypto === undefined) {
			return undefined;
		}
		return function(arr, callback) {
			crypto.getRandomValues(arr);
			if(callback) {
				callback(null);
			}
		};
	})(window.crypto || window.msCrypto), // mscrypto for IE11,
	getPushDeviceDetails: ('safari' in window) ? getSafariPushDeviceDetails : getW3CPushDeviceDetails,
	pushPlatform: 'browser',
	pushFormFactor: 'desktop', // TODO: actually detect this
};

function getW3CPushDeviceDetails(machine) {
	var GettingPushDeviceDetailsFailed = machine.constructor.GettingPushDeviceDetailsFailed;
	var GotPushDeviceDetails = machine.constructor.GotPushDeviceDetails;

	function toBase64Url(arrayBuffer) {
		var buffer = new Uint8Array(arrayBuffer.slice(0, arrayBuffer.byteLength));
		return btoa(String.fromCharCode.apply(null, buffer));
	}

	function urlBase64ToUint8Array(base64String) {
		var padding = '='.repeat((4 - base64String.length % 4) % 4);
		var base64 = (base64String + padding)
			.replace(/\-/g, '+')
			.replace(/_/g, '/');
		var rawData = window.atob(base64);
		var rawDataChars = [];
		for (var i = 0; i < rawData.length; i++) {
			rawDataChars.push(rawData[i].charCodeAt(0));
		}
		return Uint8Array.from(rawDataChars);
	}

	var withPermissionCalled = false;

	function withPermission(permission) {
		if (withPermissionCalled) {
			return;
		}
		withPermissionCalled = true;

		if (permission !== 'granted') {
			machine.handleEvent(new GettingPushDeviceDetailsFailed(new Error(`user denied permission to send notifications.`)));
			return;
		}

		var swUrl = machine.rest.options.pushServiceWorkerUrl;
		if (!swUrl) {
			throw new Error('missing ClientOptions.pushServiceWorkerUrl');
		}

		navigator.serviceWorker.register(swUrl).then(function(worker) {
			var subscribe = function() {
				// TODO: appServerKey is Ably's public key, should be retrieved
				// from the server.
				var appServerKey = 'BCHetocdFiZiT8YwGRPcYeRB1fjoDxQOs73hnDO9Rni0mCh9sfZBa-gfT1P7irZyaiQfZPOdogytTdJUuOXwO9E=';

				worker.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(appServerKey),
				}).then(function(subscription) {
					var endpoint = subscription.endpoint;
					var p256dh = toBase64Url(subscription.getKey('p256dh'));
					var auth = toBase64Url(subscription.getKey('auth'));
					var key = [p256dh, auth].join(':');

					var device = machine.getDevice();
					device.push.recipient = {
						transportType: 'web',
						targetUrl: btoa(endpoint),
						encryptionKey: key,
					};
					device.persist();

					machine.handleEvent(new GotPushDeviceDetails());
				}).catch(function(err) {
					machine.handleEvent(new GettingPushDeviceDetailsFailed(err));
				});
			}

			worker.pushManager.getSubscription().then(function(subscription) {
				if (subscription) {
					subscription.unsubscribe().then(subscribe);
				} else {
					subscribe();
				}
			});
		}).catch(function(err) {
			machine.handleEvent(new GettingPushDeviceDetailsFailed(err));
		});
	};

	// requestPermission sometimes takes a callback and sometimes
	// returns a Promise. And sometimes both!
	var maybePermissionPromise = Notification.requestPermission(withPermission);
	if (maybePermissionPromise) {
		maybePermissionPromise.then(withPermission);
	}
}

function getSafariPushDeviceDetails(machine) {
	throw new Error('TODO');
}
