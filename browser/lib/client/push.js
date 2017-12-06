var Push = (function() {
	Rest.prototype.device = (function() {
		let device = null;
		return function() {
			if (!device) {
				device = LocalDevice.load(this);
			}
			return device;
		}
	})();

	const persistKeys = {
		activationState: 'ably.push.activationState',
		useCustomRegisterer: 'ably.push.useCustomRegisterer',
		useCustomDeregisterer: 'ably.push.useCustomDeregisterer',
	};

	function Push() {
		this.construct.apply(this, arguments);
	};

	PushBase(Push);

	let ActivationStateMachine = function(rest) {
		this.rest = rest;
		this.current = ActivationStateMachine[WebStorage.get(persistKeys.activationState) || 'NotActivated'];
		this.useCustomRegisterer = WebStorage.get(persistKeys.useCustomRegisterer) || false;
		this.useCustomDeregisterer = WebStorage.get(persistKeys.useCustomDeregisterer) || false;
		this.pendingEvents = [];
	};

	Push.prototype.stateMachine = (function() {
		let machine = null;
		return function() {
			if (!machine) {
				machine = new ActivationStateMachine(this.rest);
			}
			return machine;
		};
	})();

	Push.prototype.activate = function(useCustomRegisterer, callback) {
		this.stateMachine().activatedCallback = callback;
		this.stateMachine().handleEvent(new ActivationStateMachine.CalledActivate(this.stateMachine(), useCustomRegisterer));
	};

	Push.prototype.deactivate = function(useCustomDeregisterer, callback) {
		this.stateMachine().deactivatedCallback = callback;
		this.stateMachine().handleEvent(new ActivationStateMachine.CalledDeactivate(this.stateMachine(), useCustomDeregisterer));
	};

	// Events

	let CalledActivate = function(machine, useCustomRegisterer) {
		machine.useCustomRegisterer = useCustomRegisterer || false;
		machine.persist();
	};
	ActivationStateMachine.CalledActivate = CalledActivate; 

	let CalledDeactivate = function(machine, useCustomDeregisterer) {
		machine.useCustomDeregisterer = useCustomDeregisterer || false;
		machine.persist();
	};
	ActivationStateMachine.CalledDeactivate = CalledDeactivate; 

	let GotPushDeviceDetails = function() {};
	ActivationStateMachine.GotPushDeviceDetails = GotPushDeviceDetails; 

	let GettingPushDeviceDetailsFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.GettingPushDeviceDetailsFailed = GettingPushDeviceDetailsFailed; 

	let GotUpdateToken = function(updateToken) {
		this.updateToken = updateToken;
	};
	ActivationStateMachine.GotUpdateToken = GotUpdateToken; 

	let GettingUpdateTokenFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.GettingUpdateTokenFailed = GettingUpdateTokenFailed; 

	let RegistrationUpdated = function() {};
	ActivationStateMachine.RegistrationUpdated = RegistrationUpdated; 
	
	let UpdatingRegistrationFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.UpdatingRegistrationFailed = UpdatingRegistrationFailed; 

	let Deregistered = function() {};
	ActivationStateMachine.Deregistered = Deregistered;

	let DeregistrationFailed = function(reason) {
		this.reason = reason;
	};
	ActivationStateMachine.DeregistrationFailed = DeregistrationFailed; 

	// States

	let NotActivated = function(machine, event) {
		if (event instanceof CalledDeactivate) {
			machine.callDeactivatedCallback(null);
			return NotActivated;
		} else if (event instanceof CalledActivate) {
			let device = machine.getDevice();

			if (device.updateToken != null) {
				// Already registered.
				machine.pendingEvents.push(event);
				return WaitingForNewPushDeviceDetails;
			}

			if (device.push.recipient) {
				machine.pendingEvents.push(new GotPushDeviceDetails());
			}

			let withPermissionCalled = false;
			function withPermission(permission) {
				if (withPermissionCalled) {
					return;
				}
				withPermissionCalled = true;

				if (permission !== 'granted') {
					machine.handleEvent(new GettingPushDeviceDetailsFailed(new Error(`user denied permission to send notifications.`)));
					return;
				}


				// TODO: sw.js should be a ClientOption or an argument to push.activate
				navigator.serviceWorker.register('sw.js').then(function(worker) {
					var subscribe = function() {
						// TODO: appServerKey is Ably's public key, should be retrieved
						// from the server.
						const appServerKey = 'BCHetocdFiZiT8YwGRPcYeRB1fjoDxQOs73hnDO9Rni0mCh9sfZBa-gfT1P7irZyaiQfZPOdogytTdJUuOXwO9E=';

						worker.pushManager.subscribe({
							userVisibleOnly: true,
							applicationServerKey: urlBase64ToUint8Array(appServerKey),
						}).then(function(subscription) {
							var endpoint = subscription.endpoint;
							var p256dh = toBase64Url(subscription.getKey('p256dh'));
							var auth = toBase64Url(subscription.getKey('auth'));
							var key = [p256dh, auth].join(':');

							var device = machine.getDevice();
							device.push.recipient = {
								transportType: 'web',
								targetUrl: btoa(endpoint),
								encryptionKey: key,
							};
							device.persist();

							machine.handleEvent(new GotPushDeviceDetails());
						}).catch(function(err) {
							machine.handleEvent(new GettingPushDeviceDetailsFailed(err));
						});
					}

					worker.pushManager.getSubscription().then(function(subscription) {
						if (subscription) {
							subscription.unsubscribe().then(subscribe);
						} else {
							subscribe();
						}
					});
				}).catch(function(err) {
					machine.handleEvent(new GettingPushDeviceDetailsFailed(err));
				});
			};

			// requestPermission sometimes takes a callback and sometimes
			// returns a Promise. And sometimes both!
			let maybePermissionPromise = Notification.requestPermission(withPermission);
			if (maybePermissionPromise) {
				maybePermissionPromise.then(withPermission);
			}

			return WaitingForPushDeviceDetails;
		} else if (event instanceof GotPushDeviceDetails) {
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.NotActivated = NotActivated;

	let WaitingForPushDeviceDetails = function(machine, event) {
		if (event instanceof CalledActivate) {
			return WaitingForPushDeviceDetails;
		} else if (event instanceof CalledDeactivate) {
			machine.callDeactivatedCallback(null);
			return NotActivated;
		} else if (event instanceof GotPushDeviceDetails) {
			let device = machine.getDevice();

			if (machine.useCustomRegisterer) {
				machine.callCustomRegisterer(device, true);
			} else {
				var rest = machine.rest;
				var format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
					requestBody = DeviceDetails.fromValues(device),
					headers = Utils.defaultPostHeaders(format);

				if(rest.options.headers)
					Utils.mixin(headers, rest.options.headers);

				requestBody = (format == 'msgpack') ? msgpack.encode(requestBody, true): JSON.stringify(requestBody);
				Resource.post(rest, '/push/deviceRegistrations', requestBody, headers, null, false, function(err, responseBody) {
					if (err) {
						machine.handleEvent(new GettingUpdateTokenFailed(err));
					} else {
						machine.handleEvent(new GotUpdateToken(responseBody.updateToken));
					}
				});
			}

			return WaitingForUpdateToken;
		} else if (event instanceof GettingPushDeviceDetailsFailed) {
			machine.callActivatedCallback(event.reason);
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.WaitingForPushDeviceDetails = WaitingForPushDeviceDetails;

	let WaitingForUpdateToken = function(machine, event) {
		if (event instanceof CalledActivate) {
			return WaitingForUpdateToken;
		} else if (event instanceof GotUpdateToken) {
			let device = machine.getDevice();
			device.updateToken = event.updateToken;
			device.persist();
			machine.callActivatedCallback(null);
			return WaitingForNewPushDeviceDetails;
		} else if (event instanceof GettingUpdateTokenFailed) {
			machine.callActivatedCallback(event.reason);
			return NotActivated;
		}
		return null;
	};
	ActivationStateMachine.WaitingForUpdateToken = WaitingForUpdateToken;

	let WaitingForNewPushDeviceDetails = function(machine, event) {
		if (event instanceof CalledActivate) {
			machine.callActivatedCallback(null);
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

	let WaitingForRegistrationUpdate = function(machine, event) {
		if (event instanceof CalledActivate) {
			machine.callActivatedCallback(null);
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

	let AfterRegistrationUpdateFailed = function(machine, event) {
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

	let WaitingForDeregistration = function(previousState) {
		return function(machine, event) {
			if (event instanceof CalledDeactivate) {
				return WaitingForDeregistration(previousState);
			} else if (event instanceof Deregistered) {
				let device = machine.getDevice();
				device.setUpdateToken(null);
				machine.callDeactivatedCallback(null);
				return NotActivated;
			} else if (event instanceof DeregistrationFailed) {
				machine.callDeactivatedCallback(event.reason);
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
			WebStorage.set(persistKeys.activationState, this.current.name);
		}
		WebStorage.set(persistKeys.useCustomRegisterer, this.useCustomRegisterer);
		WebStorage.set(persistKeys.useCustomDeregisterer, this.useCustomDeregisterer);
	};

	ActivationStateMachine.prototype.callActivatedCallback = function(reason) {
		// TODO: This should be an EventEmitter event, so that it can be
		// emitted by a ServiceWorker if in the future we want to support
		// something like the server activating/deactivating remotely the
		// device.
		this.activatedCallback(reason);
	};

	ActivationStateMachine.prototype.callDeactivatedCallback = function(reason) {
		// TODO: This should be an EventEmitter event, so that it can be
		// emitted by a ServiceWorker if in the future we want to support
		// something like the server activating/deactivating remotely the
		// device.
		this.deactivatedCallback(reason);
	};

	ActivationStateMachine.prototype.callUpdateRegistrationFailedCallback = function(reason) {
		throw new Error('TODO');
	};

	ActivationStateMachine.prototype.callCustomRegisterer = function(reason) {
		throw new Error('TODO');
	};

	ActivationStateMachine.prototype.updateRegistration = function() {
		throw new Error('TODO');
	};

	ActivationStateMachine.prototype.deregister = function() {
		throw new Error('TODO');
	};

	ActivationStateMachine.prototype.handleEvent = function(event) {
		Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'handling event ' + event.constructor.name + ' from ' + this.current.name);

		let maybeNext = this.current(this, event);
		if (!maybeNext) {
			Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'enqueing event: ' + event.constructor.name);
			this.pendingEvents.push(event);
			return;	
		}

		Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'transition: ' + this.current.name + ' -(' + event.constructor.name + ')-> ' + maybeNext.name);
		this.current = maybeNext;

		while (true) {
			let pending = this.pendingEvents.length > 0 ? this.pendingEvents[0] : null;
			if (!pending) {
				break;
			}

			Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'attempting to consume pending event: ' + pending.name);

			maybeNext = this.current(this, pending);
			if (!maybeNext) {
				break;
			}
			this.pendingEvents.splice(0, 1);

			Logger.logAction(Logger.LOG_MAJOR, 'Push.ActivationStateMachine.handleEvent()', 'transition: ' + this.current.name + ' -(' + pending.constructor.name + ')-> ' + maybeNext.name);
			this.current = maybeNext;
		}

		this.persist();
	};

	function toBase64Url(arrayBuffer) {
		var buffer = new Uint8Array(arrayBuffer.slice(0, arrayBuffer.byteLength));
		return btoa(String.fromCharCode.apply(null, buffer));
	}

	function urlBase64ToUint8Array(base64String) {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding)
			.replace(/\-/g, '+')
			.replace(/_/g, '/');
		const rawData = window.atob(base64);
		return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
	}

	return Push;
})();
