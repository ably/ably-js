var ConnectionManager = (function() {
	var haveWebStorage = !!(typeof(WebStorage) !== 'undefined' && WebStorage.get);
	var haveSessionStorage = !!(typeof(WebStorage) !== 'undefined' && WebStorage.getSession);
	var actions = ProtocolMessage.Action;
	var PendingMessage = Protocol.PendingMessage;
	var noop = function() {};
	var transportPreferenceOrder = Defaults.transportPreferenceOrder;
	var optimalTransport = transportPreferenceOrder[transportPreferenceOrder.length - 1];
	var transportPreferenceName = 'ably-transport-preference';

	var sessionRecoveryName = 'ably-connection-recovery';
	function getSessionRecoverData() {
		return haveSessionStorage && WebStorage.getSession(sessionRecoveryName);
	}
	function setSessionRecoverData(value) {
		return haveSessionStorage && WebStorage.setSession(sessionRecoveryName, value);
	}
	function clearSessionRecoverData() {
		return haveSessionStorage && WebStorage.removeSession(sessionRecoveryName);
	}

	function betterTransportThan(a, b) {
		return Utils.arrIndexOf(transportPreferenceOrder, a.shortName) >
		   Utils.arrIndexOf(transportPreferenceOrder, b.shortName);
	}

	function TransportParams(options, host, mode, connectionKey) {
		this.options = options;
		this.host = host;
		this.mode = mode;
		this.connectionKey = connectionKey;
		this.format = options.useBinaryProtocol ? 'msgpack' : 'json';

		this.connectionSerial = undefined;
		this.timeSerial = undefined;
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
				if(this.timeSerial !== undefined) {
					params.timeSerial = this.timeSerial;
				} else if(this.connectionSerial !== undefined) {
					params.connectionSerial = this.connectionSerial;
				}
				break;
			case 'recover':
				var match = options.recover.split(':');
				if(match) {
					params.recover = match[0];
					var recoverSerial = match[1];
					if(isNaN(recoverSerial)) {
						params.timeSerial = recoverSerial;
					} else {
						params.connectionSerial = recoverSerial;
					}
				}
				break;
			default:
		}
		if(options.clientId !== undefined) {
			params.clientId = options.clientId;
		}
		if(options.echoMessages === false) {
			params.echo = 'false';
		}
		if(this.format !== undefined) {
			params.format = this.format;
		}
		if(this.stream !== undefined) {
			params.stream = this.stream;
		}
		if(this.heartbeats !== undefined) {
			params.heartbeats = this.heartbeats;
		}
		params.v = Defaults.apiVersion;
		params.lib = Defaults.libstring;
		if(options.transportParams !== undefined) {
			Utils.mixin(params, options.transportParams);
		}
		return params;
	};

	TransportParams.prototype.toString = function() {
		var result = '[mode=' + this.mode;
		if(this.host) { result += (',host=' + this.host); }
		if(this.connectionKey) { result += (',connectionKey=' + this.connectionKey); }
		if(this.connectionSerial !== undefined) { result += (',connectionSerial=' + this.connectionSerial); }
		if(this.timeSerial) { result += (',timeSerial=' + this.timeSerial); }
		if(this.format) { result += (',format=' + this.format); }
		result += ']';

		return result;
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
			initialized:   {state: 'initialized',   terminal: false, queueEvents: true,  sendEvents: false, failState: 'disconnected'},
			connecting:    {state: 'connecting',    terminal: false, queueEvents: true,  sendEvents: false, retryDelay: connectingTimeout, failState: 'disconnected'},
			connected:     {state: 'connected',     terminal: false, queueEvents: false, sendEvents: true,  failState: 'disconnected'},
			synchronizing: {state: 'connected',     terminal: false, queueEvents: true,  sendEvents: false, forceQueueEvents: true, failState: 'disconnected'},
			disconnected:  {state: 'disconnected',  terminal: false, queueEvents: true,  sendEvents: false, retryDelay: timeouts.disconnectedRetryTimeout, failState: 'disconnected'},
			suspended:     {state: 'suspended',     terminal: false, queueEvents: false, sendEvents: false, retryDelay: timeouts.suspendedRetryTimeout, failState: 'suspended'},
			closing:       {state: 'closing',       terminal: false, queueEvents: false, sendEvents: false, retryDelay: timeouts.realtimeRequestTimeout, failState: 'closed'},
			closed:        {state: 'closed',        terminal: true,  queueEvents: false, sendEvents: false, failState: 'closed'},
			failed:        {state: 'failed',        terminal: true,  queueEvents: false, sendEvents: false, failState: 'failed'}
		};
		this.state = this.states.initialized;
		this.errorReason = null;

		this.queuedMessages = new MessageQueue();
		this.msgSerial = 0;
		this.connectionDetails = undefined;
		this.connectionId = undefined;
		this.connectionKey = undefined;
		this.timeSerial = undefined;
		this.connectionSerial = undefined;
		this.connectionStateTtl = timeouts.connectionStateTtl;
		this.maxIdleInterval = null;

		this.transports = Utils.intersect((options.transports || Defaults.defaultTransports), ConnectionManager.supportedTransports);
		/* baseTransports selects the leftmost transport in the Defaults.baseTransportOrder list
		* that's both requested and supported. Normally this will be xhr_polling;
		* if xhr isn't supported it will be jsonp. If the user has forced a
		* transport, it'll just be that one. */
		this.baseTransport = Utils.intersect(Defaults.baseTransportOrder, this.transports)[0];
		this.upgradeTransports = Utils.intersect(this.transports, Defaults.upgradeTransports);
		this.transportPreference = null;

		this.httpHosts = Defaults.getHosts(options);
		this.activeProtocol = null;
		this.proposedTransports = [];
		this.pendingTransports = [];
		this.host = null;
		this.lastAutoReconnectAttempt = null;
		this.lastActivity = null;
		this.mostRecentMsg = null;
		this.forceFallbackHost = false;
		this.connectCounter = 0;

		Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + (options.transports || Defaults.defaultTransports) + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + this.transports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');

		if(!this.transports.length) {
			var msg = 'no requested transports available';
			Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
			throw new Error(msg);
		}

		var addEventListener = Platform.addEventListener;
		if(addEventListener) {
			/* intercept close event in browser to persist connection id if requested */
			if(haveSessionStorage && typeof options.recover === 'function') {
				/* Usually can't use bind as not supported in IE8, but IE doesn't support sessionStorage, so... */
				addEventListener('beforeunload', this.persistConnection.bind(this));
			}

			if(options.closeOnUnload === true) {
				addEventListener('beforeunload', function() {
					Logger.logAction(Logger.LOG_MAJOR, 'Realtime.ConnectionManager()', 'beforeunload event has triggered the connection to close as closeOnUnload is true');
					self.requestState({state: 'closing'});
				});
			}

			/* Listen for online and offline events */
			addEventListener('online', function() {
				if(self.state == self.states.disconnected || self.state == self.states.suspended) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager caught browser ‘online’ event', 'reattempting connection');
					self.requestState({state: 'connecting'});
				}
			});
			addEventListener('offline', function() {
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

	ConnectionManager.prototype.createTransportParams = function(host, mode) {
		var params = new TransportParams(this.options, host, mode, this.connectionKey);
		if(this.timeSerial) {
			params.timeSerial = this.timeSerial;
		} else if(this.connectionSerial !== undefined) {
			params.connectionSerial = this.connectionSerial;
		}
		return params;
	};

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
			var transportParams = self.createTransportParams(null, mode);
			if(mode === 'recover') {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Transport recovery mode = recover; recoveryKey = ' + self.options.recover);
				var match = self.options.recover.split(':');
				if(match && match[2]) {
					self.msgSerial = match[2];
				}
			} else {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Transport params = ' + transportParams.toString());
			}
			callback(transportParams);
		});
	};

	/**
	 * Attempt to connect using a given transport
	 * @param transportParams
	 * @param candidate, the transport to try
	 * @param callback
	 */
	ConnectionManager.prototype.tryATransport = function(transportParams, candidate, callback) {
		var self = this, host = transportParams.host;
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.tryATransport()', 'trying ' + candidate);
		(ConnectionManager.supportedTransports[candidate]).tryConnect(this, this.realtime.auth, transportParams, function(wrappedErr, transport) {
			var state = self.state;
			if(state == self.states.closing || state == self.states.closed || state == self.states.failed) {
				if(transport) {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.tryATransport()', 'connection ' + state.state + ' while we were attempting the transport; closing ' + transport);
					transport.close();
				}
				callback(true);
				return;
			}

			if(wrappedErr) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.tryATransport()', 'transport ' + candidate + ' ' + wrappedErr.event + ', err: ' + wrappedErr.error.toString());

				/* Comet transport onconnect token errors can be dealt with here.
				* Websocket ones only happen after the transport claims to be viable,
				* so are dealt with as non-onconnect token errors */
				if(Auth.isTokenErr(wrappedErr.error)) {
					/* re-get a token and try again */
					self.realtime.auth._forceNewToken(null, null, function(err) {
						if(err) {
							self.actOnErrorFromAuthorize(err);
							return;
						}
						self.tryATransport(transportParams, candidate, callback);
					});
				} else if(wrappedErr.event === 'failed') {
					/* Error that's fatal to the connection */
					self.notifyState({state: 'failed', error: wrappedErr.error});
					callback(true);
				} else if(wrappedErr.event === 'disconnected') {
					/* Error with that transport only */
					callback(false);
				}
				return;
			}

			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.tryATransport()', 'viable transport ' + candidate + '; setting pending');
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
		transport.once('connected', function(error, connectionId, connectionDetails, connectionPosition) {
			if(mode == 'upgrade' && self.activeProtocol) {
				/*  if ws and xhrs are connecting in parallel, delay xhrs activation to let ws go ahead */
				if(transport.shortName !== optimalTransport && Utils.arrIn(self.getUpgradePossibilities(), optimalTransport)) {
					setTimeout(function() {
						self.scheduleTransportActivation(error, transport, connectionId, connectionDetails, connectionPosition);
					}, self.options.timeouts.parallelUpgradeDelay);
				} else {
					self.scheduleTransportActivation(error, transport, connectionId, connectionDetails, connectionPosition);
				}
			} else {
				self.activateTransport(error, transport, connectionId, connectionDetails, connectionPosition);

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

		transport.on(['disconnected', 'closed', 'failed'], function(error) {
			self.deactivateTransport(transport, this.event, error);
		});

		this.emit('transport.pending', transport);
	};

	/**
	 * Called when an upgrade transport is connected,
	 * to schedule the activation of that transport.
	 * @param error
	 * @param transport
	 * @param connectionId
	 * @param connectionDetails
	 * @param connectedMessage
	 */
	ConnectionManager.prototype.scheduleTransportActivation = function(error, transport, connectionId, connectionDetails, upgradeConnectionPosition) {
		var self = this,
			currentTransport = this.activeProtocol && this.activeProtocol.getTransport(),
			abandon = function() {
				transport.disconnect();
				Utils.arrDeleteValue(self.pendingTransports, transport);
			};

		if(this.state !== this.states.connected && this.state !== this.states.connecting) {
			/* This is most likely to happen for the delayed xhrs, when xhrs and ws are scheduled in parallel*/
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Current connection state (' + this.state.state + (this.state === this.states.synchronizing ? ', but with an upgrade already in progress' : '') + ') is not valid to upgrade in; abandoning upgrade to ' + transport.shortName);
			abandon();
			return;
		}

		if(currentTransport && !betterTransportThan(transport, currentTransport)) {
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

			if(!transport.isConnected) {
				/* This is only possible if the xhr streaming transport was disconnected during the parallelUpgradeDelay */
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Proposed transport ' + transport.shortName + 'is no longer connected; abandoning upgrade');
				abandon();
				return;
			}

			if(self.state === self.states.connected) {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.scheduleTransportActivation()', 'Currently connected, so temporarily pausing events until the upgrade is complete');
				self.state = self.states.synchronizing;
				oldProtocol = self.activeProtocol;
			} else if(self.state !== self.states.connecting) {
				/* Note: upgrading from the connecting state is valid if the old active
				* transport was deactivated after the upgrade transport first connected;
				* see logic in deactivateTransport */
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Current connection state (' + self.state.state + (self.state === self.states.synchronizing ? ', but with an upgrade already in progress' : '') + ') is not valid to upgrade in; abandoning upgrade to ' + transport.shortName);
				abandon();
				return;
			}

			/* If the connectionId has changed, the upgrade hasn't worked. But as
			* it's still an upgrade, realtime still expects a sync - it just needs to
			* be a sync with the new connection position. (And it
			* needs to be set in the library, which is done by activateTransport). */
			var connectionReset = connectionId !== self.connectionId,
				syncPosition = connectionReset ? upgradeConnectionPosition : self;

			if(connectionReset) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Upgrade resulted in new connectionId; resetting library connection position from ' + (self.timeSerial || self.connectionSerial) + ' to ' + (syncPosition.timeSerial || syncPosition.connectionSerial) + '; upgrade error was ' + error);
			}

			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Syncing transport; transport = ' + transport);
			self.sync(transport, syncPosition, function(syncErr, connectionId, postSyncPosition) {
				/* If there's been some problem with syncing (and the connection hasn't
				 * closed or something in the meantime), we have a problem -- we can't
				 * just fall back on the old transport, as we don't know whether
				 * realtime got the sync -- if it did, the old transport is no longer
				 * valid. To be safe, we disconnect both and start again from scratch. */
				if(syncErr) {
					if(self.state === self.states.synchronizing) {
						Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.scheduleTransportActivation()', 'Unexpected error attempting to sync transport; transport = ' + transport + '; err = ' + syncErr);
						self.disconnectAllTransports();
					}
					return;
				}
				var finishUpgrade = function() {
					Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.scheduleTransportActivation()', 'Activating transport; transport = ' + transport);
					self.activateTransport(error, transport, connectionId, connectionDetails, postSyncPosition);
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
	 * @param connectionId the id of the new active connection
	 * @param connectionDetails the details of the new active connection
	 * @param connectionPosition the position at the point activation; either {connectionSerial: <serial>} or {timeSerial: <serial>}
	 */
	ConnectionManager.prototype.activateTransport = function(error, transport, connectionId, connectionDetails, connectionPosition) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport);
		if(error) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', 'error = ' + error);
		}
		if(connectionId) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionId =  ' + connectionId);
		}
		if(connectionDetails) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionDetails =  ' + JSON.stringify(connectionDetails));
		}
		if(connectionPosition) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'serial =  ' + (connectionPosition.timeSerial || connectionPosition.connectionSerial));
		}

		this.persistTransportPreference(transport);

		/* if the connectionmanager moved to the closing/closed state before this
		 * connection event, then we won't activate this transport */
		var existingState = this.state,
			connectedState = this.states.connected.state;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'current state = ' + existingState.state);
		if(existingState.state == this.states.closing.state || existingState.state == this.states.closed.state || existingState.state == this.states.failed.state) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'Disconnecting transport and abandoning');
			transport.disconnect();
			return false;
		}

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

		var connectionKey = connectionDetails.connectionKey;
		if(connectionKey && this.connectionKey != connectionKey)  {
			this.setConnection(connectionId, connectionDetails, connectionPosition, !!error);
		}

		/* Rebroadcast any new connectionDetails from the active transport, which
		 * can come at any time (eg following a reauth), and emit an RTN24 UPDATE
		 * event. (Listener added on nextTick because we're in a transport.on('connected')
		 * callback at the moment; if we add it now we'll be adding it to the end
		 * of the listeners array and it'll be called immediately) */
		this.onConnectionDetailsUpdate(connectionDetails, transport);
		var self = this;
		Utils.nextTick(function() {
			transport.on('connected', function(connectedErr, _connectionId, connectionDetails) {
				self.onConnectionDetailsUpdate(connectionDetails, transport);
				self.emit('update', new ConnectionStateChange(connectedState, connectedState, null, connectedErr));
			});
		})

		/* If previously not connected, notify the state change (including any
		 * error). */
		if(existingState.state === this.states.connected.state) {
			if(error) {
				/* if upgrading without error, leave any existing errorReason alone */
				this.errorReason = this.realtime.connection.errorReason = error;
				/* Only bother emitting an upgrade if there's an error; otherwise it's
				 * just a transport upgrade, so auth details won't have changed */
				this.emit('update', new ConnectionStateChange(connectedState, connectedState, null, error));
			}
		} else {
			this.notifyState({state: 'connected', error: error});
			this.errorReason = this.realtime.connection.errorReason = error || null;
		}

		/* Send after the connection state update, as Channels hooks into this to
		 * resend attaches on a new transport if necessary */
		this.emit('transport.active', transport);

		/* Gracefully terminate existing protocol */
		if(existingActiveProtocol) {
			if(existingActiveProtocol.messageQueue.count() > 0) {
				/* We could just requeue pending messages on the new transport, but
				 * actually this should never happen: transports should only take over
				 * from other active transports when upgrading, and upgrading waits for
				 * the old transport to be idle. So log an error. */
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', 'Previous active protocol (for transport ' + existingActiveProtocol.transport.shortName + ', new one is ' + transport.shortName + ') finishing with ' + existingActiveProtocol.messageQueue.count() + ' messages still pending');
			}
			if(existingActiveProtocol.transport === transport) {
				var msg = 'Assumption violated: activating a transport that was also the transport for the previous active protocol; transport = ' + transport.shortName + '; stack = ' + new Error().stack;
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
				ErrorReporter.report('error', msg, 'transport-previously-active');
			} else {
				existingActiveProtocol.finish();
			}
		}

		/* Terminate any other pending transport(s), and
		 * abort any not-yet-pending transport attempts */
		Utils.safeArrForEach(this.pendingTransports, function(pendingTransport) {
			if(pendingTransport === transport) {
				var msg = 'Assumption violated: activating a transport that is still marked as a pending transport; transport = ' + transport.shortName + '; stack = ' + new Error().stack;
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
				ErrorReporter.report('error', msg, 'transport-activating-pending');
				Utils.arrDeleteValue(self.pendingTransports, transport);
			} else {
				pendingTransport.disconnect();
			}
		});
		Utils.safeArrForEach(this.proposedTransports, function(proposedTransport) {
			if(proposedTransport === transport) {
				var msg = 'Assumption violated: activating a transport that is still marked as a proposed transport; transport = ' + transport.shortName + '; stack = ' + new Error().stack;
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
				ErrorReporter.report('error', msg, 'transport-activating-proposed');
				Utils.arrDeleteValue(self.proposedTransports, transport);
			} else {
				proposedTransport.dispose();
			}
		});

		return true;
	};

	/**
	 * Called when a transport is no longer the active transport. This can occur
	 * in any transport connection state.
	 * @param transport
	 */
	ConnectionManager.prototype.deactivateTransport = function(transport, state, error) {
		var currentProtocol = this.activeProtocol,
			wasActive = currentProtocol && currentProtocol.getTransport() === transport,
			wasPending = Utils.arrDeleteValue(this.pendingTransports, transport),
			wasProposed = Utils.arrDeleteValue(this.proposedTransports, transport),
			noTransportsScheduledForActivation = this.noTransportsScheduledForActivation();

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'state = ' + state + (wasActive ? '; was active' : wasPending ? '; was pending' : wasProposed ? '; was proposed' : '') + (noTransportsScheduledForActivation ? '' : '; another transport is scheduled for activation'));
		if(error && error.message)
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'reason =  ' + error.message);

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
			clearTimeout(this.channelResumeCheckTimer);
		}

		this.emit('transport.inactive', transport);

		/* this transport state change is a state change for the connectionmanager if
		 * - the transport was the active transport and there are no transports
		 *   which are connected and scheduled for activation, just waiting for the
		 *   active transport to finish what its doing; or
		 * - the transport was the active transport and the error was fatal (so
		 *   unhealable by another transport); or
		 * - there is no active transport, and this is the last remaining
		 *   pending transport (so we were in the connecting state)
		 */
		if((wasActive && noTransportsScheduledForActivation) ||
			(wasActive && (state === 'failed') || (state === 'closed')) ||
			(currentProtocol === null && wasPending && this.pendingTransports.length === 0)) {

			/* If we're disconnected with a 5xx we need to try fallback hosts
			 * (RTN14d), but (a) due to how the upgrade sequence works, the
			 * host/transport selection sequence only cares about getting to
			 * `preconnect` (eg establishing a websocket) getting a `disconnected`
			 * protocol message afterwards is too late; and (b) host retry only
			 * applies to connectBase unless the stored preference transport doesn't
			 * work. We solve this by unpersisting the transport preference and
			 * setting an instance variable to force fallback hosts to be used (if
			 * any) here. Bit of a kludge, but no real better alternatives without
			 * rewriting the entire thing */
			if(state === 'disconnected' && error && error.statusCode > 500 && this.httpHosts.length > 1) {
				this.unpersistTransportPreference();
				this.forceFallbackHost = true;
				/* and try to connect again to try a fallback host without waiting for the usual 15s disconnectedRetryTimeout */
				this.notifyState({state: state, error: error, retryImmediately: true});
				return;
			}

			/* TODO remove below line once realtime sends token errors as DISCONNECTEDs */
			var newConnectionState = (state === 'failed' && Auth.isTokenErr(error)) ? 'disconnected' : state;
			this.notifyState({state: newConnectionState, error: error});
			return;
		}

		if(wasActive && (state === 'disconnected') && (this.state !== this.states.synchronizing)) {
			/* If we were active but there is another transport scheduled for
			* activation, go into to the connecting state until that transport
			* activates and sets us back to connected. (manually starting the
			* transition timers in case that never happens). (If we were in the
			* synchronizing state, then that's fine, the old transport just got its
			* disconnected before the new one got the sync -- ignore it and keep
			* waiting for the sync. If it fails we have a separate sync timer that
			* will expire). */
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'wasActive but another transport is connected and scheduled for activation, so going into the connecting state until it activates');
			this.startSuspendTimer();
			this.startTransitionTimer(this.states.connecting);
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
	ConnectionManager.prototype.sync = function(transport, requestedSyncPosition, callback) {
		var timeout = setTimeout(function () {
			transport.off('sync');
			callback(new ErrorInfo('Timeout waiting for sync response', 50000, 500));
		}, this.options.timeouts.realtimeRequestTimeout);

		/* send sync request */
		var syncMessage = ProtocolMessage.fromValues({
			action: actions.SYNC,
			connectionKey: this.connectionKey
		});

		if(requestedSyncPosition.timeSerial) {
			syncMessage.timeSerial = requestedSyncPosition.timeSerial;
		} else if(requestedSyncPosition.connectionSerial !== undefined) {
			syncMessage.connectionSerial = requestedSyncPosition.connectionSerial;
		}
		transport.send(syncMessage);

		transport.once('sync', function(connectionId, syncPosition) {
			clearTimeout(timeout);
			callback(null, connectionId, syncPosition);
		});
	};

	ConnectionManager.prototype.setConnection = function(connectionId, connectionDetails, connectionPosition, hasConnectionError) {
		/* if connectionKey changes but connectionId stays the same, then just a
		 * transport change on the same connection. If connectionId changes, we're
		 * on a new connection, with implications for msgSerial and channel state,
		 * and resetting the connectionSerial position */
		var self = this;
		/* If no previous connectionId, don't reset the msgSerial as it may have
		 * been set by recover data (unless the recover failed) */
		var prevConnId = this.connectionid,
			connIdChanged = prevConnId && (prevConnId !== connectionId),
			recoverFailure = !prevConnId && hasConnectionError;
		if(connIdChanged || recoverFailure)  {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setConnection()', 'Resetting msgSerial');
			this.msgSerial = 0;
		}
		/* but do need to reattach channels, for channels that were previously in
		 * the attached state even though the connection mode was 'clean' due to a
		 * freshness check - see https://github.com/ably/ably-js/issues/394 */
		if(this.connectionId !== connectionId)  {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setConnection()', 'New connectionId; reattaching any attached channels');
			/* Wait till next tick before reattaching channels, so that connection
			 * state will be updated and so that it will be applied after
			 * Channels#onTransportUpdate, else channels will not have an ATTACHED
			 * sent twice (once from this and once from that). */
			Utils.nextTick(function() {
				self.realtime.channels.reattach();
			});
		} else if(this.options.checkChannelsOnResume) {
			/* For attached channels, set the attached msg indicator variable to false,
			 * wait 30s, and check we got an attached for each one.
			 * 30s was chosen to be 5s longer than the transport idle timeout expire
			 * time, in an attempt to avoid false positives due to a transport
			 * silently failing immediately after a resume */
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setConnection()', 'Same connectionId; checkChannelsOnResume is enabled');
			clearTimeout(this.channelResumeCheckTimer);
			this.realtime.channels.resetAttachedMsgIndicators();
			this.channelResumeCheckTimer = setTimeout(function() {
				self.realtime.channels.checkAttachedMsgIndicators(connectionId);
			}, 30000);
		}
		this.realtime.connection.id = this.connectionId = connectionId;
		this.realtime.connection.key = this.connectionKey = connectionDetails.connectionKey;
		var forceResetMessageSerial = connIdChanged || !prevConnId;
		this.setConnectionSerial(connectionPosition, forceResetMessageSerial);
	};

	ConnectionManager.prototype.clearConnection = function() {
		this.realtime.connection.id = this.connectionId = undefined;
		this.realtime.connection.key = this.connectionKey = undefined;
		this.clearConnectionSerial();
		this.msgSerial = 0;
		this.unpersistConnection();
	};

	/* force: set the connectionSerial even if it's less than the current
	 * connectionSerial. Used for new connections.
	 * Returns true iff the message was rejected as a duplicate. */
	ConnectionManager.prototype.setConnectionSerial = function(connectionPosition, force) {
		var timeSerial = connectionPosition.timeSerial,
			connectionSerial = connectionPosition.connectionSerial;
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setConnectionSerial()', 'Updating connection serial; serial = ' + connectionSerial + '; timeSerial = ' + timeSerial + '; force = ' + force + '; previous = ' + this.connectionSerial);
		if(timeSerial !== undefined) {
			if(timeSerial <= this.timeSerial && !force) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.setConnectionSerial()', 'received message with timeSerial ' + timeSerial + ', but current timeSerial is ' + this.timeSerial + '; assuming message is a duplicate and discarding it');
				return true;
			}
			this.realtime.connection.timeSerial = this.timeSerial = timeSerial;
			this.setRecoveryKey();
			return;
		}
		if(connectionSerial !== undefined) {
			if(connectionSerial <= this.connectionSerial && !force) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.setConnectionSerial()', 'received message with connectionSerial ' + connectionSerial + ', but current connectionSerial is ' + this.connectionSerial + '; assuming message is a duplicate and discarding it');
				return true;
			}
			this.realtime.connection.serial = this.connectionSerial = connectionSerial;
			this.setRecoveryKey();
		}
	};

	ConnectionManager.prototype.clearConnectionSerial = function() {
		this.realtime.connection.serial = this.connectionSerial = undefined;
		this.realtime.connection.timeSerial = this.timeSerial = undefined;
		this.clearRecoveryKey();
	};

	ConnectionManager.prototype.setRecoveryKey = function() {
		this.realtime.connection.recoveryKey = this.connectionKey + ':' + (this.timeSerial || this.connectionSerial) + ':' + this.msgSerial;
	};

	ConnectionManager.prototype.clearRecoveryKey = function() {
		this.realtime.connection.recoveryKey = null;
	};

	ConnectionManager.prototype.checkConnectionStateFreshness = function() {
		if(!this.lastActivity || !this.connectionId) { return; }

		var sinceLast = Utils.now() - this.lastActivity;
		if(sinceLast > this.connectionStateTtl + this.maxIdleInterval) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.checkConnectionStateFreshness()', 'Last known activity from realtime was ' + sinceLast + 'ms ago; discarding connection state');
			this.clearConnection();
			this.states.connecting.failState = 'suspended';
			this.states.connecting.queueEvents = false;
		}
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery. Only applicable in the browser context.
	 */
	ConnectionManager.prototype.persistConnection = function() {
		if(haveSessionStorage) {
			var recoveryKey = this.realtime.connection.recoveryKey;
			if(recoveryKey) {
				setSessionRecoverData({
					recoveryKey: recoveryKey,
					disconnectedAt: Utils.now(),
					location: global.location,
					clientId: this.realtime.auth.clientId
				}, this.connectionStateTtl);
			}
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

	ConnectionManager.prototype.getError = function() {
		return this.errorReason || this.getStateError();
	};

	ConnectionManager.prototype.getStateError = function() {
		return ConnectionError[this.state.state];
	};

	ConnectionManager.prototype.activeState = function() {
		return this.state.queueEvents || this.state.sendEvents;
	};

	ConnectionManager.prototype.enactStateChange = function(stateChange) {
		var logLevel = stateChange.current === 'failed' ? Logger.LOG_ERROR : Logger.LOG_MAJOR;
		Logger.logAction(logLevel, 'Connection state', stateChange.current + (stateChange.reason ? ('; reason: ' + stateChange.reason) : ''));
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' + stateChange.current + '; reason = ' + (stateChange.reason && stateChange.reason.message));
		var newState = this.state = this.states[stateChange.current];
		if(stateChange.reason) {
			this.errorReason = stateChange.reason;
			this.realtime.connection.errorReason = stateChange.reason;
		}
		if(newState.terminal || newState.state === 'suspended') {
			/* suspended is nonterminal, but once in the suspended state, realtime
			 * will have discarded our connection state, so futher connection
			 * attempts should start from scratch */
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
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager ' + transitionState.state + ' timer expired', 'requesting new state: ' + transitionState.failState);
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
		}, this.connectionStateTtl);
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
		 *   this.errorReason will be set, and startConnect will do a forced
		 *   authorize). If this.errorReason is already set (to a token error),
		 *   then there has been at least one previous attempt to connect that also
		 *   failed for a token error, so by RTN14b we go to DISCONNECTED and wait
		 *   before trying again */
		var retryImmediately = (state === 'disconnected' &&
			(this.state === this.states.connected     ||
			 this.state === this.states.synchronizing ||
			 indicated.retryImmediately               ||
				(this.state === this.states.connecting &&
					indicated.error && Auth.isTokenErr(indicated.error) &&
					!(this.errorReason && Auth.isTokenErr(this.errorReason)))));

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'new state: ' + state + (retryImmediately ? '; will retry connection immediately' : ''));
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
			var autoReconnect = function() {
				if(self.state === self.states.disconnected) {
					self.lastAutoReconnectAttempt = Utils.now();
					self.requestState({state: 'connecting'});
				}
			};
			var sinceLast = this.lastAutoReconnectAttempt && (Utils.now() - this.lastAutoReconnectAttempt + 1);
			if(sinceLast && (sinceLast < 1000)) {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.notifyState()', 'Last reconnect attempt was only ' + sinceLast + 'ms ago, waiting another ' + (1000 - sinceLast) + 'ms before trying again');
				setTimeout(autoReconnect, 1000 - sinceLast);
			} else {
				Utils.nextTick(autoReconnect);
			}
		} else if(state === 'disconnected' || state === 'suspended') {
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
		if(this.state.sendEvents) {
			this.sendQueuedMessages();
		} else if(!this.state.queueEvents) {
			this.realtime.channels.propogateConnectionInterruption(state, change.reason);
			this.failQueuedMessages(change.reason); // RTN7c
		}
	};

	ConnectionManager.prototype.requestState = function(request) {
		var state = request.state, self = this;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.requestState()', 'requested state: ' + state + '; current state: ' + this.state.state);
		if(state == this.state.state)
			return; /* silently do nothing */

		/* kill running timers, as this request supersedes them */
		this.cancelTransitionTimer();
		this.cancelRetryTimer();
		/* for suspend timer check rather than cancel -- eg requesting a connecting
		* state should not reset the suspend timer */
		this.checkSuspendTimer(state);

		if(state == 'connecting' && this.state.state == 'connected') return;
		if(state == 'closing' && this.state.state == 'closed') return;

		var newState = this.states[state],
			change = new ConnectionStateChange(this.state.state, newState.state, null, (request.error || ConnectionError[newState.state]));

		this.enactStateChange(change);

		if(state == 'connecting') {
			Utils.nextTick(function() { self.startConnect(); });
		}
		if(state == 'closing') {
			this.closeImpl();
		}
	};


	ConnectionManager.prototype.startConnect = function() {
		if(this.state !== this.states.connecting) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startConnect()', 'Must be in connecting state to connect, but was ' + this.state.state);
			return;
		}

		var auth = this.realtime.auth,
			self = this;

		/* The point of the connectCounter mechanism is to ensure that the
		 * connection procedure can be cancelled. We want disconnectAllTransports
		 * to be able to stop any in-progress connection, even before it gets to
		 * the stage of having a pending (or even a proposed) transport that it can
		 * dispose() of. So we check that it's still current after any async stage,
		 * up until the stage that is synchronous with instantiating a transport */
		var connectCount = ++this.connectCounter;

		var connect = function() {
			self.checkConnectionStateFreshness();
			self.getTransportParams(function(transportParams) {
				if(connectCount !== self.connectCounter) {
					return;
				}
				self.connectImpl(transportParams, connectCount);
			});
		};

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startConnect()', 'starting connection');
		this.startSuspendTimer();
		this.startTransitionTimer(this.states.connecting);

		if(auth.method === 'basic') {
			connect();
		} else {
			var authCb = function(err) {
				if(connectCount !== self.connectCounter) {
					return;
				}
				if(err) {
					self.actOnErrorFromAuthorize(err);
				} else {
					connect();
				}
			};
			if(this.errorReason && Auth.isTokenErr(this.errorReason)) {
				/* Force a refetch of a new token */
				auth._forceNewToken(null, null, authCb);
			} else {
				auth._ensureValidAuthCredentials(false, authCb);
			}
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
	ConnectionManager.prototype.connectImpl = function(transportParams, connectCount) {
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
		} else if(this.transports.length > 1 && this.getTransportPreference()) {
			this.connectPreference(transportParams);
		} else {
			this.connectBase(transportParams, connectCount);
		}
	};


	ConnectionManager.prototype.connectPreference = function(transportParams) {
		var preference = this.getTransportPreference(),
			self = this,
			preferenceTimeoutExpired = false;

		if(!Utils.arrIn(this.transports, preference)) {
			this.unpersistTransportPreference();
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
				self.unpersistTransportPreference();
			}
			self.connectImpl(transportParams);
		}, this.options.timeouts.preferenceConnectTimeout);

		/* For connectPreference, just use the main host. If host fallback is needed, do it in connectBase.
		 * The wstransport it will substitute the httphost for an appropriate wshost */
		transportParams.host = self.httpHosts[0];
		self.tryATransport(transportParams, preference, function(fatal, transport) {
			clearTimeout(preferenceTimeout);
			if(preferenceTimeoutExpired && transport) {
				/* Viable, but too late - connectImpl() will already be trying
				* connectBase, and we weren't in upgrade mode. Just remove the
				* onconnected listener and get rid of it */
				transport.off();
				transport.disconnect();
				Utils.arrDeleteValue(this.pendingTransports, transport);
			} else if(!transport && !fatal) {
				/* Preference failed in a transport-specific way. Try more */
				self.unpersistTransportPreference();
				self.connectImpl(transportParams);
			}
			/* If suceeded, or failed fatally, nothing to do */
		});
	};


	/**
	 * Try to establish a transport on the base transport (the best transport
	 * such that if it doesn't work, nothing will work) as determined through
	 * static feature detection, checking for network connectivity and trying
	 * fallback hosts if applicable.
	 * @param transportParams
	 */
	ConnectionManager.prototype.connectBase = function(transportParams, connectCount) {
		var self = this,
			giveUp = function(err) {
				self.notifyState({state: self.states.connecting.failState, error: err});
			},
			candidateHosts = this.httpHosts.slice(),
			hostAttemptCb = function(fatal, transport) {
				if(connectCount !== self.connectCounter) {
					return;
				}
				if(!transport && !fatal) {
					tryFallbackHosts();
				}
			};

		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectBase()', 'Trying to connect with base transport ' + this.baseTransport);

		/* first try to establish a connection with the priority host with http transport */
		var host = candidateHosts.shift();
		if(!host) {
			giveUp(new ErrorInfo('Unable to connect (no available host)', 80003, 404));
			return;
		}
		transportParams.host = host;

		/* this is what we'll be doing if the attempt for the main host fails */
		function tryFallbackHosts() {
			/* if there aren't any fallback hosts, fail */
			if(!candidateHosts.length) {
				giveUp(new ErrorInfo('Unable to connect (and no more fallback hosts to try)', 80003, 404));
				return;
			}
			/* before trying any fallback (or any remaining fallback) we decide if
			 * there is a problem with the ably host, or there is a general connectivity
			 * problem */
			Http.checkConnectivity(function(err, connectivity) {
				if(connectCount !== self.connectCounter) {
					return;
				}
				/* we know err won't happen but handle it here anyway */
				if(err) {
					giveUp(err);
					return;
				}
				if(!connectivity) {
					/* the internet isn't reachable, so don't try the fallback hosts */
					giveUp(new ErrorInfo('Unable to connect (network unreachable)', 80003, 404));
					return;
				}
				/* the network is there, so there's a problem with the main host, or
				 * its dns. Try the fallback hosts. We could try them simultaneously but
				 * that would potentially cause a huge spike in load on the load balancer */
				transportParams.host = Utils.arrPopRandomElement(candidateHosts);
				self.tryATransport(transportParams, self.baseTransport, hostAttemptCb);
			});
		}

		if(this.forceFallbackHost && candidateHosts.length) {
			this.forceFallbackHost = false;
			tryFallbackHosts();
			return;
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

		Utils.arrForEach(upgradePossibilities, function(upgradeTransport) {
			/* Note: the transport may mutate the params, so give each transport a fresh one */
			var upgradeTransportParams = self.createTransportParams(transportParams.host, 'upgrade');
			self.tryATransport(upgradeTransportParams, upgradeTransport, noop);
		});
	};


	ConnectionManager.prototype.closeImpl = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing connection');
		this.cancelSuspendTimer();
		this.startTransitionTimer(this.states.closing);

		Utils.safeArrForEach(this.pendingTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing pending transport: ' + transport);
			if(transport) transport.close();
		});

		Utils.safeArrForEach(this.proposedTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Disposing of proposed transport: ' + transport);
			if(transport) transport.dispose();
		});

		if(this.activeProtocol) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing active transport: ' + this.activeProtocol.getTransport());
			this.activeProtocol.getTransport().close();
		}

		/* If there was an active transport, this will probably be
		 * preempted by the notifyState call in deactivateTransport */
		this.notifyState({state: 'closed'});
	};

	ConnectionManager.prototype.onAuthUpdated = function(tokenDetails, callback) {
		var self = this;
		switch(this.state.state) {
			case 'connected':
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.onAuthUpdated()', 'Sending AUTH message on active transport');
				/* If there are any proposed/pending transports (eg an upgrade that
				 * isn't yet scheduled for activation) that hasn't yet started syncing,
				 * just to get rid of them & restart the upgrade with the new token, to
				 * avoid a race condition. (If it has started syncing, the AUTH will be
				 * queued until the upgrade is complete, so everything's fine) */
				if((this.pendingTransports.length || this.proposedTransports.length) &&
					self.state !== self.states.synchronizing) {
					this.disconnectAllTransports(/* exceptActive: */true);
					var transportParams = this.activeProtocol.getTransport().params;
					Utils.nextTick(function() {
						if(self.state.state === 'connected') {
							self.upgradeIfNeeded(transportParams);
						}
					});
				}

				/* Do any transport-specific new-token action */
				this.activeProtocol.getTransport().onAuthUpdated(tokenDetails);

				var authMsg = ProtocolMessage.fromValues({
					action: actions.AUTH,
					auth: {
						accessToken: tokenDetails.token
					}
				});
				this.send(authMsg);

				/* The answer will come back as either a connectiondetails event
				 * (realtime sends a CONNECTED to asknowledge the reauth) or a
				 * statechange to failed */
				var successListener = function() {
					self.off(failureListener);
					callback(null, tokenDetails);
				};
				var failureListener = function(stateChange) {
					if(stateChange.current === 'failed') {
						self.off(successListener);
						self.off(failureListener);
						callback(stateChange.reason || self.getStateError());
					}
				};
				this.once('connectiondetails', successListener);
				this.on('connectionstate', failureListener);
				break;

			case 'connecting':
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.onAuthUpdated()',
					'Aborting current connection attempts in order to start again with the new auth details');
				this.disconnectAllTransports();
				/* fallthrough to add statechange listener */

			default:
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.onAuthUpdated()',
					'Connection state is ' + this.state.state + '; waiting until either connected or failed');
				var listener = function(stateChange) {
					switch(stateChange.current) {
						case 'connected':
							self.off(listener);
							callback(null, tokenDetails);
							break;
						case 'failed':
						case 'closed':
						case 'suspended':
							self.off(listener);
							callback(stateChange.reason || self.getStateError());
							break;
						default:
							/* ignore till we get either connected or failed */
							break;
					}
				};
				self.on('connectionstate', listener);
				if(this.state.state === 'connecting') {
					/* can happen if in the connecting state but no transport was pending
					 * yet, so disconnectAllTransports did not trigger a disconnected state */
					self.startConnect();
				} else {
					self.requestState({state: 'connecting'});
				}
		}
	};

	ConnectionManager.prototype.disconnectAllTransports = function(exceptActive) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting all transports' + (exceptActive ? ' except the active transport' : ''));

		/* This will prevent any connection procedure in an async part of one of its early stages from continuing */
		this.connectCounter++;

		Utils.safeArrForEach(this.pendingTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting pending transport: ' + transport);
			if(transport) transport.disconnect();
		});
		this.pendingTransports = [];

		Utils.safeArrForEach(this.proposedTransports, function(transport) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disposing of proposed transport: ' + transport);
			if(transport) transport.dispose();
		});
		this.proposedTransports = [];

		if(this.activeProtocol && !exceptActive) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting active transport: ' + this.activeProtocol.getTransport());
			this.activeProtocol.getTransport().disconnect();
		}
		/* No need to notify state disconnected; disconnecting the active transport
		 * will have that effect */
	};

	/******************
	 * event queueing
	 ******************/

	ConnectionManager.prototype.send = function(msg, queueEvent, callback) {
		callback = callback || noop;
		var state = this.state;

		if(state.sendEvents) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
			this.sendImpl(new PendingMessage(msg, callback));
			return;
		}
		var shouldQueue = (queueEvent && state.queueEvents) || state.forceQueueEvents;
		if(!shouldQueue) {
			var err = 'rejecting event, queueEvent was ' + queueEvent + ', state was ' + state.state;
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', err);
			callback(this.errorReason || new ErrorInfo(err, 90000, 400));
			return;
		}
		if(Logger.shouldLog(Logger.LOG_MICRO)) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'queueing msg; ' + ProtocolMessage.stringify(msg));
		}
		this.queue(msg, callback);
	};

	ConnectionManager.prototype.sendImpl = function(pendingMessage) {
		var msg = pendingMessage.message;
		/* If have already attempted to send this, resend with the same msgSerial,
		 * so Ably can dedup if the previous send succeeded */
		if(pendingMessage.ackRequired && !pendingMessage.sendAttempted) {
			msg.msgSerial = this.msgSerial++;
			this.setRecoveryKey();
		}
		try {
			this.activeProtocol.send(pendingMessage);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.sendImpl()', 'Unexpected exception in transport.send(): ' + e.stack);
		}
	};

	function bundleWith(dest, src, maxSize) {
		var action;
		if(dest.channel !== src.channel) {
			/* RTL6d3 */
			return false;
		}
		if((action = dest.action) !== actions.PRESENCE && action !== actions.MESSAGE) {
			/* RTL6d - can only bundle messages or presence */
			return false;
		}
		if(action !== src.action) {
			/* RTL6d4 */
			return false;
		}
		var kind = (action === actions.PRESENCE) ? 'presence' : 'messages',
			proposed = dest[kind].concat(src[kind]),
			size = Message.getMessagesSize(proposed);
		if(size > maxSize) {
			/* RTL6d1 */
			return false;
		}
		if(!Utils.allSame(proposed, 'clientId')) {
			/* RTL6d2 */
			return false;
		}
		if(!Utils.arrEvery(proposed, function(msg) {
			return !msg.id;
		})) {
			/* RTL6d7 */
			return false;
		}
		/* we're good to go! */
		dest[kind] = proposed;
		return true;
	};

	ConnectionManager.prototype.queue = function(msg, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queue()', 'queueing event');
		var lastQueued = this.queuedMessages.last();
		var maxSize = this.options.maxMessageSize;
		/* If have already attempted to send a message, don't merge more messages
		 * into it, as if the previous send actually succeeded and realtime ignores
		 * the dup, they'll be lost */
		if(lastQueued && !lastQueued.sendAttempted && bundleWith(lastQueued.message, msg, maxSize)) {
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

	ConnectionManager.prototype.failQueuedMessages = function(err) {
		var numQueued = this.queuedMessages.count();
		if(numQueued > 0) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.failQueuedMessages()', 'failing ' + numQueued + ' queued messages, err = ' + Utils.inspectError(err));
			this.queuedMessages.completeAllMessages(err);
		}
	};

	ConnectionManager.prototype.onChannelMessage = function(message, transport) {
		var onActiveTransport = this.activeProtocol && transport === this.activeProtocol.getTransport(),
			onUpgradeTransport = Utils.arrIn(this.pendingTransports, transport) && this.state == this.states.synchronizing,
			notControlMsg = message.action === actions.MESSAGE || message.action === actions.PRESENCE;

		/* As the lib now has a period where the upgrade transport is synced but
		 * before it's become active (while waiting for the old one to become
		 * idle), message can validly arrive on it even though it isn't active */
		if(onActiveTransport || onUpgradeTransport) {
			if(notControlMsg) {
				var suppressed = this.setConnectionSerial(message);
				if(suppressed) {
					return;
				}
				if(ProtocolMessage.isDuplicate(message, this.mostRecentMsg)) {
					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.onChannelMessage()', 'received message with different connectionSerial, but same message id as a previous; discarding; id = ' + message.id);
					return;
				}
				this.mostRecentMsg = message;
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
				callback(new ErrorInfo('Timeout waiting for heartbeat response', 50000, 500));
			};

			var pingStart = Utils.now(),
				id = Utils.cheapRandStr();

			var onHeartbeat = function (responseId) {
				if(responseId === id) {
					transport.off('heartbeat', onHeartbeat);
					clearTimeout(timer);
					var responseTime = Utils.now() - pingStart;
					callback(null, responseTime);
				}
			};

			var timer = setTimeout(onTimeout, this.options.timeouts.realtimeRequestTimeout);

			transport.on('heartbeat', onHeartbeat);
			transport.ping(id);
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
		this.activeProtocol.getTransport().fail(error);
	};

	ConnectionManager.prototype.registerProposedTransport = function(transport) {
		this.proposedTransports.push(transport);
	};

	ConnectionManager.prototype.getTransportPreference = function() {
		return this.transportPreference || (haveWebStorage && WebStorage.get(transportPreferenceName));
	};

	ConnectionManager.prototype.persistTransportPreference = function(transport) {
		if(Utils.arrIn(Defaults.upgradeTransports, transport.shortName)) {
			this.transportPreference = transport.shortName;
			if(haveWebStorage) {
				WebStorage.set(transportPreferenceName, transport.shortName);
			}
		}
	};

	ConnectionManager.prototype.unpersistTransportPreference = function() {
		this.transportPreference = null;
		if(haveWebStorage) {
			WebStorage.remove(transportPreferenceName);
		}
	};

	/* This method is only used during connection attempts, so implements RSA4c1,
	 * RSA4c2, and RSA4d. In particular it is not invoked for
	 * serverside-triggered reauths or manual reauths, so RSA4c3 does not apply */
	ConnectionManager.prototype.actOnErrorFromAuthorize = function(err) {
		if(err.code === 40171) {
			/* No way to reauth */
			this.notifyState({state: 'failed', error: err});
		} else if(err.statusCode === 403) {
			var msg = 'Client configured authentication provider returned 403; failing the connection';
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.actOnErrorFromAuthorize()', msg);
			this.notifyState({state: 'failed', error: new ErrorInfo(msg, 80019, 403, err)});
		} else {
			var msg = 'Client configured authentication provider request failed';
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.actOnErrorFromAuthorize', msg);
			this.notifyState({state: this.state.failState, error: new ErrorInfo(msg, 80019, 401, err)});
		}
	};

	ConnectionManager.prototype.onConnectionDetailsUpdate = function(connectionDetails, transport) {
		if(!connectionDetails) {
			return;
		}
		this.connectionDetails = connectionDetails;
		if(connectionDetails.maxMessageSize) {
			this.options.maxMessageSize = connectionDetails.maxMessageSize;
		}
		var clientId = connectionDetails.clientId;
		if(clientId) {
			var err = this.realtime.auth._uncheckedSetClientId(clientId);
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.onConnectionDetailsUpdate()', err.message);
				/* Errors setting the clientId are fatal to the connection */
				transport.fail(err);
				return;
			}
		}
		var connectionStateTtl = connectionDetails.connectionStateTtl;
		if(connectionStateTtl) {
			this.connectionStateTtl = connectionStateTtl;
		}
		this.maxIdleInterval = connectionDetails.maxIdleInterval;
		this.emit('connectiondetails', connectionDetails);
	};

	return ConnectionManager;
})();
