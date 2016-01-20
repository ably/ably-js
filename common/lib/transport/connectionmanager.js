var ConnectionManager = (function() {
	var readCookie = (typeof(Cookie) !== 'undefined' && Cookie.read);
	var createCookie = (typeof(Cookie) !== 'undefined' && Cookie.create);
	var eraseCookie = (typeof(Cookie) !== 'undefined' && Cookie.erase);
	var connectionKeyCookie = 'ably-connection-key';
	var connectionSerialCookie = 'ably-connection-serial';
	var actions = ProtocolMessage.Action;
	var PendingMessage = Protocol.PendingMessage;
	var noop = function() {};

	var isTokenErr = function(error) {
		return error.code && (error.code >= 40140) && (error.code < 40150);
	};

	var isErrFatal = function(err) {
		var UNRESOLVABLE_ERROR_CODES = [80015, 80017, 80030];

		if(err.code) {
			if(isTokenErr(err)) return false;
			if(Utils.arrIn(UNRESOLVABLE_ERROR_CODES, err.code)) return true;
			return (err.code >= 40000 && err.code < 50000)
		}
		// If no statusCode either, assume false
		return err.statusCode < 500;
	};

	function TransportParams(options, host, mode, connectionKey, connectionSerial) {
		this.options = options;
		this.host = host;
		this.mode = mode;
		this.connectionKey = connectionKey;
		this.connectionSerial = connectionSerial;
		this.format = options.useBinaryProtocol ? 'msgpack' : 'json';
	}

	TransportParams.prototype.getConnectParams = function(params) {
		params = params ? Utils.prototypicalClone(params) : {};
		var options = this.options;
		switch(this.mode) {
			case 'upgrade':
				params.upgrade = this.connectionKey;
				break;
			case 'resume':
				params.resume = this.connectionKey;
				if(this.connectionSerial !== undefined)
					params.connection_serial = this.connectionSerial;
				break;
			case 'recover':
				if(options.recover === true) {
					var connectionKey = readCookie(connectionKeyCookie),
						connectionSerial = readCookie(connectionSerialCookie);
					if(connectionKey !== null && connectionSerial !== null) {
						params.recover = connectionKey;
						params.connection_serial = connectionSerial;
					}
				} else {
					var match = options.recover.match(/^(\w+):(\w+)$/);
					if(match) {
						params.recover = match[1];
						params.connection_serial = match[2];
					}
				}
				break;
			default:
		}
		if(options.clientId !== undefined)
			params.clientId = options.clientId;
		if(options.echoMessages === false)
			params.echo = 'false';
		if(this.format !== undefined)
			params.format = this.format;
		if(this.stream !== undefined)
			params.stream = this.stream;
		if(options.transportParams !== undefined) {
			Utils.mixin(params, options.transportParams);
		}
		params.v = Defaults.apiVersion;
		return params;
	};

	/* public constructor */
	function ConnectionManager(realtime, options) {
		EventEmitter.call(this);
		this.realtime = realtime;
		this.options = options;
		var timeouts = options.timeouts;
		this.states = {
			initialized:   {state: 'initialized',   terminal: false, queueEvents: true,  sendEvents: false},
			connecting:    {state: 'connecting',    terminal: false, queueEvents: true,  sendEvents: false, retryDelay: timeouts.realtimeRequestTimeout, failState: 'disconnected'},
			connected:     {state: 'connected',     terminal: false, queueEvents: false, sendEvents: true,  failState: 'disconnected'},
			synchronizing: {state: 'connected',     terminal: false, queueEvents: true,  sendEvents: false},
			disconnected:  {state: 'disconnected',  terminal: false, queueEvents: true,  sendEvents: false, retryDelay: timeouts.disconnectedRetryTimeout},
			suspended:     {state: 'suspended',     terminal: false, queueEvents: false, sendEvents: false, retryDelay: timeouts.suspendedRetryTimeout},
			closing:       {state: 'closing',       terminal: false, queueEvents: false, sendEvents: false, retryDelay: timeouts.realtimeRequestTimeout, failState: 'closed'},
			closed:        {state: 'closed',        terminal: true,  queueEvents: false, sendEvents: false},
			failed:        {state: 'failed',        terminal: true,  queueEvents: false, sendEvents: false}
		};
		this.state = this.states.initialized;
		this.errorReason = null;

		this.queuedMessages = new MessageQueue();
		this.msgSerial = 0;
		this.connectionId = undefined;
		this.connectionKey = undefined;
		this.connectionSerial = undefined;

		this.httpTransports = Utils.intersect((options.transports || Defaults.httpTransports), ConnectionManager.httpTransports);
		this.transports = Utils.intersect((options.transports || Defaults.transports), ConnectionManager.transports);
		this.upgradeTransports = Utils.arrSubtract(this.transports, this.httpTransports);

		this.httpHosts = Defaults.getHosts(options);
		this.activeProtocol = null;
		this.pendingTransports = [];
		this.host = null;

		Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + (options.transports || Defaults.transports) + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available http transports = [' + this.httpTransports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + this.transports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');

		if(!this.transports.length) {
			var msg = 'no requested transports available';
			Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
			throw new Error(msg);
		}

		/* intercept close event in browser to persist connection id if requested */
		if(createCookie && options.recover === true && window.addEventListener)
			window.addEventListener('beforeunload', this.persistConnection.bind(this));

		/* Listen for online and offline events */
		if(typeof window === "object" && window.addEventListener) {
			var self = this;
			window.addEventListener('online', function() {
				if(self.state == self.states.disconnected || self.state == self.states.suspended) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager caught browser ‘online’ event', 'reattempting connection');
					self.requestState({state: 'connecting'});
				}
			});
			window.addEventListener('offline', function() {
				if(self.state == self.states.connected) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager caught browser ‘offline’ event', 'disconnecting active transport');
					// Not sufficient to just go to the 'disconnected' state, want to
					// force all transports to reattempt the connection. Will immediately
					// retry.
					self.disconnectAllTransports();
				}
			});
		}
	}
	Utils.inherits(ConnectionManager, EventEmitter);

	/*********************
	 * transport management
	 *********************/

	ConnectionManager.httpTransports = {};
	ConnectionManager.transports = {};

	ConnectionManager.prototype.chooseTransport = function(callback) {
		Logger.logAction(Logger.LOG_MAJOR, 'ConnectionManager.chooseTransport()', '');
		/* if there's already a transport, we're done */
		if(this.activeProtocol) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Transport already established');
			callback(null);
			return;
		}

		/* set up the transport params */
		/* first attempt the main host; no need to check for general connectivity first.
		 * Inherit any connection state */
		var mode = this.connectionKey ? 'resume' : (this.options.recover ? 'recover' : 'clean');
		var transportParams = new TransportParams(this.options, null, mode, this.connectionKey, this.connectionSerial);
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Transport recovery mode = ' + mode + (mode == 'clean' ? '' : '; connectionKey = ' + this.connectionKey + '; connectionSerial = ' + this.connectionSerial));
		var self = this;

		/* if there are no http transports, just choose from the available transports,
		 * falling back to the first host only;
		 * NOTE: this behaviour will never apply with a default configuration. */
		if(!this.httpTransports.length) {
			transportParams.host = this.httpHosts[0];
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'No http transports available; ignoring fallback hosts');
			this.chooseTransportForHost(transportParams, self.transports.slice(), callback);
			return;
		}

		/* first try to establish an http transport */
		this.chooseHttpTransport(transportParams, function(err, httpTransport) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.chooseTransport()', 'Unexpected error establishing transport; err = ' + Utils.inspectError(err));
				/* http failed, or terminal, so nothing's going to work */
				callback(err);
				return;
			}
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Establishing http transport: ' + httpTransport);
			callback(null, httpTransport);

			/* we have the http transport; if there is a potential upgrade
			 * transport, lets see if we can upgrade to that. We won't
			  * be trying any fallback hosts, so we know the host to use */
			if(self.upgradeTransports.length) {
				/* we can't initiate the selection of the upgrade transport until we have
				 * the actual connection, since we need the connectionKey */
				httpTransport.once('connected', function(error, connectionKey) {
					/* we allow other event handlers, including activating the transport, to run first */
					Utils.nextTick(function() {
						Logger.logAction(Logger.LOG_MAJOR, 'ConnectionManager.chooseTransport()', 'upgrading ... connectionKey = ' + connectionKey);
						transportParams = new TransportParams(self.options, transportParams.host, 'upgrade', connectionKey);
						self.chooseTransportForHost(transportParams, self.upgradeTransports.slice(), noop);
					});
				});
			}
			});
	};

	/**
	 * Attempt to connect to a specified host using a given
	 * list of candidate transports in descending priority order
	 * @param transportParams
	 * @param candidateTransports
	 * @param callback
	 */
	ConnectionManager.prototype.chooseTransportForHost = function(transportParams, candidateTransports, callback) {
		var candidate = candidateTransports.shift();
		if(!candidate) {
			callback(new ErrorInfo('Unable to connect (no available transport)', 80000, 404));
			return;
		}
		var self = this;
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransportForHost()', 'trying ' + candidate);
		(ConnectionManager.transports[candidate]).tryConnect(this, this.realtime.auth, transportParams, function(err, transport) {
			var state = self.state;
			if(state == self.states.closing || state == self.states.closed || state == self.states.failed) {
				/* the connection was closed when we were away
				 * attempting this transport so close */
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransportForHost()', 'connection closing');
				if(transport) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransportForHost()', 'closing transport = ' + transport);
					transport.close();
				}
				callback(new ErrorInfo('Connection already closed', 400, 80017));
				return;
			}
			if(err) {
				/* a 4XX error, such as 401, signifies that there is an error that will not be resolved by another transport */
				if(isErrFatal(err)) {
					callback(err);
					return;
				}
				self.chooseTransportForHost(transportParams, candidateTransports, callback);
				return;
			}
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransportForHost()', 'transport ' + candidate + ' connecting');
			self.setTransportPending(transport, transportParams.mode);
			callback(null, transport);
		});
	};

	/**
	 * Try to establish a transport on an http transport, checking for
	 * network connectivity and trying fallback hosts if applicable
	 * @param transportParams
	 * @param callback
	 */
	ConnectionManager.prototype.chooseHttpTransport = function(transportParams, callback) {
		var candidateHosts = this.httpHosts.slice();
		/* first try to establish a connection with the priority host with http transport */
		var host = candidateHosts.shift();
		if(!host) {
			callback(new ErrorInfo('Unable to connect (no available host)', 80000, 404));
			return;
		}
		transportParams.host = host;
		var self = this;

		/* this is what we'll be doing if the attempt for the main host fails */
		function tryFallbackHosts() {
			/* if there aren't any fallback hosts, fail */
			if(!candidateHosts.length) {
				callback(new ErrorInfo('Unable to connect (no available host)', 80000, 404));
				return;
			}
			/* before trying any fallback (or any remaining fallback) we decide if
			 * there is a problem with the ably host, or there is a general connectivity
			 * problem */
			ConnectionManager.httpTransports[self.httpTransports[0]].checkConnectivity(function(err, connectivity) {
				/* we know err won't happen but handle it here anyway */
				if(err) {
					callback(err);
					return;
				}
				if(!connectivity) {
					/* the internet isn't reachable, so don't try the fallback hosts */
					callback(new ErrorInfo('Unable to connect (network unreachable)', 80000, 404));
					return;
				}
				/* the network is there, so there's a problem with the main host, or
				 * its dns. Try the fallback hosts. We could try them simultaneously but
				 * that would potentially cause a huge spike in load on the load balancer */
				transportParams.host = Utils.arrRandomElement(candidateHosts);
				self.chooseTransportForHost(transportParams, self.httpTransports.slice(), function(err, httpTransport) {
					if(err) {
						if(isErrFatal(err)) {
							callback(err);
							return;
						}
						tryFallbackHosts();
						return;
					}
					/* succeeded */
					callback(null, httpTransport);
				});
			});
		}

		this.chooseTransportForHost(transportParams, this.httpTransports.slice(), function(err, httpTransport) {
			if(err) {
				if(isErrFatal(err)) {
					callback(err);
					return;
				}
				tryFallbackHosts();
				return;
			}
			/* succeeded */
			callback(null, httpTransport);
		});
	};

	/**
	 * Called when a transport is indicated to be viable, and the connectionmanager
	 * expects to activate this transport as soon as it is connected.
	 * @param host
	 * @param transport
	 */
	ConnectionManager.prototype.setTransportPending = function(transport, mode) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setTransportPending()', 'transport = ' + transport + '; mode = ' + mode);

		/* this is now pending */
		this.pendingTransports.push(transport);

		var self = this;
		transport.on('connected', function(error, connectionKey, connectionSerial, connectionId, clientId) {
			if(mode == 'upgrade' && self.activeProtocol) {
				self.scheduleTransportActivation(transport);
			} else {
				self.activateTransport(transport, connectionKey, connectionSerial, connectionId, clientId);
			}
		});

		var eventHandler = function(event) {
			return function(error) {
				self.deactivateTransport(transport, event, error);
			};
		};
		var events = ['disconnected', 'closed', 'failed'];
		for(var i = 0; i < events.length; i++) {
			var event = events[i];
			transport.on(event, eventHandler(event));
		}
		this.emit('transport.pending', transport);
	};

	/**
	 * Called when an upgrade transport is connected,
	 * to schedule the activation of that transport.
	 * @param transport the transport instance
	 */
	ConnectionManager.prototype.scheduleTransportActivation = function(transport) {
		var self = this;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Scheduling transport; transport = ' + transport);
		this.realtime.channels.onceNopending(function(err) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Unable to activate transport; transport = ' + transport + '; err = ' + err);
				return;
			}

			/* If currently connected, temporarily pause events until the sync is complete */
			if(self.state === self.states.connected)
				self.state = self.states.synchronizing;

			/* make this the active transport */
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Activating transport; transport = ' + transport);
			self.activateTransport(transport, self.connectionKey, self.connectionSerial, self.connectionId);

			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Syncing transport; transport = ' + transport);
			self.sync(transport, function(err, connectionSerial, connectionId) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Unexpected error attempting to sync transport; transport = ' + transport + '; err = ' + err);
					return;
				}
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'sync successful upgraded transport; transport = ' + transport + '; connectionSerial = ' + connectionSerial + '; connectionId = ' + connectionId);

				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Sending queued messages on upgraded transport; transport = ' + transport);
				self.state = self.states.connected;
				self.sendQueuedMessages();
			});
		});
	};

	/**
	 * Called when a transport is connected, and the connectionmanager decides that
	 * it will now be the active transport.
	 * @param transport the transport instance
	 * @param connectionKey the key of the new active connection
	 * @param connectionSerial the current connectionSerial
	 * @param connectionId the id of the new active connection
	 */
	ConnectionManager.prototype.activateTransport = function(transport, connectionKey, connectionSerial, connectionId, clientId) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport);
		if(connectionKey)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionKey =  ' + connectionKey);
		if(connectionSerial !== undefined)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionSerial =  ' + connectionSerial);
		if(connectionId)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionId =  ' + connectionId);
		if(clientId)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'clientId =  ' + clientId);

		/* if the connectionmanager moved to the closing/closed state before this
		 * connection event, then we won't activate this transport */
		var existingState = this.state;
		if(existingState == this.states.closing || existingState == this.states.closed)
			return;

		/* remove this transport from pending transports */
		Utils.arrDeleteValue(this.pendingTransports, transport);

		/* the given transport is connected; this will immediately
		 * take over as the active transport */
		var existingActiveProtocol = this.activeProtocol;
		this.activeProtocol = new Protocol(transport);
		this.host = transport.params.host;
		if(connectionKey && this.connectionKey != connectionKey)  {
			this.setConnection(connectionId, connectionKey, connectionSerial);
		}

		var auth = this.realtime.auth;
		if(clientId && !(clientId === '*')) {
			if(auth.clientId && auth.clientId != clientId) {
				/* Should never happen in normal circumstances as realtime should
				 * recognise mismatch and return an error */
				var msg = 'Unexpected mismatch between expected and received clientId'
				var err = new ErrorInfo(msg, 40102, 401);
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
				transport.abort(err);
				return;
			}
			auth.clientId = clientId;
		}

		this.emit('transport.active', transport, connectionKey, transport.params);

		/* notify the state change if previously not connected */
		if(existingState !== this.states.connected) {
			this.notifyState({state: 'connected'});
			this.errorReason = null;
			this.realtime.connection.errorReason = null;
		}

		/* Gracefully terminate existing protocol */
		if(existingActiveProtocol) {
			existingActiveProtocol.finish();
		}

		/* Terminate any other pending transport(s) */
		for(var i = 0; i < this.pendingTransports.length; i++) {
			this.pendingTransports[i].disconnect();
		}
	};

	/**
	 * Called when a transport is no longer the active transport. This can occur
	 * in any transport connection state.
	 * @param transport
	 */
	ConnectionManager.prototype.deactivateTransport = function(transport, state, error) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'state = ' + state);
		if(error && error.message)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'reason =  ' + error.message);

		var wasActive = this.activeProtocol && this.activeProtocol.getTransport() === transport,
			wasPending = Utils.arrDeleteValue(this.pendingTransports, transport);

		if(wasActive) {
			this.queuePendingMessages(this.activeProtocol.getPendingMessages());
			this.activeProtocol = this.host = null;
		}

		this.emit('transport.inactive', transport);

		/* this transport state change is a state change for the connectionmanager if
		 * - the transport was the active transport; or
		 * - there is no active transport, and this is the last remaining
		 *   pending transport (so we were in the connecting state)
		 */
		if(wasActive || (this.activeProtocol === null && wasPending && this.pendingTransports.length === 0)) {
			/* Transport failures only imply a connection failure
			 * if the reason for the failure is fatal */
			if((state === 'failed') && error && !isErrFatal(error)) {
				state = 'disconnected';
			}
			this.notifyState({state: state, error: error});
		}
	};

	/**
	 * Called when activating a new transport, to ensure message delivery
	 * on the new transport synchronises with the messages already received
	 */
	ConnectionManager.prototype.sync = function(transport, callback) {
		/* check preconditions */
		if(!transport.isConnected)
				throw new ErrorInfo('Unable to sync connection; not connected', 40000, 400);

		/* send sync request */
		var syncMessage = ProtocolMessage.fromValues({
			action: actions.SYNC,
			connectionKey: this.connectionKey,
			connectionSerial: this.connectionSerial
		});
		transport.send(syncMessage, function(err) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.sync()', 'Unexpected error sending sync message; err = ' + ErrorInfo.fromValues(err).toString());
			}
		});
		transport.once('sync', function(connectionSerial, connectionId) {
			callback(null, connectionSerial, connectionId);
		});
	};

	ConnectionManager.prototype.setConnection = function(connectionId, connectionKey, connectionSerial) {
		this.realtime.connection.id = this.connectionId = connectionId;
		this.realtime.connection.key = this.connectionKey = connectionKey;
		this.realtime.connection.serial = this.connectionSerial = (connectionSerial === undefined) ? -1 : connectionSerial;
		this.realtime.connection.recoveryKey = connectionKey + ':' + this.connectionSerial;
		this.msgSerial = 0;
		if(this.options.recover === true)
			this.persistConnection();

	};

	ConnectionManager.prototype.clearConnection = function() {
		this.realtime.connection.id = this.connectionId = undefined;
		this.realtime.connection.key = this.connectionKey = undefined;
		this.realtime.connection.serial = this.connectionSerial = undefined;
		this.realtime.connection.recoveryKey = null;
		this.msgSerial = 0;
		this.unpersistConnection();
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery. Only applicable in the browser context.
	 */
	ConnectionManager.prototype.persistConnection = function() {
		if(createCookie) {
			if(this.connectionKey && this.connectionSerial !== undefined) {
				createCookie(connectionKeyCookie, this.connectionKey, this.options.timeouts.connectionPersistTimeout);
				createCookie(connectionSerialCookie, this.connectionSerial, this.options.timeouts.connectionPersistTimeout);
			}
		}
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery. Only applicable in the browser context.
	 */
	ConnectionManager.prototype.unpersistConnection = function() {
		if(eraseCookie) {
			eraseCookie(connectionKeyCookie);
			eraseCookie(connectionSerialCookie);
		}
	};

	/*********************
	 * state management
	 *********************/

	ConnectionManager.prototype.getStateError = function() {
		return ConnectionError[this.state.state];
	};

	ConnectionManager.activeState = function(state) {
		return state.queueEvents || state.sendEvents;
	};

	ConnectionManager.prototype.enactStateChange = function(stateChange) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' + stateChange.current + '; reason = ' + (stateChange.reason && stateChange.reason.message));
		var newState = this.state = this.states[stateChange.current];
		if(stateChange.reason) {
			this.errorReason = stateChange.reason;
			this.realtime.connection.errorReason = stateChange.reason;
		}
		if(newState.terminal) {
			this.clearConnection();
		}
		this.emit('connectionstate', stateChange);
	};

	/****************************************
	 * ConnectionManager connection lifecycle
	 ****************************************/

	ConnectionManager.prototype.startTransitionTimer = function(transitionState) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startTransitionTimer()', 'transitionState: ' + transitionState.state);

		if(this.transitionTimer) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startTransitionTimer()', 'clearing already-running timer');
			clearTimeout(this.transitionTimer);
		}

		var self = this;
		this.transitionTimer = setTimeout(function() {
			if(self.transitionTimer) {
				self.transitionTimer = null;
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager connect timer expired', 'requesting new state: ' + self.states.connecting.failState);
				self.notifyState({state: transitionState.failState});
			}
		}, transitionState.retryDelay);
	};

	ConnectionManager.prototype.cancelTransitionTimer = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.cancelTransitionTimer()', '');
		if(this.transitionTimer) {
			clearTimeout(this.transitionTimer);
			this.transitionTimer = null;
		}
	};

	ConnectionManager.prototype.startSuspendTimer = function() {
		var self = this;
		if(this.suspendTimer)
			return;
		this.suspendTimer = setTimeout(function() {
			if(self.suspendTimer) {
				self.suspendTimer = null;
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager suspend timer expired', 'requesting new state: suspended');
				self.states.connecting.failState = 'suspended';
				self.states.connecting.queueEvents = false;
				self.notifyState({state: 'suspended'});
			}
		}, this.options.timeouts.connectionStateTtl);
	};

	ConnectionManager.prototype.checkSuspendTimer = function(state) {
		if(state !== 'disconnected' && state !== 'suspended' && state !== 'connecting')
			this.cancelSuspendTimer();
	};

	ConnectionManager.prototype.cancelSuspendTimer = function() {
		this.states.connecting.failState = 'disconnected';
		this.states.connecting.queueEvents = true;
		if(this.suspendTimer) {
			clearTimeout(this.suspendTimer);
			this.suspendTimer = null;
		}
	};

	ConnectionManager.prototype.startRetryTimer = function(interval) {
		var self = this;
		this.retryTimer = setTimeout(function() {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager retry timer expired', 'retrying');
			self.retryTimer = null;
			self.requestState({state: 'connecting'});
		}, interval);
	};

	ConnectionManager.prototype.cancelRetryTimer = function() {
		if(this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}
	};

	ConnectionManager.prototype.notifyState = function(indicated) {
		var state = indicated.state,
			self = this;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'new state: ' + state);
		/* do nothing if we're already in the indicated state */
		if(state == this.state.state)
			return;

		/* kill timers (possibly excepting suspend timer depending on the notified
		* state), as these are superseded by this notification */
		this.cancelTransitionTimer();
		this.cancelRetryTimer();
		this.checkSuspendTimer(indicated.state);

		/* do nothing if we're unable to move from the current state */
		if(this.state.terminal)
			return;

		/* process new state */
		var newState = this.states[indicated.state],
			change = new ConnectionStateChange(this.state.state, newState.state, newState.retryDelay, (indicated.error || ConnectionError[newState.state]));

		// If go into disconnected straight from connected, try again immediately
		if(this.state === this.states.connected && state === 'disconnected') {
			Utils.nextTick(function() {
				self.requestState({state: 'connecting'});
			});
		} else if(newState.retryDelay) {
			this.startRetryTimer(newState.retryDelay);
		}

		/* implement the change and notify */
		this.enactStateChange(change);
		if(this.state.sendEvents)
			this.sendQueuedMessages();
		else if(!this.state.queueEvents)
			this.realtime.channels.setSuspended(change.reason);
	};

	ConnectionManager.prototype.requestState = function(request) {
		var state = request.state, self = this;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.requestState()', 'requested state: ' + state);
		if(state == this.state.state)
			return; /* silently do nothing */

		/* kill running timers, as this request supersedes them */
		this.cancelTransitionTimer();
		this.cancelRetryTimer();
		/* for suspend timer check rather than cancel -- eg requesting a connecting
		* state should not reset the suspend timer */
		this.checkSuspendTimer(state);

		if(state == 'connecting') {
			if(this.state.state == 'connected')
				return; /* silently do nothing */
			Utils.nextTick(function() { self.connectImpl(); });
		} else if(state == 'closing') {
			if(this.state.state == 'closed')
				return; /* silently do nothing */
			Utils.nextTick(function() { self.closeImpl(); });
		}

		var newState = this.states[state],
			change = new ConnectionStateChange(this.state.state, newState.state, newState.retryIn, (request.error || ConnectionError[newState.state]));

		this.enactStateChange(change);
	};

	ConnectionManager.prototype.connectImpl = function() {
		var state = this.state;
		if(state == this.states.closing || state == this.states.closed || state == this.states.failed) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'abandoning connection attempt; state = ' + state.state);
			return;
		}

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'starting connection');
		this.startSuspendTimer();
		this.startTransitionTimer(this.states.connecting);

		var self = this;
		var auth = this.realtime.auth;
		var connectErr = function(err) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.connectImpl()', 'Connection attempt failed with error; err = ' + ErrorInfo.fromValues(err).toString());
			var state = self.state;
			if(state == self.states.closing || state == self.states.closed || state == self.states.failed) {
				/* do nothing */
				return;
			}
			if(isTokenErr(err)) {
				/* re-get a token */
				auth.authorise(null, {force: true}, function(err) {
					if(err) {
						connectErr(err);
						return;
					}
					self.connectImpl();
				});
				return;
			}

			/* Only allow connection to be 'failed' if err has a definite unrecoverable
			 * code from realtime; otherwise err on the side of 'disconnected' so will
			 * retry. (Note: token problems case is dealt with above) */
			if(err.code && isErrFatal(err))
				self.notifyState({state: 'failed', error: err});
			else
				self.notifyState({state: self.states.connecting.failState, error: err});
		};

		var tryConnect = function() {
			self.chooseTransport(function(err) {
				if(err) {
					connectErr(err);
					return;
				}
				/* nothing to do .. as transport connection is initiated
				 * in chooseTransport() */
			});
		};

		if(auth.method == 'basic') {
			tryConnect();
		} else {
			var authOptions = (this.errorReason && isTokenErr(this.errorReason)) ? {force: true} : null;
			auth.authorise(null, authOptions, function(err) {
				if(err)
					connectErr(err);
				else
					tryConnect();
			});
		}
	};


	ConnectionManager.prototype.closeImpl = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing connection');
		this.cancelSuspendTimer();
		this.startTransitionTimer(this.states.closing);

		function closeTransport(transport) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing transport: ' + transport);
			if(transport) {
				try {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing transport: ' + transport);
					transport.close();
				} catch(e) {
					var msg = 'Unexpected exception attempting to close transport; e = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.closeImpl()', msg);
					transport.abort(new ErrorInfo(msg, 50000, 500));
				}
			}
		}

		/* if transport exists, send close message */
		for(var i = 0; i < this.pendingTransports.length; i++) {
			closeTransport(this.pendingTransports[i]);
		}
		closeTransport(this.activeProtocol && this.activeProtocol.getTransport());

		/* If there was an active transport, this will probably be
		 * preempted by the notifyState call in deactivateTransport */
		this.notifyState({state: 'closed'});
	};

	ConnectionManager.prototype.disconnectAllTransports = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.disconnectAllTransports()', 'disconnecting all transports');

		function disconnectTransport(transport) {
			if(transport) {
				try {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.disconnectAllTransports()', 'disconnecting transport: ' + transport);
					transport.disconnect();
				} catch(e) {
					var msg = 'Unexpected exception attempting to disconnect transport; e = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.disconnectAllTransports()', msg);
					transport.abort(new ErrorInfo(msg, 50000, 500));
				}
			}
		}

		for(var i = 0; i < this.pendingTransports.length; i++) {
			disconnectTransport(this.pendingTransports[i]);
		}
		disconnectTransport(this.activeProtocol && this.activeProtocol.getTransport());
		// No need to notify state disconnected; disconnecting the active transport
		// will have that effect
	};

	/******************
	 * event queueing
	 ******************/

	ConnectionManager.prototype.send = function(msg, queueEvents, callback) {
		callback = callback || noop;
		var state = this.state;

		if(state.sendEvents) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
			this.sendImpl(new PendingMessage(msg, callback));
			return;
		}
		if(state.queueEvents) {
			if(state == this.states.synchronizing || queueEvents) {
				if (Logger.shouldLog(Logger.LOG_MICRO)) {
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'queueing msg; ' + ProtocolMessage.stringify(msg));
				}
				this.queue(msg, callback);
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'rejecting event; state = ' + state.state);
				callback(this.errorReason);
			}
		}
	};

	ConnectionManager.prototype.sendImpl = function(pendingMessage) {
		var msg = pendingMessage.message;
		if(pendingMessage.ackRequired) {
			msg.msgSerial = this.msgSerial++;
		}
		try {
			this.activeProtocol.send(pendingMessage, function(err) {
				/* FIXME: schedule a retry directly if we get a send error */
			});
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.sendImpl()', 'Unexpected exception in transport.send(): ' + e.stack);
		}
	};

	ConnectionManager.prototype.queue = function(msg, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queue()', 'queueing event');
		var lastQueued = this.queuedMessages.last();
		if(lastQueued && RealtimeChannel.mergeTo(lastQueued.message, msg)) {
			if(!lastQueued.merged) {
				lastQueued.callback = Multicaster([lastQueued.callback]);
				lastQueued.merged = true;
			}
			lastQueued.callback.push(callback);
		} else {
			this.queuedMessages.push(new PendingMessage(msg, callback));
		}
	};

	ConnectionManager.prototype.sendQueuedMessages = function() {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.sendQueuedMessages()', 'sending ' + this.queuedMessages.count() + ' queued messages');
		var pendingMessage;
		while(pendingMessage = this.queuedMessages.shift())
			this.sendImpl(pendingMessage);
	};

	ConnectionManager.prototype.queuePendingMessages = function(pendingMessages) {
		if(pendingMessages && pendingMessages.length) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queuePendingMessages()', 'queueing ' + pendingMessages.length + ' pending messages');
			this.queuedMessages.prepend(pendingMessages);
		}
	};

	ConnectionManager.prototype.onChannelMessage = function(message, transport) {
		if(this.activeProtocol && transport === this.activeProtocol.getTransport()) {
			var connectionSerial = message.connectionSerial;
			if(connectionSerial <= this.connectionSerial) {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.onChannelMessage() received message with connectionSerial ' + connectionSerial + ', but current connectionSerial is ' + this.connectionSerial + '; assuming message is a duplicate and discarding it');
				return;
			}
			if(connectionSerial !== undefined) {
				this.realtime.connection.serial = this.connectionSerial = connectionSerial;
				this.realtime.connection.recoveryKey = this.connectionKey + ':' + connectionSerial;
			}
			this.realtime.channels.onChannelMessage(message);
		} else {
			// Message came in on a defunct transport. Allow only acks, nacks, & errors for outstanding
			// messages,  no new messages (as sync has been sent on new transport so new messages will
			// be resent there, or connection has been closed so don't want new messages)
			if(Utils.arrIndexOf([actions.ACK, actions.NACK, actions.ERROR], message.action) > -1) {
				this.realtime.channels.onChannelMessage(message);
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.onChannelMessage()', 'received message ' + JSON.stringify(message) + 'on defunct transport; discarding');
			}
		}
	};

	ConnectionManager.prototype.ping = function(transport, callback) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.ping()', 'transport = ' + transport);

		/* if transport is specified, try that */
		if(transport) {
			var onTimeout = function () {
				transport.off('heartbeat', onHeartbeat);
				callback(new ErrorInfo('Timedout waiting for heartbeat response', 50000, 500));
			};

			var pingStart = Date.now();

			var onHeartbeat = function () {
				clearTimeout(timer);
				var responseTime = Date.now() - pingStart;
				callback(null, responseTime);
			};

			var timer = setTimeout(onTimeout, this.options.timeouts.realtimeRequestTimeout);

			transport.once('heartbeat', onHeartbeat);
			transport.ping();
			return;
		}

		/* if we're not connected, don't attempt */
		if(this.state.state !== 'connected') {
			callback(new ErrorInfo('Unable to ping service; not connected', 40000, 400));
			return;
		}

		/* no transport was specified, so use the current (connected) one
		 * but ensure that we retry if the transport is superseded before we complete */
		var completed = false, self = this;

		var onPingComplete = function(err, responseTime) {
			self.off('transport.active', onTransportActive);
			if(!completed) {
				completed = true;
				callback(err, responseTime);
			}
		};

		var onTransportActive = function() {
			if(!completed) {
				/* ensure that no callback happens for the currently outstanding operation */
				completed = true;
				/* repeat but picking up the new transport */
				Utils.nextTick(function() {
					self.ping(null, callback);
				});
			}
		};

		this.on('transport.active', onTransportActive);
		this.ping(this.activeProtocol.getTransport(), onPingComplete);
	};

	ConnectionManager.prototype.abort = function(error) {
		this.activeProtocol.getTransport().abort(error);
	};

	return ConnectionManager;
})();
