import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import ConnectionManager from '../transport/connectionmanager';
import Logger from '../util/logger';
import ConnectionStateChange from './connectionstatechange';
import ErrorInfo from '../types/errorinfo';
import { NormalisedClientOptions } from '../../types/ClientOptions';
import Realtime from './realtime';
import Platform from 'common/platform';

function noop() {}

class Connection extends EventEmitter {
  ably: Realtime;
  connectionManager: ConnectionManager;
  state: string;
  key?: string;
  id?: string;
  errorReason: ErrorInfo | null;

  constructor(ably: Realtime, options: NormalisedClientOptions) {
    super();
    this.ably = ably;
    this.connectionManager = new ConnectionManager(ably, options);
    this.state = this.connectionManager.state.state;
    this.key = undefined;
    this.id = undefined;
    this.errorReason = null;

    this.connectionManager.on('connectionstate', (stateChange: ConnectionStateChange) => {
      const state = (this.state = stateChange.current as string);
      Platform.Config.nextTick(() => {
        this.emit(state, stateChange);
      });
    });
    this.connectionManager.on('update', (stateChange: ConnectionStateChange) => {
      Platform.Config.nextTick(() => {
        this.emit('update', stateChange);
      });
    });
  }

  whenState = ((state: string, listener: Function) => {
    return EventEmitter.prototype.whenState.call(
      this,
      state,
      this.state,
      listener,
      new ConnectionStateChange(undefined, state)
    );
  }) as any;

  connect(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.connect()', '');
    this.connectionManager.requestState({ state: 'connecting' });
  }

  ping(callback: Function): Promise<void> | void {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.ping()', '');
    if (!callback) {
      if (this.ably.options.promises) {
        return Utils.promisify(this, 'ping', arguments);
      }
      callback = noop;
    }
    this.connectionManager.ping(null, callback);
  }

  close(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.close()', 'connectionKey = ' + this.key);
    this.connectionManager.requestState({ state: 'closing' });
  }

  get recoveryKey(): string | null {
    return this.createRecoveryKey();
  }

  createRecoveryKey(): string | null {
    return this.connectionManager.createRecoveryKey();
  }
}

export default Connection;
