import ProtocolMessage from 'common/lib/types/protocolmessage';
import * as Utils from 'common/lib/util/utils';
import Protocol, { PendingMessage } from './protocol';
import Defaults, { getAgentString } from 'common/lib/util/defaults';
import Platform from 'common/platform';
import EventEmitter from '../util/eventemitter';
import MessageQueue from './messagequeue';
import Logger from '../util/logger';
import ConnectionStateChange from 'common/lib/client/connectionstatechange';
import ConnectionErrors, { isRetriable } from './connectionerrors';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from 'common/lib/types/errorinfo';
import Auth from 'common/lib/client/auth';
import Message from 'common/lib/types/message';
import Multicaster, { MulticasterInstance } from 'common/lib/util/multicaster';
import WebSocketTransport from './websockettransport';
import Transport, { TransportCtor } from './transport';
import * as API from '../../../../ably';
import { ErrCallback } from 'common/types/utils';
import HttpStatusCodes from 'common/constants/HttpStatusCodes';

type Realtime = any;
type ClientOptions = any;

const haveWebStorage = () => typeof Platform.WebStorage !== 'undefined' && Platform.WebStorage?.localSupported;
const haveSessionStorage = () => typeof Platform.WebStorage !== 'undefined' && Platform.WebStorage?.sessionSupported;
const actions = ProtocolMessage.Action;
const noop = function () {};
const transportPreferenceName = 'ably-transport-preference';

const sessionRecoveryName = 'ably-connection-recovery';
function getSessionRecoverData() {
  return haveSessionStorage() && Platform.WebStorage?.getSession?.(sessionRecoveryName);
}
function setSessionRecoverData(value: any) {
  return haveSessionStorage() && Platform.WebStorage?.setSession?.(sessionRecoveryName, value);
}
function clearSessionRecoverData() {
  return haveSessionStorage() && Platform.WebStorage?.removeSession?.(sessionRecoveryName);
}

function betterTransportThan(a: Transport, b: Transport) {
  return (
    Utils.arrIndexOf(Platform.Defaults.transportPreferenceOrder, a.shortName) >
    Utils.arrIndexOf(Platform.Defaults.transportPreferenceOrder, b.shortName)
  );
}

function bundleWith(dest: ProtocolMessage, src: ProtocolMessage, maxSize: number) {
  let action;
  if (dest.channel !== src.channel) {
    /* RTL6d3 */
    return false;
  }
  if ((action = dest.action) !== actions.PRESENCE && action !== actions.MESSAGE) {
    /* RTL6d - can only bundle messages or presence */
    return false;
  }
  if (action !== src.action) {
    /* RTL6d4 */
    return false;
  }
  const kind = action === actions.PRESENCE ? 'presence' : 'messages',
    proposed = (dest as Record<string, any>)[kind].concat((src as Record<string, any>)[kind]),
    size = Message.getMessagesSize(proposed);
  if (size > maxSize) {
    /* RTL6d1 */
    return false;
  }
  if (!Utils.allSame(proposed, 'clientId')) {
    /* RTL6d2 */
    return false;
  }
  if (
    !Utils.arrEvery(proposed, function (msg: Message) {
      return !msg.id;
    })
  ) {
    /* RTL6d7 */
    return false;
  }
  /* we're good to go! */
  (dest as Record<string, any>)[kind] = proposed;
  return true;
}

type RecoveryContext = {
  connectionKey: string;
  msgSerial: number;
  channelSerials: { [name: string]: string };
};

function decodeRecoveryKey(recoveryKey: string): RecoveryContext | null {
  try {
    return JSON.parse(recoveryKey);
  } catch (e) {
    return null;
  }
}

export class TransportParams {
  options: ClientOptions;
  host: string | null;
  mode: string;
  format?: Utils.Format;
  connectionKey?: string;
  stream?: any;
  heartbeats?: boolean;

  constructor(options: ClientOptions, host: string | null, mode: string, connectionKey?: string) {
    this.options = options;
    this.host = host;
    this.mode = mode;
    this.connectionKey = connectionKey;
    this.format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
  }

  getConnectParams(authParams: Record<string, unknown>): Record<string, string> {
    const params = authParams ? Utils.copy(authParams) : {};
    const options = this.options;
    switch (this.mode) {
      case 'upgrade':
        params.upgrade = this.connectionKey as string;
        break;
      case 'resume':
        params.resume = this.connectionKey as string;
        break;
      case 'recover': {
        const recoveryContext = decodeRecoveryKey(options.recover);
        if (recoveryContext) {
          params.recover = recoveryContext.connectionKey;
        }
        break;
      }
      default:
    }
    if (options.clientId !== undefined) {
      params.clientId = options.clientId;
    }
    if (options.echoMessages === false) {
      params.echo = 'false';
    }
    if (this.format !== undefined) {
      params.format = this.format;
    }
    if (this.stream !== undefined) {
      params.stream = this.stream;
    }
    if (this.heartbeats !== undefined) {
      params.heartbeats = this.heartbeats;
    }
    params.v = Defaults.protocolVersion;
    params.agent = getAgentString(this.options);
    if (options.transportParams !== undefined) {
      Utils.mixin(params, options.transportParams);
    }
    return params as Record<string, string>;
  }

  toString(): string {
    let result = '[mode=' + this.mode;
    if (this.host) {
      result += ',host=' + this.host;
    }
    if (this.connectionKey) {
      result += ',connectionKey=' + this.connectionKey;
    }
    if (this.format) {
      result += ',format=' + this.format;
    }
    result += ']';

    return result;
  }
}

type ConnectionState = {
  state: string;
  terminal?: boolean;
  queueEvents?: boolean;
  sendEvents?: boolean;
  failState?: string;
  retryDelay?: number;
  forceQueueEvents?: boolean;
  retryImmediately?: boolean;
  error?: IPartialErrorInfo;
};

class ConnectionManager extends EventEmitter {
  realtime: Realtime;
  options: ClientOptions;
  states: Record<string, ConnectionState>;
  state: ConnectionState;
  errorReason: IPartialErrorInfo | string | null;
  queuedMessages: MessageQueue;
  msgSerial: number;
  connectionDetails?: Record<string, any>;
  connectionId?: string;
  connectionKey?: string;
  connectionStateTtl: number;
  maxIdleInterval: number | null;
  transports: string[];
  baseTransport: string;
  upgradeTransports: string[];
  transportPreference: string | null;
  httpHosts: string[];
  activeProtocol: null | Protocol;
  proposedTransports: Transport[];
  pendingTransports: Transport[];
  host: string | null;
  lastAutoReconnectAttempt: number | null;
  lastActivity: number | null;
  forceFallbackHost: boolean;
  connectCounter: number;
  transitionTimer?: number | NodeJS.Timeout | null;
  suspendTimer?: number | NodeJS.Timeout | null;
  retryTimer?: number | NodeJS.Timeout | null;
  disconnectedRetryCount: number = 0;

