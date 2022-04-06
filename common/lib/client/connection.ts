import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import ConnectionManager from '../transport/connectionmanager';
import Logger from '../util/logger';
import ConnectionStateChange from './connectionstatechange';
import ErrorInfo from '../types/errorinfo';
import { NormalisedClientOptions } from '../../types/ClientOptions';
import Realtime from './realtime';

function noop() {}

class Connection extends EventEmitter {
  ably: Realtime;
  connectionManager: ConnectionManager;
  state: string;
  key?: string;
  id?: string;
  serial: undefined;
  timeSerial: undefined;
  recoveryKey?: string | null;
  errorReason: ErrorInfo | null;

  constructor(ably: Realtime, options: NormalisedClientOptions) {
    super();
    this.ably = ably;
    this.connectionManager = new ConnectionManager(ably, options);
    this.state = this.connectionManager.state.state;
    this.key = undefined;
    this.id = undefined;
    this.serial = undefined;
    this.timeSerial = undefined;
    this.recoveryKey = undefined;
    this.errorReason = null;

    this.connectionManager.on('connectionstate', (stateChange: ConnectionStateChange) => {
      const state = (this.state = stateChange.current as string);
      Utils.nextTick(() => {
        this.emit(state, stateChange);
      });
    });
    this.connectionManager.on('update', (stateChange: ConnectionStateChange) => {
      Utils.nextTick(() => {
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
}

export default Connection;
