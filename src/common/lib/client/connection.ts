import EventEmitter from '../util/eventemitter';
import ConnectionManager from '../transport/connectionmanager';
import Logger from '../util/logger';
import ConnectionStateChange from './connectionstatechange';
import ErrorInfo from '../types/errorinfo';
import { NormalisedClientOptions } from '../../types/ClientOptions';
import BaseRealtime from './baserealtime';
import Platform from 'common/platform';

class Connection extends EventEmitter {
  ably: BaseRealtime;
  connectionManager: ConnectionManager;
  state: string;
  key?: string;
  id?: string;
  errorReason: ErrorInfo | null;

  constructor(ably: BaseRealtime, options: NormalisedClientOptions) {
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

  whenState = ((state: string) => {
    return EventEmitter.prototype.whenState.call(this, state, this.state);
  }) as any;

  connect(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.connect()', '');
    this.connectionManager.requestState({ state: 'connecting' });
  }

  async ping(): Promise<number> {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.ping()', '');
    return new Promise((resolve, reject) => {
      this.connectionManager.ping(null, (err: unknown, result: number) => (err ? reject(err) : resolve(result)));
    });
  }

  close(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Connection.close()', 'connectionKey = ' + this.key);
    this.connectionManager.requestState({ state: 'closing' });
  }

  get recoveryKey(): string | null {
    Logger.deprecationWarning(
      'The `Connection.recoveryKey` attribute has been replaced by the `Connection.createRecoveryKey()` method. Replace your usage of `recoveryKey` with the return value of `createRecoveryKey()`. `recoveryKey` will be removed in a future version.',
    );
    return this.createRecoveryKey();
  }

  createRecoveryKey(): string | null {
    return this.connectionManager.createRecoveryKey();
  }
}

export default Connection;