  constructor(realtime: Realtime, options: ClientOptions) {
    super();
    ConnectionManager.initTransports();
    this.realtime = realtime;
    this.options = options;
    const timeouts = options.timeouts;
    /* connectingTimeout: leave preferenceConnectTimeout (~6s) to try the
     * preference transport, then realtimeRequestTimeout (~10s) to establish
     * the base transport in case that fails */
    const connectingTimeout = timeouts.preferenceConnectTimeout + timeouts.realtimeRequestTimeout;
    this.states = {
      initialized: {
        state: 'initialized',
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        failState: 'disconnected',
      },
      connecting: {
        state: 'connecting',
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        retryDelay: connectingTimeout,
        failState: 'disconnected',
      },
      connected: {
        state: 'connected',
        terminal: false,
        queueEvents: false,
        sendEvents: true,
        failState: 'disconnected',
      },
      synchronizing: {
        state: 'connected',
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        forceQueueEvents: true,
        failState: 'disconnected',
      },
      disconnected: {
        state: 'disconnected',
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        retryDelay: timeouts.disconnectedRetryTimeout,
        failState: 'disconnected',
      },
      suspended: {
        state: 'suspended',
        terminal: false,
        queueEvents: false,
        sendEvents: false,
        retryDelay: timeouts.suspendedRetryTimeout,
        failState: 'suspended',
      },
      closing: {
        state: 'closing',
        terminal: false,
        queueEvents: false,
        sendEvents: false,
        retryDelay: timeouts.realtimeRequestTimeout,
        failState: 'closed',
      },
      closed: { state: 'closed', terminal: true, queueEvents: false, sendEvents: false, failState: 'closed' },
      failed: { state: 'failed', terminal: true, queueEvents: false, sendEvents: false, failState: 'failed' },
    };
    this.state = this.states.initialized;
    this.errorReason = null;

    this.queuedMessages = new MessageQueue();
    this.msgSerial = 0;
    this.connectionDetails = undefined;
    this.connectionId = undefined;
    this.connectionKey = undefined;
    this.connectionStateTtl = timeouts.connectionStateTtl;
    this.maxIdleInterval = null;

    this.transports = Utils.intersect(
      options.transports || Defaults.defaultTransports,
      ConnectionManager.supportedTransports
    );
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
    this.forceFallbackHost = false;
    this.connectCounter = 0;

    Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
    Logger.logAction(
      Logger.LOG_MICRO,
      'Realtime.ConnectionManager()',
      'requested transports = [' + (options.transports || Defaults.defaultTransports) + ']'
    );
    Logger.logAction(
      Logger.LOG_MICRO,
      'Realtime.ConnectionManager()',
      'available transports = [' + this.transports + ']'
    );
    Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');

    if (!this.transports.length) {
      const msg = 'no requested transports available';
      Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
      throw new Error(msg);
    }

    const addEventListener = Platform.Config.addEventListener;
    if (addEventListener) {
      /* intercept close event in browser to persist connection id if requested */
      if (haveSessionStorage() && typeof options.recover === 'function') {
        /* Usually can't use bind as not supported in IE8, but IE doesn't support sessionStorage, so... */
        addEventListener('beforeunload', this.persistConnection.bind(this));
      }

      if (options.closeOnUnload === true) {
        addEventListener('beforeunload', () => {
          Logger.logAction(
            Logger.LOG_MAJOR,
            'Realtime.ConnectionManager()',
            'beforeunload event has triggered the connection to close as closeOnUnload is true'
          );
          this.requestState({ state: 'closing' });
        });
      }

      /* Listen for online and offline events */
      addEventListener('online', () => {
        if (this.state == this.states.disconnected || this.state == this.states.suspended) {
          Logger.logAction(
            Logger.LOG_MINOR,
            'ConnectionManager caught browser ‘online’ event',
            'reattempting connection'
          );
          this.requestState({ state: 'connecting' });
        } else if (this.state == this.states.connecting) {
          // RTN20c: if 'online' event recieved while CONNECTING, abandon connection attempt and retry
          this.pendingTransports.forEach(function (transport) {
            // Detach transport listeners to avoid connection state side effects from calling dispose
            transport.off();
          });
          this.disconnectAllTransports();

          this.startConnect();
        }
      });

      addEventListener('offline', () => {
        if (this.state == this.states.connected) {
          Logger.logAction(
            Logger.LOG_MINOR,
            'ConnectionManager caught browser ‘offline’ event',
            'disconnecting active transport'
          );
          // Not sufficient to just go to the 'disconnected' state, want to
          // force all transports to reattempt the connection. Will immediately
          // retry.
          this.disconnectAllTransports();
        }
      });
    }
  }

  /*********************
   * transport management
   *********************/

  static supportedTransports: Record<string, TransportCtor> = {};

  static initTransports() {
    WebSocketTransport(ConnectionManager);
    Utils.arrForEach(Platform.Transports, function (initFn) {
      initFn(ConnectionManager);
    });
  }

  createTransportParams(host: string | null, mode: string): TransportParams {
    return new TransportParams(this.options, host, mode, this.connectionKey);
  }

  getTransportParams(callback: Function): void {
    const decideMode = (modeCb: Function) => {
      if (this.connectionKey) {
        modeCb('resume');
        return;
      }

      if (typeof this.options.recover === 'string') {
        modeCb('recover');
        return;
      }

      const recoverFn = this.options.recover,
        lastSessionData = getSessionRecoverData();
      if (lastSessionData && typeof recoverFn === 'function') {
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager.getTransportParams()',
          'Calling clientOptions-provided recover function with last session data'
        );
        recoverFn(lastSessionData, (shouldRecover?: boolean) => {
          if (shouldRecover) {
            this.options.recover = lastSessionData.recoveryKey;
            modeCb('recover');
          } else {
            modeCb('clean');
          }
        });
        return;
      }
      modeCb('clean');
    };

