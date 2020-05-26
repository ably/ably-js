var LocalDevice = (function() {
	var toBase64;
	if(Platform.createHmac) {
		toBase64 = function(str) { return (new Buffer(str, 'ascii')).toString('base64'); };
	} else {
		toBase64 = Base64.encode;
	}

	const persistKeys = {
		deviceId: 'ably.push.deviceId',
		deviceSecret: 'ably.push.deviceSecret',
		deviceIdentityToken: 'ably.push.deviceIdentityToken',
		pushRecipient: 'ably.push.pushRecipient'
	};

	function LocalDevice(rest) {
		LocalDevice.super_.call(this);
		this.rest = rest;
	}
	Utils.inherits(LocalDevice, DeviceDetails);

	LocalDevice.load = function(rest) {
		var device = new LocalDevice(rest);

		return device.loadPersisted().then(function() {
			return device;
		});
	};

	LocalDevice.prototype.loadPersisted = function() {
		return Promise.all([
			Platform.push.storage.get(persistKeys.deviceId),
			Platform.push.storage.get(persistKeys.deviceSecret),
			Platform.push.storage.get(persistKeys.deviceIdentityToken),
			Platform.push.storage.get(persistKeys.pushRecipient),
		]).then(function(storage) {
			this.platform = Platform.push.platform;
			this.clientId = this.rest.auth.clientId;
			this.formFactor = Platform.push.formFactor;
			this.id = storage[0];

			if(this.id) {
				this.deviceSecret = storage[1] || null;
				this.deviceIdentityToken = JSON.parse(storage[2] || 'null');
				this.push.recipient = JSON.parse(storage[3] || 'null');
			} else {
				this.resetId();
			}
		}.bind(this));
	};

	LocalDevice.prototype.persist = function() {
		const promises = [];
		promises.push(Platform.push.storage.set(persistKeys.deviceId, this.id));
		promises.push(Platform.push.storage.set(persistKeys.deviceSecret, this.deviceSecret));
		if(this.deviceIdentityToken) {
			promises.push(Platform.push.storage.set(persistKeys.deviceIdentityToken, JSON.stringify(this.deviceIdentityToken)));
		}
		if(this.push.recipient) {
			promises.push(Platform.push.storage.set(persistKeys.pushRecipient, JSON.stringify(this.push.recipient)));
		}

		return Promise.all(promises);
	};

	LocalDevice.prototype.resetId = function() {
		this.id = ulid();
		this.deviceSecret = ulid();
		this.persist();
	};

	LocalDevice.prototype.getAuthDetails = function(rest, headers, params, errCallback, opCallback) {
		var token = this.deviceIdentityToken.token;
		if(!token) {
			errCallback(new ErrorInfo('Unable to update device registration; no deviceIdentityToken', 50000, 500));
			return;
		}
		if (Http.supportsAuthHeaders) {
			opCallback(Utils.mixin({authorization: 'Bearer ' + toBase64(token)}, headers), params);
		} else {
			opCallback(headers, Utils.mixin({access_token: token}, params));
		}
	};

	return LocalDevice;
})();
