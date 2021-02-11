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
		device.loadPersisted();
		return device;
	};

	LocalDevice.prototype.loadPersisted = function() {
		this.platform = Platform.push.platform;
		this.clientId = this.rest.auth.clientId;
		this.formFactor = Platform.push.formFactor;
		this.id = Platform.push.storage.get(persistKeys.deviceId);
		if(this.id) {
			this.deviceSecret = Platform.push.storage.get(persistKeys.deviceSecret) || null;
			this.deviceIdentityToken = JSON.parse(Platform.push.storage.get(persistKeys.deviceIdentityToken) || 'null');
			this.push.recipient = JSON.parse(Platform.push.storage.get(persistKeys.pushRecipient) || 'null');
		} else {
			this.resetId();
		}
	};

	LocalDevice.prototype.persist = function() {
		Platform.push.storage.set(persistKeys.deviceId, this.id);
		Platform.push.storage.set(persistKeys.deviceSecret, this.deviceSecret);
		if(this.deviceIdentityToken) {
			Platform.push.storage.set(persistKeys.deviceIdentityToken, JSON.stringify(this.deviceIdentityToken));
		}
		if(this.push.recipient) {
			Platform.push.storage.set(persistKeys.pushRecipient, JSON.stringify(this.push.recipient));
		}
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
