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
		this.platform = Platform.push.platform;
		this.clientId = this.rest.auth.clientId;
		this.formFactor = Platform.push.formFactor;
		this.id = Platform.push.storage.get(persistKeys.deviceId);
		if (!this.id) {
			this.resetId();
		}
		this.updateToken = Platform.push.storage.get(persistKeys.updateToken) || null;
		this.push.recipient = JSON.parse(Platform.push.storage.get(persistKeys.pushRecipient) || 'null');
	};

	LocalDevice.prototype.persist = function() {
		Platform.push.storage.set(persistKeys.deviceId, this.id);
		Platform.push.storage.set(persistKeys.updateToken, this.updateToken);
		Platform.push.storage.set(persistKeys.pushRecipient, JSON.stringify(this.push.recipient));
	};

	LocalDevice.prototype.resetId = function() {
		this.id = ulid();
		this.persist();		
	};

	return LocalDevice;
})();
