var PushChannelSubscription = (function() {

	function PushChannelSubscription() {
		this.channel = undefined;
		this.deviceId = undefined;
		this.clientId = undefined;
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PushChannelSubscription.prototype.toJSON = function() {
		return {
			channel: this.channel,
			deviceId: this.deviceId,
			clientId: this.clientId
		};
	};

	PushChannelSubscription.prototype.toString = function() {
		var result = '[PushChannelSubscription';
		if(this.channel)
			result += '; channel=' + this.channel;
		if(this.deviceId)
			result += '; deviceId=' + this.deviceId;
		if(this.clientId)
			result += '; clientId=' + this.clientId;
		result += ']';
		return result;
	};

	PushChannelSubscription.toRequestBody = Utils.encodeBody;

	PushChannelSubscription.fromResponseBody = function(body, format) {
		if(format) {
			body = Utils.decodeBody(body, format);
		}

		if(Utils.isArray(body)) {
			return PushChannelSubscription.fromValuesArray(body);
		} else {
			return PushChannelSubscription.fromValues(body);
		}
	};

	PushChannelSubscription.fromValues = function(values) {
		return Utils.mixin(new PushChannelSubscription(), values);
	};

	PushChannelSubscription.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PushChannelSubscription.fromValues(values[i]);
		return result;
	};

	return PushChannelSubscription;
})();
