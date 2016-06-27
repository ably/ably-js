var ConnectionManager = (function() {
	var haveWebStorage = !!(typeof(WebStorage) !== 'undefined' && WebStorage.get);
	var actions = ProtocolMessage.Action;
	var PendingMessage = Protocol.PendingMessage;
	var noop = function() {};
	var transportPreferenceOrder = Defaults.transportPreferenceOrder;
	var optimalTransport = transportPreferenceOrder[transportPreferenceOrder.length - 1];

	var transportPreferenceName = 'ably-transport-preference';
	function getTransportPreference() {
		return haveWebStorage && WebStorage.get(transportPreferenceName);
	}
	function setTransportPreference(value) {
		return haveWebStorage && WebStorage.set(transportPreferenceName, value);
	}
	function clearTransportPreference() {
		return haveWebStorage && WebStorage.remove(transportPreferenceName);
	}

	var sessionRecoveryName = 'ably-connection-recovery';
	function getSessionRecoverData() {
		return haveWebStorage && WebStorage.getSession(sessionRecoveryName);
	}
	function setSessionRecoverData(value) {
		return haveWebStorage && WebStorage.setSession(sessionRecoveryName, value);
	}
	function clearSessionRecoverData() {
		return haveWebStorage && WebStorage.removeSession(sessionRecoveryName);
	}

	function isFatalErr(err) {
		var UNRESOLVABLE_ERROR_CODES = [80015, 80017, 80030];

		if(err.code) {
			if(Auth.isTokenErr(err)) return false;
			if(Utils.arrIn(UNRESOLVABLE_ERROR_CODES, err.code)) return true;
			return (err.code >= 40000 && err.code < 50000);
		}
		/* If no statusCode either, assume false */
		return err.statusCode < 500;
	}

	function betterTransportThan(a, b) {
		return Utils.arrIndexOf(transportPreferenceOrder, a.shortName) >
		   Utils.arrIndexOf(transportPreferenceOrder, b.shortName);
	}

	function TransportParams(options, host, mode, connectionKey, connectionSerial) {
		this.options = options;
		this.host = host;
		this.mode = mode;
		this.connectionKey = connectionKey;
		this.connectionSerial = connectionSerial;
		this.format = options.useBinaryProtocol ? 'msgpack' : 'json';
	}

	TransportParams.prototype.getConnectParams = function(authParams) {
		var params = authParams ? Utils.copy(authParams) : {};
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
				var match = options.recover.split(':');
				if(match) {
					params.recover = match[0];
					params.connection_serial = match[1];
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
		var self = this;
		/* connectingTimeout: leave preferenceConnectTimeout (~6s) to try the
		 * preference transport, then realtimeRequestTimeout (~10s) to establish
		 * the base transport in case that fails */
		var connectingTimeout = timeouts.preferenceConnectTimeout + timeouts.realtimeRequestTimeout;
		this.states = {
			initialized:   {state: 'initialized',   terminal: false, queueEvents: true,  sendEvents: false},
			connecting:    {state: 'connecting',    terminal: false, queueEvents: true,  sendEvents: false, retryDelay: connectingTimeout, failState: 'disconnected'},
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

		this.transports = Utils.intersect((options.transports || Defaults.transports), ConnectionManager.supportedTransports);
		/* baseTransports selects the leftmost transport in the Defaults.transports list
		* that's both requested and supported. Normally this will be xhr_polling;
		* if xhr isn't supported it will be jsonp. If the user has forced a
		* transport, it'll just be that one. */
		this.baseTransport = Utils.intersect(Defaults.transports, this.transports)[0];
		this.upgradeTransports = Utils.intersect(this.transports, Defaults.upgradeTransports);

		this.httpHosts = Defaults.getHosts(options);
		this.activeProtocol = null;
		this.proposedTransports = [];
		this.pendingTransports = [];
		this.host = null;

		Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + (options.transports || Defaults.transports) + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + this.transports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');

		if(!this.transports.length) {
			var msg = 'no requested transports available';
			Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
			throw new Error(msg);
		}

		/* intercept close event in browser to persist connection id if requested */
		if(haveWebStorage && typeof options.recover === 'function' && window.addEventListener)
			window.addEventListener('beforeunload', this.persistConnection.bind(this));

		if(options.closeOnUnload === true && window.addEventListener)
			window.addEventListener('beforeunload', function() { self.requestState({state: 'closing'}); });

		/* Listen for online and offline events */
		if(typeof window === 'object' && window.addEventListener) {
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

	ConnectionManager.supportedTransports = {};

	ConnectionManager.prototype.getTransportParams = function(callback) {
		var self = this;

		function decideMode(modeCb) {
			if(self.connectionKey) {
				modeCb('resume');
				return;
			}

			if(typeof self.options.recover === 'string') {
				modeCb('recover');
				return;
			}

			var recoverFn = self.options.recover,
				lastSessionData = getSessionRecoverData();
			if(lastSessionData && typeof(recoverFn) === 'function') {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Calling clientOptions-provided recover function with last session data');
				recoverFn(lastSessionData, function(shouldRecover) {
					if(shouldRecover) {
						self.options.recover = lastSessionData.recoveryKey;
						modeCb('recover');
					} else {
						modeCb('clean');
					}
				});
				return;
			}
			modeCb('clean');
		}

		decideMode(function(mode) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Transport recovery mode = ' + mode + (mode == 'clean' ? '' : '; connectionKey = ' + self.connectionKey + '; connectionSerial = ' + self.connectionSerial));
			callback(new TransportParams(self.options, null, mode, self.connectionKey, self.connectionSerial));
		});
	};

	/**
	 * Attempt to connect using a given transport
	 * @param transportParams
	 * @param candidate, the transport to try
	 * @param callback
	 */
	ConnectionManager.prototype.tryATransport = function(transportParams, candidate, callback) {
		var self = this;
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.tryATransport()', 'trying ' + candidate);
		(ConnectionManager.supportedTransports[candidate]).tryConnect(this, this.realtime.auth, transportParams, function(err, transport) {
			var state = self.state;
			if(state == self.states.closing || state == self.states.closed || state == self.states.failed) {
				if(transport) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.tryATransport()', 'connection ' + state.state + ' while we were attempting the transport; closing ' + transport);
					transport.close();
				}
				callback(new ErrorInfo('Connection ' + state.state, 80017, 400));
				return;
			}

			if(err) {
				err = ErrorInfo.fromValues(err);
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.tryATransport()', 'transport ' + candidate + ' returned err: ' + err.toString());

				/* Comet transport onconnect token errors can be dealt with here.
				* Websocket ones only happen after the transport claims to be viable,
				* so are dealt with as non-onconnect token errors */
				if(Auth.isTokenErr(err)) {
					/* re-get a token and try again */
					self.realtime.auth.authorise(null, {force: true}, function(err) {
						if(err) {
							callback(err);
							return;
						}
						self.tryATransport(transportParams, candidate, callback);
					});
					return;
				}

				callback(err);
				return;
			}

			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransportForHost()', 'viable transport ' + candidate + '; setting pending');
			self.setTransportPending(transport, transportParams);
			callback(null, transport);
		});
	};


	/**
	 * Called when a transport is indicated to be viable, and the connectionmanager
	 * expects to activate this transport as soon as it is connected.
	 * @param host
	 * @param transportParams
	 */
	ConnectionManager.prototype.setTransportPending = function(transport, transportParams) {
		var mode = transportParams.mode;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setTransportPending()', 'transport = ' + transport + '; mode = ' + mode);

		Utils.arrDeleteValue(this.proposedTransports, transport);
		this.pendingTransports.push(transport);

		var self = this;
		transport.once('connected', function(error, connectionKey, connectionSerial, connectionId, connectionDetails) {
			if(mode == 'upgrade' && self.activeProtocol) {
				/*  if ws and xhrs are connecting in parallel, delay xhrs activation to let ws go ahead */
				if(transport.shortName !== optimalTransport && Utils.arrIn(self.getUpgradePossibilities(), optimalTransport)) {
					setTimeout(function() {
						self.scheduleTransportActivation(error, transport, connectionKey, connectionSerial, connectionId, connectionDetails);
					}, self.options.timeouts.parallelUpgradeDelay);
				} else {
					self.scheduleTransportActivation(error, transport, connectionKey, connectionSerial, connectionId, connectionDetails);
				}
			} else {
				self.activateTransport(error, transport, connectionKey, connectionSerial, connectionId, connectionDetails);

				/* allow connectImpl to start the upgrade process if needed, but allow
				 * other event handlers, including activating the transport, to run first */
				Utils.nextTick(function() {
					self.connectImpl(transportParams);
				});
			}

			if(mode === 'recover' && self.options.recover) {
				/* After a successful recovery, we unpersist, as a recovery key cannot
				* be used more than once */
				self.options.recover = null;
				self.unpersistConnection();
			}
		});

		Utils.arrForEach(['disconnected', 'closed', 'failed'], function(event) {
			transport.on(event, function(error) {
				self.deactivateTransport(transport, event, error);
			});
		});

		this.emit('transport.pending', transport);
	};

	/**
	 * Called when an upgrade transport is connected,
	 * to schedule the activation of that transport.
	 * @param transport, the transport instance
	 * @param connectionKey
	 */
	ConnectionManager.prototype.scheduleTransportActivation = function(error, transport, connectionKey, connectionSerial, connectionId, connectionDetails) {
		var self = this,
			currentTransport = this.activeProtocol && this.activeProtocol.getTransport(),
			abandon = function() {
				transport.disconnect();
				Utils.arrDeleteValue(self.pendingTransports, transport);
			};

		if(this.state !== this.states.connected) {
			/* This is most likely to happen for the delayed xhrs, when xhrs and ws are scheduled in parallel*/
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Current connection state (' + this.state.state + (this.state === this.states.synchronizing ? ', but with an upgrade already in progress' : '') + ') is not valid to upgrade in; abandoning upgrade');
			abandon();
			return;
		}

		if(!betterTransportThan(transport, currentTransport)) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Proposed transport ' + transport.shortName + ' is no better than current active transport ' + currentTransport.shortName + ' - abandoning upgrade');
			abandon();
			return;
		}

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Scheduling transport upgrade; transport = ' + transport);

		this.realtime.channels.onceNopending(function(err) {
			var oldProtocol;
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Unable to activate transport; transport = ' + transport + '; err = ' + err);
				return;
			}

			/* Possible race condition if two upgrade transports were both hanging on for nopending */
			if(self.state === self.states.synchronizing) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Abandoning proposed transport ' + transport.shortName + ' as an upgrade is already in progress');
				abandon();
				return;
			}

			if(self.state === self.states.connected) {
				/* If currently connected, temporarily pause events until the sync is complete. */
				self.state = self.states.synchronizing;
				oldProtocol = self.activeProtocol;
			}

			/* If the connectionId has changed, the upgrade hasn't worked. But as
			* it's still an upgrade, realtime still expects a sync - it just needs to
			* be a sync with the new connectionSerial (which will be -1). (And it
			* needs to be set in the library, which is done by activateTransport). */
			var connectionReset = connectionId !== self.connectionId,
				newConnectionSerial = connectionReset ? connectionSerial : self.connectionSerial;

			if(connectionReset) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Upgrade resulted in new connectionId; resetting library connectionSerial from ' + self.connectionSerial + ' to ' + newConnectionSerial + '; upgrade error was ' + error);
			}

			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Syncing transport; transport = ' + transport);
			self.sync(transport, function(err, newConnectionSerial, connectionId) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Unexpected error attempting to sync transport; transport = ' + transport + '; err = ' + err);
					return;
				}
				var finishUpgrade = function() {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Activating transport; transport = ' + transport);
					self.activateTransport(error, transport, connectionKey, newConnectionSerial, connectionId, connectionDetails);
					/* Restore pre-sync state. If state has changed in the meantime,
					 * don't touch it -- since the websocket transport waits a tick before
					 * disposing itself, it's possible for it to have happily synced
					 * without err while, unknown to it, the connection has closed in the
					 * meantime and the ws transport is scheduled for death */
					if(self.state === self.states.synchronizing) {
						Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.scheduleTransportActivation()', 'Pre-upgrade protocol idle, sending queued messages on upgraded transport; transport = ' + transport);
						self.state = self.states.connected;
					} else {
						Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Pre-upgrade protocol idle, but state is now ' + self.state.state + ', so leaving unchanged');
					}
					if(self.state.sendEvents) {
						self.sendQueuedMessages();
					}
				};

				/* Wait until sync is done and old transport is idle before activating new transport. This
				 * guarantees that messages arrive at realtime in the same order they are sent.
				 *
				 * If a message times out on the old transport, since it's still the active transport the
				 * message will be requeued. deactivateTransport will see the pending transport and notify
				 * the `connecting` state without starting a new connection, so the new transport can take
				 * over once deactivateTransport clears the old protocol's queue.
				 *
				 * If there is no old protocol, that meant that we weren't in the connected state at the
				 * beginning of the sync - likely the base transport died just before the sync. So can just
				 * finish the upgrade. If we're actually in closing/failed rather than connecting, that's
				 * fine, activatetransport will deal with that. */
				if(oldProtocol) {
				 /* Most of the time this will be already true: the new-transport sync will have given
				 * enough time for in-flight messages on the old transport to complete. */
					oldProtocol.onceIdle(finishUpgrade);
				} else {
					finishUpgrade();
				}
			});
		});
	};

	/**
	 * Called when a transport is connected, and the connectionmanager decides that
	 * it will now be the active transport. Returns whether or not it activated
	 * the transport (if the connection is closing/closed it will choose not to).
	 * @param transport the transport instance
	 * @param connectionKey the key of the new active connection
	 * @param connectionSerial the current connectionSerial
	 * @param connectionId the id of the new active connection
	 */
	ConnectionManager.prototype.activateTransport = function(error, transport, connectionKey, connectionSerial, connectionId, connectionDetails) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport);
		if(error) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', 'error = ' + error);
		}
		if(connectionKey)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionKey =  ' + connectionKey);
		if(connectionSerial !== undefined)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionSerial =  ' + connectionSerial);
		if(connectionId)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionId =  ' + connectionId);
		if(connectionDetails)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionDetails =  ' + JSON.stringify(connectionDetails));

		this.persistTransportPreferences(transport);

		/* if the connectionmanager moved to the closing/closed state before this
		 * connection event, then we won't activate this transport */
		var existingState = this.state;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'current state = ' + existingState.state);
		if(existingState.state == this.states.closing.state || existingState.state == this.states.closed.state || existingState.state == this.states.failed.state)
			return false;

		/* remove this transport from pending transports */
		Utils.arrDeleteValue(this.pendingTransports, transport);

		/* if the transport is not connected (eg because it failed during a
		 * scheduleTransportActivation#onceNoPending wait) then don't activate it */
		if(!transport.isConnected) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'Declining to activate transport ' + transport + ' since it appears to no longer be connected');
			return false;
		}

		/* the given transport is connected; this will immediately
		 * take over as the active transport */
		var existingActiveProtocol = this.activeProtocol;
		this.activeProtocol = new Protocol(transport);
		this.host = transport.params.host;
		if(connectionKey && this.connectionKey != connectionKey)  {
			this.setConnection(connectionId, connectionKey, connectionSerial);
		}

		var clientId = connectionDetails && connectionDetails.clientId;
		if(clientId) {
			var err = this.realtime.auth._uncheckedSetClientId(clientId);
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', err.message);
				transport.abort(err);
				return;
			}
		}

		this.emit('transport.active', transport, connectionKey, transport.params);

		/* If previously not connected, notify the state change (including any
		 * error).  If previously connected (ie upgrading), no state change, so
		* emit any error as a standalone event */
		if(existingState.state === this.states.connected.state) {
			if(error) {
				this.emit('error', error);
				/* if upgrading without error, leave any existing errorReason alone */
				this.errorReason = this.realtime.connection.errorReason = error;
			}
		} else {
			this.notifyState({state: 'connected', error: error});
			this.errorReason = this.realtime.connection.errorReason = error || null;
		}

		/* Gracefully terminate existing protocol */
		if(existingActiveProtocol) {
			existingActiveProtocol.finish();
		}

		/* Terminate any other pending transport(s), and
		 * abort any not-yet-pending transport attempts */
		Utils.arrForEach(this.pendingTransports, function(transport) {
			transport.disconnect();
		});
		Utils.arrForEach(this.proposedTransports, function(transport) {
			transport.dispose();
		});

		return true;
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

		var currentProtocol = this.activeProtocol,
			wasActive = currentProtocol && currentProtocol.getTransport() === transport,
			wasPending = Utils.arrDeleteValue(this.pendingTransports, transport);

		if(wasActive) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'Getting, clearing, and requeuing ' + this.activeProtocol.messageQueue.count() + ' pending messages');
			this.queuePendingMessages(currentProtocol.getPendingMessages());
			/* Clear any messages we requeue to allow the protocol to become idle.
			 * In case of an upgrade, this will trigger an immediate activation of
			 * the upgrade transport, so delay a tick so this transport can finish
			 * deactivating */
			Utils.nextTick(function() {
				currentProtocol.clearPendingMessages();
			});
			this.activeProtocol = this.host = null;
		}

		this.emit('transport.inactive', transport);

		/* this transport state change is a state change for the connectionmanager if
		 * - the transport was the active transport and there are no transports
		 *   which are connected and scheduled for activation, just waiting for the
		 *   active transport to finish what its doing; or
		 * - there is no active transport, and this is the last remaining
		 *   pending transport (so we were in the connecting state)
		 */
		if((wasActive && this.noTransportsScheduledForActivation()) ||
			 (currentProtocol === null && wasPending && this.pendingTransports.length === 0)) {
			/* Transport failures only imply a connection failure
			 * if the reason for the failure is fatal */
			if((state === 'failed') && error && !isFatalErr(error)) {
				state = 'disconnected';
			}
			this.notifyState({state: state, error: error});
		} else if(wasActive) {
			/* If we were active but there is another transport scheduled for
			* activation, go into to the connecting state until that transport
			* activates and sets us back to connected */
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'wasActive but another transport is connected and scheduled for activation, so going into the connecting state until it activates');
			this.notifyState({state: 'connecting', error: error});
		}
	};

	/* Helper that returns true if there are no transports which are pending,
	* have been connected, and are just waiting for onceNoPending to fire before
	* being activated */
	ConnectionManager.prototype.noTransportsScheduledForActivation = function() {
		return Utils.isEmpty(this.pendingTransports) ||
			this.pendingTransports.every(function(transport) {
				return !transport.isConnected;
			});
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
		if(connectionId !== this.connectionId) {
			/* if connectionKey changes but connectionId stays the same, then just a
			* transport change on the same connection, so msgSerial should not reset */
			this.msgSerial = 0;
		}
		this.realtime.connection.id = this.connectionId = connectionId;
		this.realtime.connection.key = this.connectionKey = connectionKey;
		this.realtime.connection.serial = this.connectionSerial = (connectionSerial === undefined) ? -1 : connectionSerial;
		this.realtime.connection.recoveryKey = connectionKey + ':' + this.connectionSerial;
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
		if(haveWebStorage && this.connectionKey && this.connectionSerial !== undefined) {
			setSessionRecoverData({
				recoveryKey: this.connectionKey + ':' + this.connectionSerial,
				disconnectedAt: Utils.now(),
				location: window.location,
				clientId: this.realtime.auth.clientId
			}, this.options.timeouts.connectionStateTtl);
		}
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery. Only applicable in the browser context.
	 */
	ConnectionManager.prototype.unpersistConnection = function() {
		clearSessionRecoverData();
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
		var logLevel = stateChange.current === 'failed' ? Logger.LOG_ERROR : Logger.LOG_MAJOR;
		Logger.logAction(logLevel, 'Connection state', stateChange.current + (stateChange.reason ? ('; reason: ' + stateChange.reason.message + ', code: ' + stateChange.reason.code) : ''));
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

		/* We retry immediately if:
		 * - something disconnects us while we're connected, or
		 * - a viable (but not yet active) transport fails due to a token error (so
		 *   this.errorReason will be set, and startConnect will do a forced authorise) */
		var retryImmediately = (state === 'disconnected' &&
			(this.state === this.states.connected ||
				(this.state === this.states.connecting  &&
					indicated.error && Auth.isTokenErr(indicated.error))));

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

		if(retryImmediately) {
			Utils.nextTick(function() {
				self.requestState({state: 'connecting'});
			});
		} else if(newState.retryDelay) {
			this.startRetryTimer(newState.retryDelay);
		}

		 /* If going into disconnect/suspended (and not retrying immediately), or a
			* terminal state, ensure there are no orphaned transports hanging around. */
		if((state === 'disconnected' && !retryImmediately) ||
			 (state === 'suspended') ||
			 newState.terminal) {
				 /* Wait till the next tick so the connection state change is enacted,
				 * so aborting transports doesn't trigger redundant state changes */
				 Utils.nextTick(function() {
					 self.disconnectAllTransports();
				 });
		 }

		if(state == 'connected' && !this.activeProtocol) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.notifyState()', 'Broken invariant: attempted to go into connected state, but there is no active protocol');
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
			Utils.nextTick(function() { self.startConnect(); });
		} else if(state == 'closing') {
			if(this.state.state == 'closed')
				return; /* silently do nothing */
			Utils.nextTick(function() { self.closeImpl(); });
		}

		var newState = this.states[state],
			change = new ConnectionStateChange(this.state.state, newState.state, newState.retryIn, (request.error || ConnectionError[newState.state]));

		this.enactStateChange(change);
	};


	ConnectionManager.prototype.startConnect = function() {
		var auth = this.realtime.auth,
			self = this;

		var connect = function() {
			self.getTransportParams(function(transportParams) {
				self.connectImpl(transportParams);
			});
		};

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startConnect()', 'starting connection');
		this.startSuspendTimer();
		this.startTransitionTimer(this.states.connecting);

		if(auth.method === 'basic') {
			connect();
		} else {
			var authOptions = (this.errorReason && Auth.isTokenErr(this.errorReason)) ? {force: true} : null;
			auth.authorise(null, authOptions, function(err) {
				if(err) {
					self.notifyState({state: 'failed', error: err});
				} else {
					connect();
				}
			});
		}
	};


	/**
	 * There are three stages in connecting:
	 * - preference: if there is a cached transport preference, we try to connect
	 *   on that. If that fails or times out we abort the attempt, remove the
	 *   preference and fall back to base. If it succeeds, we try upgrading it if
	 *   needed (will only be in the case where the preference is xhrs and the
	 *   browser supports ws).
	 * - base: we try to connect with the best transport that we think will
	 *   never fail for this browser (usually this is xhr_polling; for very old
	 *   browsers will be jsonp, for node will be comet). If it doesn't work, we
	 *   try fallback hosts.
	 * - upgrade: given a connected transport, we see if there are any better
	 *   ones, and if so, try to upgrade to them.
	 *
	 * connectImpl works out what stage you're at (which is purely a function of
	 * the current connection state and whether there are any stored preferences),
	 * and dispatches accordingly. After a transport has been set pending,
	 * tryATransport calls connectImpl to see if there's another stage to be done.
	 * */
	ConnectionManager.prototype.connectImpl = function(transportParams) {
		var state = this.state.state;

		if(state !== this.states.connecting.state && state !== this.states.connected.state) {
			/* Only keep trying as long as in the 'connecting' state (or 'connected'
			 * for upgrading). Any operation can put us into 'disconnected' to cancel
			 * connection attempts and wait before retrying, or 'failed' to fail. */
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'Must be in connecting state to connect (or connected to upgrade), but was ' + state);
		} else if(this.pendingTransports.length) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'Transports ' + this.pendingTransports[0].toString() + ' currently pending; taking no action');
		} else if(state == this.states.connected.state) {
			this.upgradeIfNeeded(transportParams);
		} else if(this.transports.length > 1 && getTransportPreference()) {
			this.connectPreference(transportParams);
		} else {
			this.connectBase(transportParams);
		}
	};


	ConnectionManager.prototype.connectPreference = function(transportParams) {
		var preference = getTransportPreference(),
			self = this,
			preferenceTimeoutExpired = false;

		if(!Utils.arrIn(this.transports, preference)) {
			clearTransportPreference();
			this.connectImpl(transportParams);
		}

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectPreference()', 'Trying to connect with stored transport preference ' + preference);

		var preferenceTimeout = setTimeout(function() {
			preferenceTimeoutExpired = true;
			if(!(self.state.state === self.states.connected.state)) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectPreference()', 'Shortcircuit connection attempt with ' + preference + ' failed; clearing preference and trying from scratch');
				/* Abort all connection attempts. (This also disconnects the active
				 * protocol, but none exists if we're not in the connected state) */
				self.disconnectAllTransports();
				/* Be quite agressive about clearing the stored preference if ever it doesn't work */
				clearTransportPreference();
			}
			self.connectImpl(transportParams);
		}, this.options.timeouts.preferenceConnectTimeout);

		/* For connectPreference, just use the main host. If host fallback is needed, do it in connectBase.
		 * The wstransport it will substitute the httphost for an appropriate wshost */
		transportParams.host = self.httpHosts[0];
		self.tryATransport(transportParams, preference, function(err, transport) {
			if(preferenceTimeoutExpired && transport) {
				/* Viable, but too late - connectImpl() will already be trying
				* connectBase, and we weren't in upgrade mode. Just remove the
				* onconnected listener and get rid of it */
				transport.off();
				transport.disconnect();
				Utils.arrDeleteValue(this.pendingTransports, transport);
			} else {
				clearTimeout(preferenceTimeout);
				if(err) {
					clearTransportPreference();
					self.failConnectionIfFatal(err);
					self.connectImpl(transportParams);
				}
			}
		});
	};


	/**
	 * Try to establish a transport on the base transport (the best transport
	 * such that if it doesn't work, nothing will work) as determined through
	 * static feature detection, checking for network connectivity and trying
	 * fallback hosts if applicable.
	 * @param transportParams
	 */
	ConnectionManager.prototype.connectBase = function(transportParams) {
		var self = this,
			giveUp = function(err) {
				self.notifyState({state: self.states.connecting.failState, error: err});
			},
			candidateHosts = this.httpHosts.slice(),
			hostAttemptCb = function(err) {
				if(err) {
					var wasFatal = self.failConnectionIfFatal(err);
					if(!wasFatal) {
						tryFallbackHosts();
						return;
					}
				}
			};

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectBase()', 'Trying to connect with base transport ' + this.baseTransport);

		/* first try to establish a connection with the priority host with http transport */
		var host = candidateHosts.shift();
		if(!host) {
			giveUp(new ErrorInfo('Unable to connect (no available host)', 80000, 404));
			return;
		}
		transportParams.host = host;

		/* this is what we'll be doing if the attempt for the main host fails */
		function tryFallbackHosts() {
			/* if there aren't any fallback hosts, fail */
			if(!candidateHosts.length) {
				giveUp(new ErrorInfo('Unable to connect (and no more fallback hosts to try)', 80000, 404));
				return;
			}
			/* before trying any fallback (or any remaining fallback) we decide if
			 * there is a problem with the ably host, or there is a general connectivity
			 * problem */
			var connectivityCheckTransport = self.baseTransport === 'web_socket' ? 'xhr_polling' : self.baseTransport;
			ConnectionManager.supportedTransports[connectivityCheckTransport].checkConnectivity(function(err, connectivity) {
				/* we know err won't happen but handle it here anyway */
				if(err) {
					giveUp(err);
					return;
				}
				if(!connectivity) {
					/* the internet isn't reachable, so don't try the fallback hosts */
					giveUp(new ErrorInfo('Unable to connect (network unreachable)', 80000, 404));
					return;
				}
				/* the network is there, so there's a problem with the main host, or
				 * its dns. Try the fallback hosts. We could try them simultaneously but
				 * that would potentially cause a huge spike in load on the load balancer */
				transportParams.host = Utils.arrPopRandomElement(candidateHosts);
				self.tryATransport(transportParams, self.baseTransport, hostAttemptCb);
			});
		}

		this.tryATransport(transportParams, this.baseTransport, hostAttemptCb);
	};


	ConnectionManager.prototype.getUpgradePossibilities = function() {
		/* returns the subset of upgradeTransports to the right of the current
		 * transport in upgradeTransports (if it's in there - if not, currentPosition
		 * will be -1, so return upgradeTransports.slice(0) == upgradeTransports */
		var current = this.activeProtocol.getTransport().shortName;
		var currentPosition = Utils.arrIndexOf(this.upgradeTransports, current);
		return this.upgradeTransports.slice(currentPosition + 1);
	};


	ConnectionManager.prototype.upgradeIfNeeded = function(transportParams) {
		var upgradePossibilities = this.getUpgradePossibilities(),
			self = this;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.upgradeIfNeeded()', 'upgrade possibilities: ' + Utils.inspect(upgradePossibilities));

		if(!upgradePossibilities.length) {
			return;
		}

		var upgradeTransportParams = new TransportParams(this.options, transportParams.host, 'upgrade', this.connectionKey);
		Utils.arrForEach(upgradePossibilities, function(upgradeTransport) {
			self.tryATransport(upgradeTransportParams, upgradeTransport, noop);
		});
	};


	ConnectionManager.prototype.closeImpl = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing connection');
		this.cancelSuspendTimer();
		this.startTransitionTimer(this.states.closing);

		function closeTransport(transport) {
			if(transport) {
				try {
					transport.close();
				} catch(e) {
					var msg = 'Unexpected exception attempting to close transport; e = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.closeImpl()', msg);
					transport.abort(new ErrorInfo(msg, 50000, 500));
				}
			}
		}

		Utils.arrForEach(this.pendingTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing pending transport: ' + transport);
			closeTransport(transport);
		});
		this.pendingTransports = [];

		Utils.arrForEach(this.proposedTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Disposing of proposed transport: ' + transport);
			transport.dispose();
		});
		this.proposedTransports = [];

		if(this.activeProtocol) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing active transport: ' + this.activeProtocol.getTransport());
			closeTransport(this.activeProtocol.getTransport());
		}

		/* If there was an active transport, this will probably be
		 * preempted by the notifyState call in deactivateTransport */
		this.notifyState({state: 'closed'});
	};

	ConnectionManager.prototype.onAuthUpdated = function() {
		/* in the current protocol version we are not able to update auth params on the fly;
		 * so disconnect, and the new auth params will be used for subsequent reconnection */
		var state = this.state.state;
		if(state == 'connected') {
			this.disconnectAllTransports();
		} else if(state == 'connecting' || state == 'disconnected') {
			/* the instant auto-reconnect is only for connected->disconnected transition */
			this.disconnectAllTransports();
			var self = this;
			Utils.nextTick(function() {
				self.requestState({state: 'connecting'});
			});
		}
	};

	ConnectionManager.prototype.disconnectAllTransports = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting all transports');

		function disconnectTransport(transport) {
			if(transport) {
				try {
					transport.disconnect();
				} catch(e) {
					var msg = 'Unexpected exception attempting to disconnect transport; e = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.disconnectAllTransports()', msg);
					transport.abort(new ErrorInfo(msg, 50000, 500));
				}
			}
		}

		Utils.arrForEach(this.pendingTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting pending transport: ' + transport);
			disconnectTransport(transport);
		});
		this.pendingTransports = [];

		Utils.arrForEach(this.proposedTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disposing of proposed transport: ' + transport);
			transport.dispose();
		});
		this.proposedTransports = [];

		if(this.activeProtocol) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting active transport: ' + this.activeProtocol.getTransport());
			disconnectTransport(this.activeProtocol.getTransport());
		}
		/* No need to notify state disconnected; disconnecting the active transport
		 * will have that effect */
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
		var onActiveTransport = this.activeProtocol && transport === this.activeProtocol.getTransport(),
			onUpgradeTransport = Utils.arrIn(this.pendingTransports, transport) && this.state == this.states.synchronizing;

		/* As the lib now has a period where the upgrade transport is synced but
		 * before it's become active (while waiting for the old one to become
		 * idle), message can validly arrive on it even though it isn't active */
		if(onActiveTransport || onUpgradeTransport) {
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
		/* if transport is specified, try that */
		if(transport) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.ping()', 'transport = ' + transport);

			var onTimeout = function () {
				transport.off('heartbeat', onHeartbeat);
				callback(new ErrorInfo('Timedout waiting for heartbeat response', 50000, 500));
			};

			var pingStart = Utils.now();

			var onHeartbeat = function () {
				clearTimeout(timer);
				var responseTime = Utils.now() - pingStart;
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

	ConnectionManager.prototype.failConnectionIfFatal = function(err) {
		/* Only allow connection to go into 'failed' if the has a definite
		 * unrecoverable code from realtime */
		var unrecoverable = err.code && isFatalErr(err);
		if(unrecoverable) {
			this.notifyState({state: 'failed', error: err});
		}
		return unrecoverable;
	};

	ConnectionManager.prototype.registerProposedTransport = function(transport) {
		this.proposedTransports.push(transport);
	};

	ConnectionManager.prototype.persistTransportPreferences = function(transport) {
		if(Utils.arrIn(Defaults.upgradeTransports, transport.shortName)) {
			setTransportPreference(transport.shortName);
		}
	};

	return ConnectionManager;
})();
