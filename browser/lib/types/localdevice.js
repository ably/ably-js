var LocalDevice = (function() {
	const persistKeys = {
		deviceId: 'ably.push.deviceId',
		updateToken: 'ably.push.updateToken',
		pushRecipient: 'ably.push.pushRecipient',
	};

	function LocalDevice(rest) {
		LocalDevice.super_.call(this);
		this.rest = rest;
	};
	Utils.inherits(LocalDevice, DeviceDetails);

	LocalDevice.load = function(rest) {
		let device = new LocalDevice(rest);
		device.loadPersisted();
		return device;
	};

	LocalDevice.prototype.loadPersisted = function() {
		this.platform = Platform.pushPlatform;
		this.clientId = this.rest.auth.clientId;
		this.formFactor = Platform.pushFormFactor;
		this.id = WebStorage.get(persistKeys.deviceId);
		if (!this.id) {
			this.resetId();
		}
		this.updateToken = WebStorage.get(persistKeys.updateToken) || null;
		this.push.recipient = JSON.parse(WebStorage.get(persistKeys.pushRecipient) || 'null');
	};

	LocalDevice.prototype.persist = function() {
		WebStorage.set(persistKeys.deviceId, this.id);
		WebStorage.set(persistKeys.updateToken, this.updateToken);
		WebStorage.set(persistKeys.pushRecipient, JSON.stringify(this.push.recipient));
	};

	LocalDevice.prototype.resetId = function() {
		this.id = ulid();
		this.persist();		
	};

	return LocalDevice;
})();