    decideMode((mode: string) => {
      const transportParams = this.createTransportParams(null, mode);
      if (mode === 'recover') {
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager.getTransportParams()',
          'Transport recovery mode = recover; recoveryKey = ' + this.options.recover
        );
        const recoveryContext = decodeRecoveryKey(this.options.recover);
        if (recoveryContext) {
          this.msgSerial = recoveryContext.msgSerial;
        }
      } else {
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager.getTransportParams()',
          'Transport params = ' + transportParams.toString()
        );
      }
      callback(transportParams);
    });
  }

  /**
   * Attempt to connect using a given transport
   * @param transportParams
   * @param candidate, the transport to try
   * @param callback
   */
  tryATransport(transportParams: TransportParams, candidate: string, callback: Function): void {
    Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.tryATransport()', 'trying ' + candidate);

    Transport.tryConnect(
      ConnectionManager.supportedTransports[candidate],
      this,
      this.realtime.auth,
      transportParams,
      (wrappedErr: { error: ErrorInfo; event: string } | null, transport?: Transport) => {
        const state = this.state;
        if (state == this.states.closing || state == this.states.closed || state == this.states.failed) {
          if (transport) {
            Logger.logAction(
              Logger.LOG_MINOR,
              'ConnectionManager.tryATransport()',
              'connection ' + state.state + ' while we were attempting the transport; closing ' + transport
            );
            transport.close();
          }
          callback(true);
          return;
        }

        if (wrappedErr) {
          Logger.logAction(
            Logger.LOG_MINOR,
            'ConnectionManager.tryATransport()',
            'transport ' + candidate + ' ' + wrappedErr.event + ', err: ' + wrappedErr.error.toString()
          );

          /* Comet transport onconnect token errors can be dealt with here.
           * Websocket ones only happen after the transport claims to be viable,
           * so are dealt with as non-onconnect token errors */
          if (
            Auth.isTokenErr(wrappedErr.error) &&
            !(this.errorReason && Auth.isTokenErr(this.errorReason as ErrorInfo))
          ) {
            this.errorReason = wrappedErr.error;
            /* re-get a token and try again */
            this.realtime.auth._forceNewToken(null, null, (err: ErrorInfo) => {
              if (err) {
                this.actOnErrorFromAuthorize(err);
                return;
              }
              this.tryATransport(transportParams, candidate, callback);
            });
          } else if (wrappedErr.event === 'failed') {
            /* Error that's fatal to the connection */
            this.notifyState({ state: 'failed', error: wrappedErr.error });
            callback(true);
          } else if (wrappedErr.event === 'disconnected') {
            if (!isRetriable(wrappedErr.error)) {
              /* Error received from the server that does not call for trying a fallback host, eg a rate limit */
              this.notifyState({ state: this.states.connecting.failState as string, error: wrappedErr.error });
              callback(true);
            } else {
              /* Error with that transport only; continue trying other fallback hosts */
              callback(false);
            }
          }
          return;
        }

        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.tryATransport()',
          'viable transport ' + candidate + '; setting pending'
        );
        this.setTransportPending(transport as Transport, transportParams);
        callback(null, transport);
      }
    );
  }

  /**
   * Called when a transport is indicated to be viable, and the ConnectionManager
   * expects to activate this transport as soon as it is connected.
   * @param transport
   * @param transportParams
   */
  setTransportPending(transport: Transport, transportParams: TransportParams): void {
    const mode = transportParams.mode;
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.setTransportPending()',
      'transport = ' + transport + '; mode = ' + mode
    );

    Utils.arrDeleteValue(this.proposedTransports, transport);
    this.pendingTransports.push(transport);
    const optimalTransport =
      Platform.Defaults.transportPreferenceOrder[Platform.Defaults.transportPreferenceOrder.length - 1];
    transport.once('connected', (error: ErrorInfo, connectionId: string, connectionDetails: Record<string, any>) => {
      if (mode == 'upgrade' && this.activeProtocol) {
        /*  if ws and xhrs are connecting in parallel, delay xhrs activation to let ws go ahead */
        if (
          transport.shortName !== optimalTransport &&
          Utils.arrIn(this.getUpgradePossibilities(), optimalTransport) &&
          this.activeProtocol
        ) {
          setTimeout(() => {
            this.scheduleTransportActivation(error, transport, connectionId, connectionDetails);
          }, this.options.timeouts.parallelUpgradeDelay);
        } else {
          this.scheduleTransportActivation(error, transport, connectionId, connectionDetails);
        }
      } else {
        this.activateTransport(error, transport, connectionId, connectionDetails);

        /* allow connectImpl to start the upgrade process if needed, but allow
         * other event handlers, including activating the transport, to run first */
        Platform.Config.nextTick(() => {
          this.connectImpl(transportParams);
        });
      }

      if (mode === 'recover' && this.options.recover) {
        /* After a successful recovery, we unpersist, as a recovery key cannot
         * be used more than once */
        this.options.recover = null;
        this.unpersistConnection();
      }
    });

    const self = this;
    transport.on(['disconnected', 'closed', 'failed'], function (this: { event: string }, error: ErrorInfo) {
      self.deactivateTransport(transport, this.event, error);
    });

    this.emit('transport.pending', transport);
  }

  /**
   * Called when an upgrade transport is connected,
   * to schedule the activation of that transport.
   * @param error
   * @param transport
   * @param connectionId
   * @param connectionDetails
   */
  scheduleTransportActivation(
    error: ErrorInfo,
    transport: Transport,
    connectionId: string,
    connectionDetails: Record<string, any>
  ): void {
    const currentTransport = this.activeProtocol && this.activeProtocol.getTransport(),
      abandon = () => {
        transport.disconnect();
        Utils.arrDeleteValue(this.pendingTransports, transport);
      };

    if (this.state !== this.states.connected && this.state !== this.states.connecting) {
      /* This is most likely to happen for the delayed XHRs, when XHRs and ws are scheduled in parallel*/
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.scheduleTransportActivation()',
        'Current connection state (' +
          this.state.state +
          (this.state === this.states.synchronizing ? ', but with an upgrade already in progress' : '') +
          ') is not valid to upgrade in; abandoning upgrade to ' +
          transport.shortName
      );
      abandon();
      return;
    }

    if (currentTransport && !betterTransportThan(transport, currentTransport)) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.scheduleTransportActivation()',
        'Proposed transport ' +
          transport.shortName +
          ' is no better than current active transport ' +
          currentTransport.shortName +
          ' - abandoning upgrade'
      );
      abandon();
      return;
    }

    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.scheduleTransportActivation()',
      'Scheduling transport upgrade; transport = ' + transport
    );

    let oldProtocol: Protocol | null = null;

    if (!transport.isConnected) {
      /* This is only possible if the xhr streaming transport was disconnected during the parallelUpgradeDelay */
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.scheduleTransportActivation()',
        'Proposed transport ' + transport.shortName + 'is no longer connected; abandoning upgrade'
      );
      abandon();
      return;
    }

    if (this.state === this.states.connected) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.scheduleTransportActivation()',
        'Currently connected, so temporarily pausing events until the upgrade is complete'
      );
      this.state = this.states.synchronizing;
      oldProtocol = this.activeProtocol;
    } else if (this.state !== this.states.connecting) {
      /* Note: upgrading from the connecting state is valid if the old active
       * transport was deactivated after the upgrade transport first connected;
       * see logic in deactivateTransport */
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.scheduleTransportActivation()',
        'Current connection state (' +
          this.state.state +
          (this.state === this.states.synchronizing ? ', but with an upgrade already in progress' : '') +
          ') is not valid to upgrade in; abandoning upgrade to ' +
          transport.shortName
      );
      abandon();
      return;
    }

    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.scheduleTransportActivation()',
      'Syncing transport; transport = ' + transport
    );

    const finishUpgrade = () => {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.scheduleTransportActivation()',
        'Activating transport; transport = ' + transport
      );

      // Send ACTIVATE to tell the server to make this transport the
      // active transport, which suspends channels until we re-attach.
      transport.send(
        ProtocolMessage.fromValues({
          action: actions.ACTIVATE,
        })
      );

      this.activateTransport(error, transport, connectionId, connectionDetails);
      /* Restore pre-sync state. If state has changed in the meantime,
       * don't touch it -- since the websocket transport waits a tick before
       * disposing itself, it's possible for it to have happily synced
       * without err while, unknown to it, the connection has closed in the
       * meantime and the ws transport is scheduled for death */
      if (this.state === this.states.synchronizing) {
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.scheduleTransportActivation()',
          'Pre-upgrade protocol idle, sending queued messages on upgraded transport; transport = ' + transport
        );
        this.state = this.states.connected;
      } else {
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager.scheduleTransportActivation()',
          'Pre-upgrade protocol idle, but state is now ' + this.state.state + ', so leaving unchanged'
        );
      }
      if (this.state.sendEvents) {
        this.sendQueuedMessages();
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
    if (oldProtocol) {
      /* Most of the time this will be already true: the new-transport sync will have given
       * enough time for in-flight messages on the old transport to complete. */
      oldProtocol.onceIdle(finishUpgrade);
    } else {
      finishUpgrade();
    }
  }

  /**
   * Called when a transport is connected, and the connectionmanager decides that
   * it will now be the active transport. Returns whether or not it activated
   * the transport (if the connection is closing/closed it will choose not to).
   * @param transport the transport instance
   * @param connectionId the id of the new active connection
   * @param connectionDetails the details of the new active connection
   */
  activateTransport(
    error: ErrorInfo,
    transport: Transport,
    connectionId: string,
    connectionDetails: Record<string, any>
  ): boolean {
    Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport);
    if (error) {
      Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', 'error = ' + error);
    }
    if (connectionId) {
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionId =  ' + connectionId);
    }
    if (connectionDetails) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.activateTransport()',
        'connectionDetails =  ' + JSON.stringify(connectionDetails)
      );
    }

    this.persistTransportPreference(transport);

    /* if the connectionmanager moved to the closing/closed state before this
     * connection event, then we won't activate this transport */
    const existingState = this.state,
      connectedState = this.states.connected.state;
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.activateTransport()',
      'current state = ' + existingState.state
    );
    if (
      existingState.state == this.states.closing.state ||
      existingState.state == this.states.closed.state ||
      existingState.state == this.states.failed.state
    ) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.activateTransport()',
        'Disconnecting transport and abandoning'
      );
      transport.disconnect();
      return false;
    }

    /* remove this transport from pending transports */
    Utils.arrDeleteValue(this.pendingTransports, transport);

    /* if the transport is not connected then don't activate it */
    if (!transport.isConnected) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.activateTransport()',
        'Declining to activate transport ' + transport + ' since it appears to no longer be connected'
      );
      return false;
    }

    /* the given transport is connected; this will immediately
     * take over as the active transport */
    const existingActiveProtocol = this.activeProtocol;
    this.activeProtocol = new Protocol(transport);
    this.host = transport.params.host;

    const connectionKey = connectionDetails.connectionKey;
    if (connectionKey && this.connectionKey != connectionKey) {
      this.setConnection(connectionId, connectionDetails, !!error);
    }

    /* Rebroadcast any new connectionDetails from the active transport, which
     * can come at any time (eg following a reauth), and emit an RTN24 UPDATE
     * event. (Listener added on nextTick because we're in a transport.on('connected')
     * callback at the moment; if we add it now we'll be adding it to the end
     * of the listeners array and it'll be called immediately) */
    this.onConnectionDetailsUpdate(connectionDetails, transport);
    Platform.Config.nextTick(() => {
      transport.on(
        'connected',
        (connectedErr: ErrorInfo, _connectionId: string, connectionDetails: Record<string, any>) => {
          this.onConnectionDetailsUpdate(connectionDetails, transport);
          this.emit('update', new ConnectionStateChange(connectedState, connectedState, null, connectedErr));
        }
      );
    });

    /* If previously not connected, notify the state change (including any
     * error). */
    if (existingState.state === this.states.connected.state) {
      if (error) {
        /* if upgrading without error, leave any existing errorReason alone */
        this.errorReason = this.realtime.connection.errorReason = error;
        /* Only bother emitting an upgrade if there's an error; otherwise it's
         * just a transport upgrade, so auth details won't have changed */
        this.emit('update', new ConnectionStateChange(connectedState, connectedState, null, error));
      }
    } else {
      this.notifyState({ state: 'connected', error: error });
      this.errorReason = this.realtime.connection.errorReason = error || null;
    }

    /* Send after the connection state update, as Channels hooks into this to
     * resend attaches on a new transport if necessary */
    this.emit('transport.active', transport);

    /* Gracefully terminate existing protocol */
    if (existingActiveProtocol) {
      if (existingActiveProtocol.messageQueue.count() > 0) {
        /* We could just requeue pending messages on the new transport, but
         * actually this should never happen: transports should only take over
         * from other active transports when upgrading, and upgrading waits for
         * the old transport to be idle. So log an error. */
        Logger.logAction(
          Logger.LOG_ERROR,
          'ConnectionManager.activateTransport()',
          'Previous active protocol (for transport ' +
            existingActiveProtocol.transport.shortName +
            ', new one is ' +
            transport.shortName +
            ') finishing with ' +
            existingActiveProtocol.messageQueue.count() +
            ' messages still pending'
        );
      }
      if (existingActiveProtocol.transport === transport) {
        const msg =
          'Assumption violated: activating a transport that was also the transport for the previous active protocol; transport = ' +
          transport.shortName +
          '; stack = ' +
          new Error().stack;
        Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
      } else {
        existingActiveProtocol.finish();
      }
    }

    /* Terminate any other pending transport(s), and
     * abort any not-yet-pending transport attempts */
    Utils.safeArrForEach(this.pendingTransports, (pendingTransport) => {
      if (pendingTransport === transport) {
        const msg =
          'Assumption violated: activating a transport that is still marked as a pending transport; transport = ' +
          transport.shortName +
          '; stack = ' +
          new Error().stack;
        Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
        Utils.arrDeleteValue(this.pendingTransports, transport);
      } else {
        pendingTransport.disconnect();
      }
    });
    Utils.safeArrForEach(this.proposedTransports, (proposedTransport: Transport) => {
      if (proposedTransport === transport) {
        Logger.logAction(
          Logger.LOG_ERROR,
          'ConnectionManager.activateTransport()',
          'Assumption violated: activating a transport that is still marked as a proposed transport; transport = ' +
            transport.shortName +
            '; stack = ' +
            new Error().stack
        );
        Utils.arrDeleteValue(this.proposedTransports, transport);
      } else {
        proposedTransport.dispose();
      }
    });

    return true;
  }

  /**
   * Called when a transport is no longer the active transport. This can occur
   * in any transport connection state.
   * @param transport
   */
  deactivateTransport(transport: Transport, state: string, error: ErrorInfo): void {
    const currentProtocol = this.activeProtocol,
      wasActive = currentProtocol && currentProtocol.getTransport() === transport,
      wasPending = Utils.arrDeleteValue(this.pendingTransports, transport),
      wasProposed = Utils.arrDeleteValue(this.proposedTransports, transport),
      noTransportsScheduledForActivation = this.noTransportsScheduledForActivation();

    Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.deactivateTransport()',
      'state = ' +
        state +
        (wasActive ? '; was active' : wasPending ? '; was pending' : wasProposed ? '; was proposed' : '') +
        (noTransportsScheduledForActivation ? '' : '; another transport is scheduled for activation')
    );
    if (error && error.message)
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'reason =  ' + error.message);

    if (wasActive) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.deactivateTransport()',
        'Getting, clearing, and requeuing ' +
          (this.activeProtocol as Protocol).messageQueue.count() +
          ' pending messages'
      );
      this.queuePendingMessages((currentProtocol as Protocol).getPendingMessages());
      /* Clear any messages we requeue to allow the protocol to become idle.
       * In case of an upgrade, this will trigger an immediate activation of
       * the upgrade transport, so delay a tick so this transport can finish
       * deactivating */
      Platform.Config.nextTick(function () {
        (currentProtocol as Protocol).clearPendingMessages();
      });
      this.activeProtocol = this.host = null;
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
    if (
      (wasActive && noTransportsScheduledForActivation) ||
      (wasActive && state === 'failed') ||
      state === 'closed' ||
      (currentProtocol === null && wasPending && this.pendingTransports.length === 0)
    ) {
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
      if (state === 'disconnected' && error && (error.statusCode as number) > 500 && this.httpHosts.length > 1) {
        this.unpersistTransportPreference();
        this.forceFallbackHost = true;
        /* and try to connect again to try a fallback host without waiting for the usual 15s disconnectedRetryTimeout */
        this.notifyState({ state: state, error: error, retryImmediately: true });
        return;
      }

      /* TODO remove below line once realtime sends token errors as DISCONNECTEDs */
      const newConnectionState = state === 'failed' && Auth.isTokenErr(error) ? 'disconnected' : state;
      this.notifyState({ state: newConnectionState, error: error });
      return;
    }

    if (wasActive && state === 'disconnected' && this.state !== this.states.synchronizing) {
      /* If we were active but there is another transport scheduled for
       * activation, go into to the connecting state until that transport
       * activates and sets us back to connected. (manually starting the
       * transition timers in case that never happens). (If we were in the
       * synchronizing state, then that's fine, the old transport just got its
       * disconnected before the new one got the sync -- ignore it and keep
       * waiting for the sync. If it fails we have a separate sync timer that
       * will expire). */
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.deactivateTransport()',
        'wasActive but another transport is connected and scheduled for activation, so going into the connecting state until it activates'
      );
      this.startSuspendTimer();
      this.startTransitionTimer(this.states.connecting);
      this.notifyState({ state: 'connecting', error: error });
    }
  }

  /* Helper that returns true if there are no transports which are pending,
   * have been connected, and are just waiting for onceNoPending to fire before
   * being activated */
  noTransportsScheduledForActivation(): boolean {
    return (
      Utils.isEmpty(this.pendingTransports) ||
      this.pendingTransports.every(function (transport) {
        return !transport.isConnected;
      })
    );
  }

  setConnection(connectionId: string, connectionDetails: Record<string, any>, hasConnectionError?: boolean): void {
    /* if connectionKey changes but connectionId stays the same, then just a
     * transport change on the same connection. If connectionId changes, we're
     * on a new connection, with implications for msgSerial and channel state */
    /* If no previous connectionId, don't reset the msgSerial as it may have
     * been set by recover data (unless the recover failed) */
    const prevConnId = this.connectionId,
      connIdChanged = prevConnId && prevConnId !== connectionId,
      recoverFailure = !prevConnId && hasConnectionError;
    if (connIdChanged || recoverFailure) {
      Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setConnection()', 'Resetting msgSerial');
      this.msgSerial = 0;
      // RTN19a2: In the event of a new connectionId, previous msgSerials are
      // meaningless.
      this.queuedMessages.resetSendAttempted();
    }
    if (this.connectionId !== connectionId) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.setConnection()',
        'New connectionId; reattaching any attached channels'
      );
    }
    this.realtime.connection.id = this.connectionId = connectionId;
    this.realtime.connection.key = this.connectionKey = connectionDetails.connectionKey;
  }

  clearConnection(): void {
    this.realtime.connection.id = this.connectionId = undefined;
    this.realtime.connection.key = this.connectionKey = undefined;
    this.msgSerial = 0;
    this.unpersistConnection();
  }

  createRecoveryKey(): string | null {
    // RTN16g2.
    if (!this.connectionKey) {
      return null;
    }

    return JSON.stringify({
      connectionKey: this.connectionKey,
      msgSerial: this.msgSerial,
      channelSerials: this.realtime.channels.channelSerials(),
    });
  }

  checkConnectionStateFreshness(): void {
    if (!this.lastActivity || !this.connectionId) {
      return;
    }

    const sinceLast = Utils.now() - this.lastActivity;
    if (sinceLast > this.connectionStateTtl + (this.maxIdleInterval as number)) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.checkConnectionStateFreshness()',
        'Last known activity from realtime was ' + sinceLast + 'ms ago; discarding connection state'
      );
      this.clearConnection();
      this.states.connecting.failState = 'suspended';
    }
  }

  /**
   * Called when the connectionmanager wants to persist transport
   * state for later recovery. Only applicable in the browser context.
   */
  persistConnection(): void {
    if (haveSessionStorage()) {
      const recoveryKey = this.createRecoveryKey();
      if (recoveryKey) {
        setSessionRecoverData({
          recoveryKey: recoveryKey,
          disconnectedAt: Utils.now(),
          location: global.location,
          clientId: this.realtime.auth.clientId,
        });
      }
    }
  }

  /**
   * Called when the connectionmanager wants to persist transport
   * state for later recovery. Only applicable in the browser context.
   */
  unpersistConnection(): void {
    clearSessionRecoverData();
  }

  /*********************
   * state management
   *********************/

  getError(): IPartialErrorInfo | string {
    return this.errorReason || this.getStateError();
  }

  getStateError(): ErrorInfo {
    return (ConnectionErrors as Record<string, () => ErrorInfo>)[this.state.state]?.();
  }

  activeState(): boolean | void {
    return this.state.queueEvents || this.state.sendEvents;
  }

  enactStateChange(stateChange: ConnectionStateChange): void {
    const logLevel = stateChange.current === 'failed' ? Logger.LOG_ERROR : Logger.LOG_MAJOR;
    Logger.logAction(
      logLevel,
      'Connection state',
      stateChange.current + (stateChange.reason ? '; reason: ' + stateChange.reason : '')
    );
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.enactStateChange',
      'setting new state: ' +
        stateChange.current +
        '; reason = ' +
        (stateChange.reason && (stateChange.reason as ErrorInfo).message)
    );
    const newState = (this.state = this.states[stateChange.current as string]);
    if (stateChange.reason) {
      this.errorReason = stateChange.reason;
      this.realtime.connection.errorReason = stateChange.reason;
    }
    if (newState.terminal || newState.state === 'suspended') {
      /* suspended is nonterminal, but once in the suspended state, realtime
       * will have discarded our connection state, so futher connection
       * attempts should start from scratch */
      this.clearConnection();
    }
    this.emit('connectionstate', stateChange);
  }

  /****************************************
   * ConnectionManager connection lifecycle
   ****************************************/

  startTransitionTimer(transitionState: ConnectionState): void {
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.startTransitionTimer()',
      'transitionState: ' + transitionState.state
    );

    if (this.transitionTimer) {
      Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startTransitionTimer()', 'clearing already-running timer');
      clearTimeout(this.transitionTimer as number);
    }

    this.transitionTimer = setTimeout(() => {
      if (this.transitionTimer) {
        this.transitionTimer = null;
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager ' + transitionState.state + ' timer expired',
          'requesting new state: ' + transitionState.failState
        );
        this.notifyState({ state: transitionState.failState as string });
      }
    }, transitionState.retryDelay);
  }

  cancelTransitionTimer(): void {
    Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.cancelTransitionTimer()', '');
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer as number);
      this.transitionTimer = null;
    }
  }

  startSuspendTimer(): void {
    if (this.suspendTimer) return;
    this.suspendTimer = setTimeout(() => {
      if (this.suspendTimer) {
        this.suspendTimer = null;
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager suspend timer expired',
          'requesting new state: suspended'
        );
        this.states.connecting.failState = 'suspended';
        this.notifyState({ state: 'suspended' });
      }
    }, this.connectionStateTtl);
  }

  checkSuspendTimer(state: string): void {
    if (state !== 'disconnected' && state !== 'suspended' && state !== 'connecting') this.cancelSuspendTimer();
  }

  cancelSuspendTimer(): void {
    this.states.connecting.failState = 'disconnected';
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer as number);
      this.suspendTimer = null;
    }
  }

  startRetryTimer(interval: number): void {
    this.retryTimer = setTimeout(() => {
      Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager retry timer expired', 'retrying');
      this.retryTimer = null;
      this.requestState({ state: 'connecting' });
    }, interval);
  }

  cancelRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer as NodeJS.Timeout);
      this.retryTimer = null;
    }
  }

  notifyState(indicated: ConnectionState): void {
    const state = indicated.state;

    /* We retry immediately if:
     * - something disconnects us while we're connected, or
     * - a viable (but not yet active) transport fails due to a token error (so
     *   this.errorReason will be set, and startConnect will do a forced
     *   authorize). If this.errorReason is already set (to a token error),
     *   then there has been at least one previous attempt to connect that also
     *   failed for a token error, so by RTN14b we go to DISCONNECTED and wait
     *   before trying again */
    const retryImmediately =
      state === 'disconnected' &&
      (this.state === this.states.connected ||
        this.state === this.states.synchronizing ||
        indicated.retryImmediately ||
        (this.state === this.states.connecting &&
          indicated.error &&
          Auth.isTokenErr(indicated.error) &&
          !(this.errorReason && Auth.isTokenErr(this.errorReason as ErrorInfo))));

    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.notifyState()',
      'new state: ' + state + (retryImmediately ? '; will retry connection immediately' : '')
    );
    /* do nothing if we're already in the indicated state */
    if (state == this.state.state) return;

    /* kill timers (possibly excepting suspend timer depending on the notified
     * state), as these are superseded by this notification */
    this.cancelTransitionTimer();
    this.cancelRetryTimer();
    this.checkSuspendTimer(indicated.state);

    if (state === 'suspended' || state === 'connected') {
      this.disconnectedRetryCount = 0;
    }

    /* do nothing if we're unable to move from the current state */
    if (this.state.terminal) return;

    /* process new state */
    const newState = this.states[indicated.state];

    let retryDelay = newState.retryDelay;
    if (newState.state === 'disconnected') {
      this.disconnectedRetryCount++;
      retryDelay = Utils.getRetryTime(newState.retryDelay as number, this.disconnectedRetryCount);
    }

    const change = new ConnectionStateChange(
      this.state.state,
      newState.state,
      retryDelay,
      indicated.error || (ConnectionErrors as Partial<Record<string, () => ErrorInfo>>)[newState.state]?.()
    );

    if (retryImmediately) {
      const autoReconnect = () => {
        if (this.state === this.states.disconnected) {
          this.lastAutoReconnectAttempt = Utils.now();
          this.requestState({ state: 'connecting' });
        }
      };
      const sinceLast = this.lastAutoReconnectAttempt && Utils.now() - this.lastAutoReconnectAttempt + 1;
      if (sinceLast && sinceLast < 1000) {
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.notifyState()',
          'Last reconnect attempt was only ' +
            sinceLast +
            'ms ago, waiting another ' +
            (1000 - sinceLast) +
            'ms before trying again'
        );
        setTimeout(autoReconnect, 1000 - sinceLast);
      } else {
        Platform.Config.nextTick(autoReconnect);
      }
    } else if (state === 'disconnected' || state === 'suspended') {
      this.startRetryTimer(retryDelay as number);
    }

    /* If going into disconnect/suspended (and not retrying immediately), or a
     * terminal state, ensure there are no orphaned transports hanging around. */
    if ((state === 'disconnected' && !retryImmediately) || state === 'suspended' || newState.terminal) {
      /* Wait till the next tick so the connection state change is enacted,
       * so aborting transports doesn't trigger redundant state changes */
      Platform.Config.nextTick(() => {
        this.disconnectAllTransports();
      });
    }

    if (state == 'connected' && !this.activeProtocol) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConnectionManager.notifyState()',
        'Broken invariant: attempted to go into connected state, but there is no active protocol'
      );
    }

    /* implement the change and notify */
    this.enactStateChange(change);
    if (this.state.sendEvents) {
      this.sendQueuedMessages();
    } else if (!this.state.queueEvents) {
      this.realtime.channels.propogateConnectionInterruption(state, change.reason);
      this.failQueuedMessages(change.reason as ErrorInfo); // RTN7c
    }
  }

  requestState(request: any): void {
    const state = request.state;
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.requestState()',
      'requested state: ' + state + '; current state: ' + this.state.state
    );
    if (state == this.state.state) return; /* silently do nothing */

    /* kill running timers, as this request supersedes them */
    this.cancelTransitionTimer();
    this.cancelRetryTimer();
    /* for suspend timer check rather than cancel -- eg requesting a connecting
     * state should not reset the suspend timer */
    this.checkSuspendTimer(state);

    if (state == 'connecting' && this.state.state == 'connected') return;
    if (state == 'closing' && this.state.state == 'closed') return;

    const newState = this.states[state],
      change = new ConnectionStateChange(
        this.state.state,
        newState.state,
        null,
        request.error || (ConnectionErrors as Partial<Record<string, () => ErrorInfo>>)[newState.state]?.()
      );

    this.enactStateChange(change);

    if (state == 'connecting') {
      Platform.Config.nextTick(() => {
        this.startConnect();
      });
    }
    if (state == 'closing') {
      this.closeImpl();
    }
  }

  startConnect(): void {
    if (this.state !== this.states.connecting) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.startConnect()',
        'Must be in connecting state to connect, but was ' + this.state.state
      );
      return;
    }

    const auth = this.realtime.auth;

    /* The point of the connectCounter mechanism is to ensure that the
     * connection procedure can be cancelled. We want disconnectAllTransports
     * to be able to stop any in-progress connection, even before it gets to
     * the stage of having a pending (or even a proposed) transport that it can
     * dispose() of. So we check that it's still current after any async stage,
     * up until the stage that is synchronous with instantiating a transport */
    const connectCount = ++this.connectCounter;

    const connect = () => {
      this.checkConnectionStateFreshness();
      this.getTransportParams((transportParams: TransportParams) => {
        if (transportParams.mode === 'recover' && transportParams.options.recover) {
          const recoveryContext = decodeRecoveryKey(transportParams.options.recover);
          if (recoveryContext) {
            this.realtime.channels.recoverChannels(recoveryContext.channelSerials);
          }
        }

        if (connectCount !== this.connectCounter) {
          return;
        }
        this.connectImpl(transportParams, connectCount);
      });
    };

    Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.startConnect()', 'starting connection');
    this.startSuspendTimer();
    this.startTransitionTimer(this.states.connecting);

    if (auth.method === 'basic') {
      connect();
    } else {
      const authCb = (err: ErrorInfo | null) => {
        if (connectCount !== this.connectCounter) {
          return;
        }
        if (err) {
          this.actOnErrorFromAuthorize(err);
        } else {
          connect();
        }
      };
      if (this.errorReason && Auth.isTokenErr(this.errorReason as ErrorInfo)) {
        /* Force a refetch of a new token */
        auth._forceNewToken(null, null, authCb);
      } else {
        auth._ensureValidAuthCredentials(false, authCb);
      }
    }
  }

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
  connectImpl(transportParams: TransportParams, connectCount?: number): void {
    const state = this.state.state;

    if (state !== this.states.connecting.state && state !== this.states.connected.state) {
      /* Only keep trying as long as in the 'connecting' state (or 'connected'
       * for upgrading). Any operation can put us into 'disconnected' to cancel
       * connection attempts and wait before retrying, or 'failed' to fail. */
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.connectImpl()',
        'Must be in connecting state to connect (or connected to upgrade), but was ' + state
      );
    } else if (this.pendingTransports.length) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'ConnectionManager.connectImpl()',
        'Transports ' + this.pendingTransports[0].toString() + ' currently pending; taking no action'
      );
    } else if (state == this.states.connected.state) {
      this.upgradeIfNeeded(transportParams);
    } else if (this.transports.length > 1 && this.getTransportPreference()) {
      this.connectPreference(transportParams, connectCount);
    } else {
      this.connectBase(transportParams, connectCount);
    }
  }

  connectPreference(transportParams: TransportParams, connectCount?: number): void {
    const preference = this.getTransportPreference();
    let preferenceTimeoutExpired = false;

    if (!Utils.arrIn(this.transports, preference)) {
      this.unpersistTransportPreference();
      this.connectImpl(transportParams, connectCount);
    }

    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.connectPreference()',
      'Trying to connect with stored transport preference ' + preference
    );

    const preferenceTimeout = setTimeout(() => {
      preferenceTimeoutExpired = true;
      if (!(this.state.state === this.states.connected.state)) {
        Logger.logAction(
          Logger.LOG_MINOR,
          'ConnectionManager.connectPreference()',
          'Shortcircuit connection attempt with ' + preference + ' failed; clearing preference and trying from scratch'
        );
        /* Abort all connection attempts. (This also disconnects the active
         * protocol, but none exists if we're not in the connected state) */
        this.disconnectAllTransports();
        /* Be quite agressive about clearing the stored preference if ever it doesn't work */
        this.unpersistTransportPreference();
      }
      this.connectImpl(transportParams, connectCount);
    }, this.options.timeouts.preferenceConnectTimeout);

    /* For connectPreference, just use the main host. If host fallback is needed, do it in connectBase.
     * The wstransport it will substitute the httphost for an appropriate wshost */
    transportParams.host = this.httpHosts[0];
    this.tryATransport(transportParams, preference, (fatal: boolean, transport: Transport) => {
      clearTimeout(preferenceTimeout);
      if (preferenceTimeoutExpired && transport) {
        /* Viable, but too late - connectImpl() will already be trying
         * connectBase, and we weren't in upgrade mode. Just remove the
         * onconnected listener and get rid of it */
        transport.off();
        transport.disconnect();
        Utils.arrDeleteValue(this.pendingTransports, transport);
      } else if (!transport && !fatal) {
        /* Preference failed in a transport-specific way. Try more */
        this.unpersistTransportPreference();
        this.connectImpl(transportParams, connectCount);
      }
      /* If suceeded, or failed fatally, nothing to do */
    });
  }

  /**
   * Try to establish a transport on the base transport (the best transport
   * such that if it doesn't work, nothing will work) as determined through
   * static feature detection, checking for network connectivity and trying
   * fallback hosts if applicable.
   * @param transportParams
   */
  connectBase(transportParams: TransportParams, connectCount?: number): void {
    const giveUp = (err: IPartialErrorInfo) => {
      this.notifyState({ state: this.states.connecting.failState as string, error: err });
    };
    const candidateHosts = this.httpHosts.slice();
    const hostAttemptCb = (fatal: boolean, transport: Transport) => {
      if (connectCount !== this.connectCounter) {
        return;
      }
      if (!transport && !fatal) {
        tryFallbackHosts();
      }
    };

    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.connectBase()',
      'Trying to connect with base transport ' + this.baseTransport
    );

    /* first try to establish a connection with the priority host with http transport */
    const host = candidateHosts.shift();
    if (!host) {
      giveUp(new ErrorInfo('Unable to connect (no available host)', 80003, 404));
      return;
    }
    transportParams.host = host;

    /* this is what we'll be doing if the attempt for the main host fails */
    const tryFallbackHosts = () => {
      /* if there aren't any fallback hosts, fail */
      if (!candidateHosts.length) {
        giveUp(new ErrorInfo('Unable to connect (and no more fallback hosts to try)', 80003, 404));
        return;
      }
      /* before trying any fallback (or any remaining fallback) we decide if
       * there is a problem with the ably host, or there is a general connectivity
       * problem */
      if (!this.realtime.http.checkConnectivity) {
        giveUp(new PartialErrorInfo('Internal error: Http.checkConnectivity not set', null, 500));
        return;
      }
      this.realtime.http.checkConnectivity((err?: ErrorInfo | null, connectivity?: boolean) => {
        if (connectCount !== this.connectCounter) {
          return;
        }
        /* we know err won't happen but handle it here anyway */
        if (err) {
          giveUp(err);
          return;
        }
        if (!connectivity) {
          /* the internet isn't reachable, so don't try the fallback hosts */
          giveUp(new ErrorInfo('Unable to connect (network unreachable)', 80003, 404));
          return;
        }
        /* the network is there, so there's a problem with the main host, or
         * its dns. Try the fallback hosts. We could try them simultaneously but
         * that would potentially cause a huge spike in load on the load balancer */
        transportParams.host = Utils.arrPopRandomElement(candidateHosts);
        this.tryATransport(transportParams, this.baseTransport, hostAttemptCb);
      });
    };

    if (this.forceFallbackHost && candidateHosts.length) {
      this.forceFallbackHost = false;
      tryFallbackHosts();
      return;
    }

    this.tryATransport(transportParams, this.baseTransport, hostAttemptCb);
  }

  getUpgradePossibilities(): string[] {
    /* returns the subset of upgradeTransports to the right of the current
     * transport in upgradeTransports (if it's in there - if not, currentSerial
     * will be -1, so return upgradeTransports.slice(0) == upgradeTransports */
    const current = (this.activeProtocol as Protocol).getTransport().shortName;
    const currentSerial = Utils.arrIndexOf(this.upgradeTransports, current);
    return this.upgradeTransports.slice(currentSerial + 1) as string[];
  }

  upgradeIfNeeded(transportParams: Record<string, any>): void {
    const upgradePossibilities = this.getUpgradePossibilities();
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.upgradeIfNeeded()',
      'upgrade possibilities: ' + Platform.Config.inspect(upgradePossibilities)
    );

    if (!upgradePossibilities.length) {
      return;
    }

    Utils.arrForEach(upgradePossibilities, (upgradeTransport: string) => {
      /* Note: the transport may mutate the params, so give each transport a fresh one */
      const upgradeTransportParams = this.createTransportParams(transportParams.host, 'upgrade');
      this.tryATransport(upgradeTransportParams, upgradeTransport, noop);
    });
  }

  closeImpl(): void {
    Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing connection');
    this.cancelSuspendTimer();
    this.startTransitionTimer(this.states.closing);

    Utils.safeArrForEach(this.pendingTransports, function (transport) {
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing pending transport: ' + transport);
      if (transport) transport.close();
    });

    Utils.safeArrForEach(this.proposedTransports, function (transport) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.closeImpl()',
        'Disposing of proposed transport: ' + transport
      );
      if (transport) transport.dispose();
    });

    if (this.activeProtocol) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.closeImpl()',
        'Closing active transport: ' + this.activeProtocol.getTransport()
      );
      this.activeProtocol.getTransport().close();
    }

    /* If there was an active transport, this will probably be
     * preempted by the notifyState call in deactivateTransport */
    this.notifyState({ state: 'closed' });
  }

  onAuthUpdated(tokenDetails: API.Types.TokenDetails, callback: Function): void {
    switch (this.state.state) {
      case 'connected': {
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.onAuthUpdated()',
          'Sending AUTH message on active transport'
        );
        /* If there are any proposed/pending transports (eg an upgrade that
         * isn't yet scheduled for activation) that hasn't yet started syncing,
         * just to get rid of them & restart the upgrade with the new token, to
         * avoid a race condition. (If it has started syncing, the AUTH will be
         * queued until the upgrade is complete, so everything's fine) */
        if (
          (this.pendingTransports.length || this.proposedTransports.length) &&
          this.state !== this.states.synchronizing
        ) {
          this.disconnectAllTransports(/* exceptActive: */ true);
          const transportParams = (this.activeProtocol as Protocol).getTransport().params;
          Platform.Config.nextTick(() => {
            if (this.state.state === 'connected') {
              this.upgradeIfNeeded(transportParams);
            }
          });
        }

        /* Do any transport-specific new-token action */
        const activeTransport = this.activeProtocol?.getTransport();
        if (activeTransport && activeTransport.onAuthUpdated) {
          activeTransport.onAuthUpdated(tokenDetails);
        }

        const authMsg = ProtocolMessage.fromValues({
          action: actions.AUTH,
          auth: {
            accessToken: tokenDetails.token,
          },
        });
        this.send(authMsg);

        /* The answer will come back as either a connectiondetails event
         * (realtime sends a CONNECTED to acknowledge the reauth) or a
         * statechange to failed */
        const successListener = () => {
          this.off(failureListener);
          callback(null, tokenDetails);
        };
        const failureListener = (stateChange: ConnectionStateChange) => {
          if (stateChange.current === 'failed') {
            this.off(successListener);
            this.off(failureListener);
            callback(stateChange.reason || this.getStateError());
          }
        };
        this.once('connectiondetails', successListener);
        this.on('connectionstate', failureListener);
        break;
      }

      case 'connecting':
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.onAuthUpdated()',
          'Aborting current connection attempts in order to start again with the new auth details'
        );
        this.disconnectAllTransports();
      /* fallthrough to add statechange listener */

      default: {
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.onAuthUpdated()',
          'Connection state is ' + this.state.state + '; waiting until either connected or failed'
        );
        const listener = (stateChange: ConnectionStateChange) => {
          switch (stateChange.current) {
            case 'connected':
              this.off(listener);
              callback(null, tokenDetails);
              break;
            case 'failed':
            case 'closed':
            case 'suspended':
              this.off(listener);
              callback(stateChange.reason || this.getStateError());
              break;
            default:
              /* ignore till we get either connected or failed */
              break;
          }
        };
        this.on('connectionstate', listener);
        if (this.state.state === 'connecting') {
          /* can happen if in the connecting state but no transport was pending
           * yet, so disconnectAllTransports did not trigger a disconnected state */
          this.startConnect();
        } else {
          this.requestState({ state: 'connecting' });
        }
      }
    }
  }

  disconnectAllTransports(exceptActive?: boolean): void {
    Logger.logAction(
      Logger.LOG_MINOR,
      'ConnectionManager.disconnectAllTransports()',
      'Disconnecting all transports' + (exceptActive ? ' except the active transport' : '')
    );

    /* This will prevent any connection procedure in an async part of one of its early stages from continuing */
    this.connectCounter++;

    Utils.safeArrForEach(this.pendingTransports, function (transport) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.disconnectAllTransports()',
        'Disconnecting pending transport: ' + transport
      );
      if (transport) transport.disconnect();
    });
    this.pendingTransports = [];

    Utils.safeArrForEach(this.proposedTransports, function (transport) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.disconnectAllTransports()',
        'Disposing of proposed transport: ' + transport
      );
      if (transport) transport.dispose();
    });
    this.proposedTransports = [];

    if (this.activeProtocol && !exceptActive) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.disconnectAllTransports()',
        'Disconnecting active transport: ' + this.activeProtocol.getTransport()
      );
      this.activeProtocol.getTransport().disconnect();
    }
    /* No need to notify state disconnected; disconnecting the active transport
     * will have that effect */
  }

  /******************
   * event queueing
   ******************/

  send(msg: ProtocolMessage, queueEvent?: boolean, callback?: ErrCallback): void {
    callback = callback || noop;
    const state = this.state;

    if (state.sendEvents) {
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
      this.sendImpl(new PendingMessage(msg, callback));
      return;
    }
    const shouldQueue = (queueEvent && state.queueEvents) || state.forceQueueEvents;
    if (!shouldQueue) {
      const err = 'rejecting event, queueEvent was ' + queueEvent + ', state was ' + state.state;
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', err);
      callback(this.errorReason || new ErrorInfo(err, 90000, 400));
      return;
    }
    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'queueing msg; ' + ProtocolMessage.stringify(msg));
    }
    this.queue(msg, callback);
  }

  sendImpl(pendingMessage: PendingMessage): void {
    const msg = pendingMessage.message;
    /* If have already attempted to send this, resend with the same msgSerial,
     * so Ably can dedup if the previous send succeeded */
    if (pendingMessage.ackRequired && !pendingMessage.sendAttempted) {
      msg.msgSerial = this.msgSerial++;
    }
    try {
      (this.activeProtocol as Protocol).send(pendingMessage);
    } catch (e) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConnectionManager.sendImpl()',
        'Unexpected exception in transport.send(): ' + (e as Error).stack
      );
    }
  }

  queue(msg: ProtocolMessage, callback: ErrCallback): void {
    Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queue()', 'queueing event');
    const lastQueued = this.queuedMessages.last();
    const maxSize = this.options.maxMessageSize;
    /* If have already attempted to send a message, don't merge more messages
     * into it, as if the previous send actually succeeded and realtime ignores
     * the dup, they'll be lost */
    if (lastQueued && !lastQueued.sendAttempted && bundleWith(lastQueued.message, msg, maxSize)) {
      if (!lastQueued.merged) {
        lastQueued.callback = Multicaster.create([lastQueued.callback as any]);
        lastQueued.merged = true;
      }
      (lastQueued.callback as MulticasterInstance).push(callback as any);
    } else {
      this.queuedMessages.push(new PendingMessage(msg, callback));
    }
  }

  sendQueuedMessages(): void {
    Logger.logAction(
      Logger.LOG_MICRO,
      'ConnectionManager.sendQueuedMessages()',
      'sending ' + this.queuedMessages.count() + ' queued messages'
    );
    let pendingMessage;
    while ((pendingMessage = this.queuedMessages.shift())) this.sendImpl(pendingMessage);
  }

  queuePendingMessages(pendingMessages: Array<PendingMessage>): void {
    if (pendingMessages && pendingMessages.length) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.queuePendingMessages()',
        'queueing ' + pendingMessages.length + ' pending messages'
      );
      this.queuedMessages.prepend(pendingMessages);
    }
  }

  failQueuedMessages(err: ErrorInfo): void {
    const numQueued = this.queuedMessages.count();
    if (numQueued > 0) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConnectionManager.failQueuedMessages()',
        'failing ' + numQueued + ' queued messages, err = ' + Utils.inspectError(err)
      );
      this.queuedMessages.completeAllMessages(err);
    }
  }

  onChannelMessage(message: ProtocolMessage, transport: Transport): void {
    const onActiveTransport = this.activeProtocol && transport === this.activeProtocol.getTransport(),
      onUpgradeTransport = Utils.arrIn(this.pendingTransports, transport) && this.state == this.states.synchronizing;

    /* As the lib now has a period where the upgrade transport is synced but
     * before it's become active (while waiting for the old one to become
     * idle), message can validly arrive on it even though it isn't active */
    if (onActiveTransport || onUpgradeTransport) {
      this.realtime.channels.onChannelMessage(message);
    } else {
      // Message came in on a defunct transport. Allow only acks, nacks, & errors for outstanding
      // messages,  no new messages (as sync has been sent on new transport so new messages will
      // be resent there, or connection has been closed so don't want new messages)
      if (Utils.arrIndexOf([actions.ACK, actions.NACK, actions.ERROR], message.action) > -1) {
        this.realtime.channels.onChannelMessage(message);
      } else {
        Logger.logAction(
          Logger.LOG_MICRO,
          'ConnectionManager.onChannelMessage()',
          'received message ' + JSON.stringify(message) + 'on defunct transport; discarding'
        );
      }
    }
  }

  ping(transport: Transport | null, callback: Function): void {
    /* if transport is specified, try that */
    if (transport) {
      Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.ping()', 'transport = ' + transport);

      const onTimeout = function () {
        transport.off('heartbeat', onHeartbeat);
        callback(new ErrorInfo('Timeout waiting for heartbeat response', 50000, 500));
      };

      const pingStart = Utils.now(),
        id = Utils.cheapRandStr();

      const onHeartbeat = function (responseId: string) {
        if (responseId === id) {
          transport.off('heartbeat', onHeartbeat);
          clearTimeout(timer);
          const responseTime = Utils.now() - pingStart;
          callback(null, responseTime);
        }
      };

      const timer = setTimeout(onTimeout, this.options.timeouts.realtimeRequestTimeout);

      transport.on('heartbeat', onHeartbeat);
      transport.ping(id);
      return;
    }

    /* if we're not connected, don't attempt */
    if (this.state.state !== 'connected') {
      callback(new ErrorInfo('Unable to ping service; not connected', 40000, 400));
      return;
    }

    /* no transport was specified, so use the current (connected) one
     * but ensure that we retry if the transport is superseded before we complete */
    let completed = false;

    const onPingComplete = (err: Error, responseTime: number) => {
      this.off('transport.active', onTransportActive);
      if (!completed) {
        completed = true;
        callback(err, responseTime);
      }
    };

    const onTransportActive = () => {
      if (!completed) {
        /* ensure that no callback happens for the currently outstanding operation */
        completed = true;
        /* repeat but picking up the new transport */
        Platform.Config.nextTick(() => {
          this.ping(null, callback);
        });
      }
    };

    this.on('transport.active', onTransportActive);
    this.ping((this.activeProtocol as Protocol).getTransport(), onPingComplete);
  }

  abort(error: ErrorInfo): void {
    (this.activeProtocol as Protocol).getTransport().fail(error);
  }

  registerProposedTransport(transport: Transport): void {
    this.proposedTransports.push(transport);
  }

  getTransportPreference(): string {
    return this.transportPreference || (haveWebStorage() && Platform.WebStorage?.get?.(transportPreferenceName));
  }

  persistTransportPreference(transport: Transport): void {
    if (Utils.arrIn(Defaults.upgradeTransports, transport.shortName)) {
      this.transportPreference = transport.shortName;
      if (haveWebStorage()) {
        Platform.WebStorage?.set?.(transportPreferenceName, transport.shortName);
      }
    }
  }

  unpersistTransportPreference(): void {
    this.transportPreference = null;
    if (haveWebStorage()) {
      Platform.WebStorage?.remove?.(transportPreferenceName);
    }
  }

  /* This method is only used during connection attempts, so implements RSA4c1, RSA4c2,
   * and RSA4d. It is generally not invoked for serverside-triggered reauths or manual
   * reauths, so RSA4c3 does not apply, except (per per RSA4d1) in the case that the auth
   * server returns 403. */
  actOnErrorFromAuthorize(err: ErrorInfo): void {
    if (err.code === 40171) {
      /* No way to reauth */
      this.notifyState({ state: 'failed', error: err });
    } else if (err.code === 40102) {
      this.notifyState({ state: 'failed', error: err });
    } else if (err.statusCode === HttpStatusCodes.Forbidden) {
      const msg = 'Client configured authentication provider returned 403; failing the connection';
      Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.actOnErrorFromAuthorize()', msg);
      this.notifyState({ state: 'failed', error: new ErrorInfo(msg, 80019, 403, err) });
    } else {
      const msg = 'Client configured authentication provider request failed';
      Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.actOnErrorFromAuthorize', msg);
      this.notifyState({ state: this.state.failState as string, error: new ErrorInfo(msg, 80019, 401, err) });
    }
  }

  onConnectionDetailsUpdate(connectionDetails: Record<string, any>, transport: Transport): void {
    if (!connectionDetails) {
      return;
    }
    this.connectionDetails = connectionDetails;
    if (connectionDetails.maxMessageSize) {
      this.options.maxMessageSize = connectionDetails.maxMessageSize;
    }
    const clientId = connectionDetails.clientId;
    if (clientId) {
      const err = this.realtime.auth._uncheckedSetClientId(clientId);
      if (err) {
        Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.onConnectionDetailsUpdate()', err.message);
        /* Errors setting the clientId are fatal to the connection */
        transport.fail(err);
        return;
      }
    }
    const connectionStateTtl = connectionDetails.connectionStateTtl;
    if (connectionStateTtl) {
      this.connectionStateTtl = connectionStateTtl;
    }
    this.maxIdleInterval = connectionDetails.maxIdleInterval;
    this.emit('connectiondetails', connectionDetails);
  }
}

export default ConnectionManager;
