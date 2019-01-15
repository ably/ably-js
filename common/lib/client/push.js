var Push = (function() {
	var noop = function() {};

	function Push(rest) {
		this.rest = rest;
		this.admin = new Admin(rest);
	}

	function Admin(rest) {
		this.rest = rest;
		this.deviceRegistrations = new DeviceRegistrations(rest);
		this.channelSubscriptions = new ChannelSubscriptions(rest);
	}

	Admin.prototype.publish = function(recipient, payload, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			requestBody = Utils.mixin({recipient: recipient}, payload),
			headers = Utils.defaultPostHeaders(format),
			params = {};

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'publish', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = Utils.encodeBody(requestBody, format);
		Resource.post(rest, '/push/publish', requestBody, headers, params, false, function(err) { callback(err); });
	};

	function DeviceRegistrations(rest) {
		this.rest = rest;
	}

	DeviceRegistrations.prototype.save = function(device, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			requestBody = DeviceDetails.fromValues(device),
			headers = Utils.defaultPostHeaders(format),
			params = {};

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'save', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = Utils.encodeBody(requestBody, format);
		Resource.put(rest, '/push/deviceRegistrations/' + encodeURIComponent(device.id), requestBody, headers, params, false, function(err, body, headers, unpacked) {
			callback(err, !err && DeviceDetails.fromResponseBody(body, !unpacked && format));
		});
	};

	DeviceRegistrations.prototype.get = function(deviceIdOrDetails, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.defaultGetHeaders(format),
			deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'get', arguments);
			}
			callback = noop;
		}

		if(typeof deviceId !== 'string' || !deviceId.length) {
			callback(new ErrorInfo('First argument to DeviceRegistrations#get must be a deviceId string or DeviceDetails', 40000, 400));
			return;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Resource.get(rest, '/push/deviceRegistrations/' + encodeURIComponent(deviceId), headers, {}, false, function(err, body, headers, unpacked) {
			callback(err, !err && DeviceDetails.fromResponseBody(body, !unpacked && format));
		});
	};

	DeviceRegistrations.prototype.list = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.defaultGetHeaders(format);

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'list', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, '/push/deviceRegistrations', headers, envelope, function(body, headers, unpacked) {
			return DeviceDetails.fromResponseBody(body, !unpacked && format);
		})).get(params, callback);
	};

	DeviceRegistrations.prototype.remove = function(deviceIdOrDetails, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.defaultGetHeaders(format),
			params = {},
			deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'remove', arguments);
			}
			callback = noop;
		}

		if(typeof deviceId !== 'string' || !deviceId.length) {
			callback(new ErrorInfo('First argument to DeviceRegistrations#remove must be a deviceId string or DeviceDetails', 40000, 400));
			return;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		Resource['delete'](rest, '/push/deviceRegistrations/' + encodeURIComponent(deviceId), headers, params, false, function(err) { callback(err); });
	};

	DeviceRegistrations.prototype.removeWhere = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.defaultGetHeaders(format);

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'removeWhere', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		Resource['delete'](rest, '/push/deviceRegistrations', headers, params, false, function(err) { callback(err); });
	};

	function ChannelSubscriptions(rest) {
		this.rest = rest;
	}

	ChannelSubscriptions.prototype.save = function(subscription, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			requestBody = PushChannelSubscription.fromValues(subscription),
			headers = Utils.defaultPostHeaders(format),
			params = {};

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'save', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = Utils.encodeBody(requestBody, format);
		Resource.post(rest, '/push/channelSubscriptions', requestBody, headers, params, false, function(err, body, headers, unpacked) {
			callback(err, !err && PushChannelSubscription.fromResponseBody(body, !unpacked && format));
		});
	};

	ChannelSubscriptions.prototype.list = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.defaultGetHeaders(format);

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'list', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, '/push/channelSubscriptions', headers, envelope, function(body, headers, unpacked) {
			return PushChannelSubscription.fromResponseBody(body, !unpacked && format);
		})).get(params, callback);
	};

	ChannelSubscriptions.prototype.removeWhere = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.defaultGetHeaders(format);

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'removeWhere', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		Resource['delete'](rest, '/push/channelSubscriptions', headers, params, false, function(err) { callback(err); });
	};

	/* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
	ChannelSubscriptions.prototype.remove = ChannelSubscriptions.prototype.removeWhere;

	ChannelSubscriptions.prototype.listChannels = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.defaultGetHeaders(format);

		if(typeof callback !== 'function') {
			if(this.rest.options.promises) {
				return Utils.promisify(this, 'listChannels', arguments);
			}
			callback = noop;
		}

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		(new PaginatedResource(rest, '/push/channels', headers, envelope, function(body, headers, unpacked) {
			var f = !unpacked && format;

			if(f) {
				body = Utils.decodeBody(body, format);
			}

			for(var i = 0; i < body.length; i++) {
				body[i] = String(body[i]);
			}
			return body;
		})).get(params, callback);
	};

	return Push;
})();
