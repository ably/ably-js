var Push = (function() {
	var msgpack = (typeof require !== 'function') ? Ably.msgpack : require('msgpack-js');

	function Push(rest) {
		this.rest = rest;
		this.admin = new Admin(rest);
	}

	Push.prototype.publish = function(recipient, payload, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
		    requestBody = Utils.mixin({recipient: recipient}, payload),
		    headers = Utils.defaultPostHeaders(format);

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.post(rest, '/push/publish', requestBody, headers, null, false, callback);
	};

	function Admin(rest) {
		this.deviceRegistrations = new DeviceRegistrations(rest);
		this.channelSubscriptions = new ChannelSubscriptions(rest);
	}

	function DeviceRegistrations(rest) {
		this.rest = rest;
	}

	DeviceRegistrations.prototype.save = function(device, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
		    requestBody = DeviceDetails.fromValues(device),
		    headers = Utils.defaultPostHeaders(format);

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.put(rest, '/push/deviceRegistrations/' + encodeURIComponent(device.id), requestBody, headers, null, false, callback);
	};

	DeviceRegistrations.prototype.get = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, '/push/deviceRegistrations', headers, envelope, function(body, headers, unpacked) {
			return DeviceDetails.fromResponseBody(body, !unpacked && format);
		})).get(params, callback);
	};

	DeviceRegistrations.prototype.remove = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Resource.delete(rest, '/push/deviceRegistrations', headers, params, false, callback);
	};

	function ChannelSubscriptions(rest) {
		this.rest = rest;
	}

	ChannelSubscriptions.prototype.save = function(subscription, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
		    requestBody = PushChannelSubscription.fromValues(subscription),
		    headers = Utils.defaultPostHeaders(format);

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.post(rest, '/push/channelSubscriptions', requestBody, headers, null, false, callback);
	};

	ChannelSubscriptions.prototype.get = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, '/push/channelSubscriptions', headers, envelope, function(body, headers, unpacked) {
			return PushChannelSubscription.fromResponseBody(body, !unpacked && format);
		})).get(params, callback);
	};

	ChannelSubscriptions.prototype.remove = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Resource.delete(rest, '/push/channelSubscriptions', headers, params, false, callback);
	};

	ChannelSubscriptions.prototype.listChannels = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, '/push/channels', headers, envelope, function(body, headers, unpacked) {
			var f = !unpacked && format;

			if(f)
				body = (f == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));

			for(var i = 0; i < body.length; i++) {
				body[i] = String(body[i]);
			}
			return body;
		})).get(params, callback);
	};

	return Push;
})();
