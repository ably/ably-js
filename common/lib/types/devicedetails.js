var DeviceDetails = (function() {
	var msgpack = (typeof require !== 'function') ? Ably.msgpack : require('msgpack-js');

	function DeviceDetails() {
		this.id = undefined;
		this.platform = undefined;
		this.formFactor = undefined;
		this.clientId = undefined;
		this.metadata = undefined;
		this.updateToken = undefined;
		this.push = {
			transportType: undefined,
			state: undefined,
			errorReason: undefined,
			metadata: undefined,
		};
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	DeviceDetails.prototype.toJSON = function() {
		return {
			id: this.id,
			platform: this.platform,
			formFactor: this.formFactor,
			clientId: this.clientId,
			metadata: this.metadata,
			updateToken: this.updateToken,
			push: {
				transportType: this.push.transportType,
				state: this.push.state,
				errorReason: this.push.errorReason,
				metadata: this.push.metadata,
			},
		};
	};

	DeviceDetails.prototype.toString = function() {
		var result = '[DeviceDetails';
		if(this.id)
			result += '; id=' + this.id;
		if(this.platform)
			result += '; platform=' + this.platform;
		if(this.formFactor)
			result += '; formFactor=' + this.formFactor;
		if(this.clientId)
			result += '; clientId=' + this.clientId;
		if(this.metadata)
			result += '; metadata=' + this.metadata;
		if(this.updateToken)
			result += '; updateToken=' + this.updateToken;
		if(this.push.transportType)
			result += '; push.transportType=' + this.push.transportType;
		if(this.push.state)
			result += '; push.state=' + this.push.state;
		if(this.push.errorReason)
			result += '; push.errorReason=' + this.push.errorReason;
		if(this.push.metadata)
			result += '; push.metadata=' + this.push.metadata;
		result += ']';
		return result;
	};

	DeviceDetails.toRequestBody = function(subscription, format) {
		return (format == 'msgpack') ? msgpack.encode(subscription, true): JSON.stringify(subscription);
	};

	DeviceDetails.fromResponseBody = function(body, format) {
		if(format)
			body = (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

		for(var i = 0; i < body.length; i++) {
			body[i] = DeviceDetails.fromDecoded(body[i]);
		}
		return body;
	};

	DeviceDetails.fromDecoded = function(values) {
		return Utils.mixin(new DeviceDetails(), values);
	};

	DeviceDetails.fromValues = function(values) {
		return Utils.mixin(new DeviceDetails(), values);
	};

	DeviceDetails.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = DeviceDetails.fromValues(values[i]);
		return result;
	};

	return DeviceDetails;
})();
