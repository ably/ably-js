var Push = (function() {
	var msgpack = Platform.msgpack;
	var nop = function() {};

	function Push(rest) {
		this.rest = rest;
		this.admin = new Admin(rest);
	};

	Push.prototype.publish = function(recipient, payload, callback) {
		var rest = this.rest;
		var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			requestBody = Utils.mixin({recipient: recipient}, payload),
			headers = Utils.defaultPostHeaders(format),
			params = {};

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.post(rest, '/push/publish', requestBody, headers, params, false, callback);
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
			headers = Utils.defaultPostHeaders(format),
			params = {};

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.put(rest, '/push/deviceRegistrations/' + encodeURIComponent(device.id), requestBody, headers, params, false, callback);
	};

	DeviceRegistrations.prototype.get = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

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

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		Resource['delete'](rest, '/push/deviceRegistrations', headers, params, false, callback);
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

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
		Resource.post(rest, '/push/channelSubscriptions', requestBody, headers, params, false, callback);
	};

	ChannelSubscriptions.prototype.get = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

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

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

		Resource['delete'](rest, '/push/channelSubscriptions', headers, params, false, callback);
	};

	ChannelSubscriptions.prototype.listChannels = function(params, callback) {
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			envelope = Http.supportsLinkHeaders ? undefined : format,
			headers = Utils.copy(Utils.defaultGetHeaders(format));

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		if(rest.options.pushFullWait)
			Utils.mixin(params, {fullWait: 'true'});

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

	var persistKeys = {
		activationState: 'ably.push.activationState',
	};

	var ActivationStateMachine = function(rest) {
		this.rest = rest;
		if (!Platform.push) {
			throw new Error('this platform is not supported as a target of push notifications');
		}
		this.current = ActivationStateMachine[Platform.push.storage.get(persistKeys.activationState) || 'NotActivated'];
		this.pendingEvents = [];
	};

	Push.prototype.stateMachine = (function() {
		var machine = null;
		return function() {
			if (!machine) {
				machine = new ActivationStateMachine(this.rest);
				machine.customRegisterer = null;
				machine.customDeregisterer = null;
			}
			return machine;
		};
	})();

	Push.prototype.activate = function(customRegisterer, callback) {
		this.stateMachine().activatedCallback = callback || nop;
		this.stateMachine().handleEvent(new ActivationStateMachine.CalledActivate(this.stateMachine(), customRegisterer));
	};

	Push.prototype.deactivate = function(customDeregisterer, callback) {
		this.stateMachine().deactivatedCallback = callback || nop;
		this.stateMachine().handleEvent(new ActivationStateMachine.CalledDeactivate(this.stateMachine(), customDeregisterer));
	};

	// Events

	var CalledActivate = function(machine, customRegisterer) {
		machine.customRegisterer = customRegisterer || false;
		machine.persist();
	};
	ActivationStateMachine.CalledActivate = CalledActivate; 

	var CalledDeactivate = function(machine, customDeregisterer) {
		machine.customDeregisterer = customDeregisterer || false;
		machine.persist();
	};
	ActivationStateMachine.CalledDeactivate = CalledDeactivate; 

	var GotPushDeviceDetails = function() {};
	ActivationStateMachine.GotPushDeviceDetails = GotPushDeviceDetails; 

	var GettingPushDeviceDetailsFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.GettingPushDeviceDetailsFailed = GettingPushDeviceDetailsFailed; 

	var GotUpdateToken = function(updateToken) {
		this.updateToken = updateToken;
	};
	ActivationStateMachine.GotUpdateToken = GotUpdateToken; 

	var GettingUpdateTokenFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.GettingUpdateTokenFailed = GettingUpdateTokenFailed; 

	var RegistrationUpdated = function() {};
	ActivationStateMachine.RegistrationUpdated = RegistrationUpdated; 
	
	var UpdatingRegistrationFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.UpdatingRegistrationFailed = UpdatingRegistrationFailed; 

	var Deregistered = function() {};
	ActivationStateMachine.Deregistered = Deregistered;

	var DeregistrationFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.DeregistrationFailed = DeregistrationFailed; 

	// States

	var NotActivated = function(machine, event) {
		if (event instanceof CalledDeactivate) {
			machine.deactivatedCallback(null);
			return NotActivated;
		} else if (event instanceof CalledActivate) {
			var device = machine.getDevice();

			if (device.updateToken != null) {
				// Already registered.
				machine.pendingEvents.push(event);
				return WaitingForNewPushDeviceDetails;
			}

			if (device.push.recipient) {
				machine.pendingEvents.push(new GotPushDeviceDetails());
			} else {
				Platform.push.getPushDeviceDetails(machine);
			}

			return WaitingForPushDeviceDetails;
		} else if (event instanceof GotPushDeviceDetails) {
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.NotActivated = NotActivated;

	var WaitingForPushDeviceDetails = function(machine, event) {
		if (event instanceof CalledActivate) {
			return WaitingForPushDeviceDetails;
		} else if (event instanceof CalledDeactivate) {
			machine.deactivatedCallback(null);
			return NotActivated;
		} else if (event instanceof GotPushDeviceDetails) {
			var device = machine.getDevice();

			if (machine.customRegisterer) {
				machine.callCustomRegisterer(device, true);
			} else {
				var rest = machine.rest;
				var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
					requestBody = DeviceDetails.fromValues(device),
					headers = Utils.defaultPostHeaders(format),
					params = {};

				if(rest.options.headers)
					Utils.mixin(headers, rest.options.headers);

				if(rest.options.pushFullWait)
					Utils.mixin(params, {fullWait: 'true'});

				requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true) : JSON.stringify(requestBody);
				Resource.post(rest, '/push/deviceRegistrations', requestBody, headers, params, false, function(err, responseBody) {
					if (err) {
						machine.handleEvent(new GettingUpdateTokenFailed(err));
					} else {
						machine.handleEvent(new GotUpdateToken(responseBody.updateToken));
					}
				});
			}

			return WaitingForUpdateToken;
		} else if (event instanceof GettingPushDeviceDetailsFailed) {
			machine.activatedCallback(event.reason);
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.WaitingForPushDeviceDetails = WaitingForPushDeviceDetails;

	var WaitingForUpdateToken = function(machine, event) {
		if (event instanceof CalledActivate) {
			return WaitingForUpdateToken;
		} else if (event instanceof GotUpdateToken) {
			var device = machine.getDevice();
			device.updateToken = event.updateToken;
			device.persist();
			machine.activatedCallback(null);
			return WaitingForNewPushDeviceDetails;
		} else if (event instanceof GettingUpdateTokenFailed) {
			machine.activatedCallback(event.reason);
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.WaitingForUpdateToken = WaitingForUpdateToken;

	var WaitingForNewPushDeviceDetails = function(machine, event) {
		if (event instanceof CalledActivate) {
			machine.activatedCallback(null);
			return WaitingForNewPushDeviceDetails;
		} else if (event instanceof CalledDeactivate) {
			machine.deregister();
			return WaitingForDeregistration(WaitingForNewPushDeviceDetails);
		} else if (event instanceof GotPushDeviceDetails) {
			machine.updateRegistration();
			return WaitingForRegistrationUpdate;
		}
	};
	ActivationStateMachine.WaitingForNewPushDeviceDetails = WaitingForNewPushDeviceDetails;

	var WaitingForRegistrationUpdate = function(machine, event) {
		if (event instanceof CalledActivate) {
			machine.activatedCallback(null);
			return WaitingForRegistrationUpdate;
		} else if (event instanceof RegistrationUpdated) {
			return WaitingForNewPushDeviceDetails;
		} else if (event instanceof UpdatingRegistrationFailed) {
			// TODO: Here we could try to recover ourselves if the error is e. g.
			// a networking error. Just notify the user for now.
			machine.callUpdateRegistrationFailedCallback(event.reason);
			return AfterRegistrationUpdateFailed;
		}
		return null;
	};
	ActivationStateMachine.WaitingForRegistrationUpdate = WaitingForRegistrationUpdate;

	var AfterRegistrationUpdateFailed = function(machine, event) {
		if (event instanceof CalledActivate || event instanceof GotPushDeviceDetails) {
			machine.updateRegistration();
			return WaitingForRegistrationUpdate;
		} else if (event instanceof CalledDeactivate) {
			machine.deregister();
			return WaitingForDeregistration(AfterRegistrationUpdateFailed);
		}
		return null;
	};
	ActivationStateMachine.AfterRegistrationUpdateFailed = AfterRegistrationUpdateFailed;

	var WaitingForDeregistration = function(previousState) {
		return function(machine, event) {
			if (event instanceof CalledDeactivate) {
				return WaitingForDeregistration(previousState);
			} else if (event instanceof Deregistered) {
				var device = machine.getDevice();
				device.updateToken = null;
				device.resetId();
				device.persist();
				machine.deactivatedCallback(null);
				return NotActivated;
			} else if (event instanceof DeregistrationFailed) {
				machine.deactivatedCallback(event.reason);
				return previousState;
			}
			return null;
		};
	};
	ActivationStateMachine.WaitingForDeregistration = WaitingForDeregistration;

	ActivationStateMachine.prototype.getDevice = function() {
		return this.rest.device();
	};

	function isPersistentState(state) {
		return (
			state.name == 'NotActivated' ||
			state.name == 'WaitingForNewPushDeviceDetails'
		);
	}

	ActivationStateMachine.prototype.persist = function() {
		if (isPersistentState(this.current)) {
			Platform.push.storage.set(persistKeys.activationState, this.current.name);
		}
	};

	ActivationStateMachine.prototype.callUpdateRegistrationFailedCallback = function(reason) {
		// TODO: Should this an event on an EventEmitter? If so, who's the EventEmitter?
		// Rest.push?
	};

	ActivationStateMachine.prototype.callCustomRegisterer = function(device, isNew) {
		this.customRegisterer(device, isNew, function(err, updateToken) {
			if (err) {
				if (isNew) {
					this.handleEvent(new GettingUpdateTokenFailed(error));
				} else {
					this.handleEvent(new UpdatingRegistrationFailed(error));
				}
				return;
			}

			if (isNew) {
				this.handleEvent(new GotUpdateToken(updateToken));
			} else {
				this.handleEvent(new RegistrationUpdated());
			}
		}.bind(this));
	};

	ActivationStateMachine.prototype.callCustomDeregisterer = function() {
		this.customDeregisterer(device, function(err) {
			if (err) {
				this.handleEvent(new DeregistrationFailed(err));
				return;
			}
			this.handleEvent(new Deregistered());
		}.bind(this));
	};

	ActivationStateMachine.prototype.updateRegistration = function() {
		if (this.customRegisterer) {
			this.callCustomRegisterer(this.getDevice(), false);
		} else {
			// TODO: Use deviceToken once that's done. Right now it just uses
			// the Ably token, which will fail with push-subscribe. It expects
			// the updateToken in the auth header instead, but since that's
			// away I won't bother implementing it.

			var rest = this.rest;
			var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
				requestBody = DeviceDetails.fromValues(device),
				headers = Utils.defaultPostHeaders(format),
				params = {};

			if(rest.options.headers)
				Utils.mixin(headers, rest.options.headers);

			if(rest.options.pushFullWait)
				Utils.mixin(params, {fullWait: 'true'});

			requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true) : JSON.stringify(requestBody);
			Resource.patch(rest, '/push/deviceRegistrations', requestBody, headers, params, false, function(err, responseBody) {
				if (err) {
					this.handleEvent(new GettingUpdateTokenFailed(err));
				} else {
					this.handleEvent(new GotUpdateToken(responseBody.updateToken));
				}
			}.bind(this));
		}
	};

	ActivationStateMachine.prototype.deregister = function() {
		if (this.customDeregisterer) {
			this.callCustomDeregisterer(this.getDevice());
		} else {
			var rest = this.rest;
			var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
				headers = Utils.defaultPostHeaders(format),
				params = {deviceId: rest.device().id};

			if(rest.options.headers)
				Utils.mixin(headers, rest.options.headers);

			if(rest.options.pushFullWait)
				Utils.mixin(params, {fullWait: 'true'});

			Resource.delete(rest, '/push/deviceRegistrations', headers, params, false, function(err, responseBody) {
				if (err) {
					this.handleEvent(new DeregistrationFailed(err));
				} else {
					this.handleEvent(new Deregistered());
				}
			}.bind(this));
		}
	};

	ActivationStateMachine.prototype.handleEvent = (function() {
		var handling = false;
		return function(event) {
			if (handling) {
				setTimeout(function() {
					this.handleEvent(event);
				}.bind(this), 0);
				return;
			}

			handling = true;
			Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'handling event ' + event.constructor.name + ' from ' + this.current.name);

			var maybeNext = this.current(this, event);
			if (!maybeNext) {
				Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'enqueing event: ' + event.constructor.name);
				this.pendingEvents.push(event);
				handling = false;
				return;	
			}

			Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'transition: ' + this.current.name + ' -(' + event.constructor.name + ')-> ' + maybeNext.name);
			this.current = maybeNext;

			while (true) {
				var pending = this.pendingEvents.length > 0 ? this.pendingEvents[0] : null;
				if (!pending) {
					break;
				}

				Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'attempting to consume pending event: ' + pending.constructor.name);

				maybeNext = this.current(this, pending);
				if (!maybeNext) {
					break;
				}
				this.pendingEvents.splice(0, 1);

				Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'transition: ' + this.current.name + ' -(' + pending.constructor.name + ')-> ' + maybeNext.name);
				this.current = maybeNext;
			}

			this.persist();
			handling = false;
		}
	})();

	return Push;
})();
