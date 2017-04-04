var PushChannel = (function() {
	var msgpack = (typeof require !== 'function') ? Ably.msgpack : require('msgpack-js');

	function noop() {}

	/* public constructor */
	function PushChannel(channel) {
		this.channel = channel;
		this.rest = channel.rest;
	}

	PushChannel.prototype.subscribeClientId = function(callback) {
		var self = this;
		var rest = this.rest;
		this._getClientId(callback, function(clientId) {
			var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			    requestBody = {clientId: clientId, channel: self.channel.name},
			    headers = Utils.copy(Utils.defaultPostHeaders(format));

			if(rest.options.headers)
				Utils.mixin(headers, rest.options.headers);

			requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
			Resource.post(rest, '/push/channelSubscriptions', requestBody, headers, null, false, callback);
		});
	};

	PushChannel.prototype.unsubscribeClientId = function(callback) {
		var self = this;
		var rest = this.rest;
		this._getClientId(callback, function(clientId) {
			var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			    headers = Utils.copy(Utils.defaultPostHeaders(format));

			if(rest.options.headers)
				Utils.mixin(headers, rest.options.headers);

			Resource.delete(rest, '/push/channelSubscriptions', headers, {clientId: clientId, channel: self.channel.name}, false, callback);
		});
	};

	PushChannel.prototype.getSubscriptions = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'PushChannel.getSubscriptions()', 'channel = ' + this.channel.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}

		this._getSubscriptions(params, callback);
	};

	PushChannel.prototype._getSubscriptions = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			channel = this.channel;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		params = params || {};
		params.channel = channel.name;

		(new PaginatedResource(rest, '/push/channelSubscriptions', headers, envelope, function(body, headers, unpacked) {
			return PushChannelSubscription.fromResponseBody(body, !unpacked && format);
		})).get(params, callback);
	};

	PushChannel.prototype._getClientId = function(callbackErr, callbackOk) {
		var clientId = this.rest.auth.clientId;
		if (clientId) {
			callbackOk(clientId);
		} else {
			callbackErr(new ErrorInfo("cannot subscribe from REST client with null client ID", 50000, 500));
		}
	}

	return PushChannel;
})();
