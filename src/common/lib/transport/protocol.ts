import ProtocolMessage, { actions, stringify as stringifyProtocolMessage } from '../types/protocolmessage';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Transport from './transport';
import { ErrCallback } from '../../types/utils';
import type { Acks } from '../client/acks';

export class PendingMessage {
  message: ProtocolMessage;
  callback?: ErrCallback;
  merged: boolean;
  sendAttempted: boolean;
  ackRequired: boolean;

  constructor(message: ProtocolMessage, callback?: ErrCallback) {
    this.message = message;
    this.callback = callback;
    this.merged = false;
    const action = message.action;
    this.sendAttempted = false;
    // TODO should this come out or would it do more harm than good?
    this.ackRequired = action == actions.MESSAGE || action == actions.PRESENCE;
  }
}

class Protocol extends EventEmitter {
  transport: Transport;
  acks: Acks | null;

  constructor(transport: Transport) {
    super();
    this.transport = transport;
    const Acks = transport.connectionManager.realtime._Acks;
    this.acks = Acks ? new Acks(transport) : null;
  }

  onceIdle(listener: ErrCallback): void {
    if (this.acks) {
      this.acks?.onceIdle(listener);
    } else {
      listener();
    }
  }

  send(pendingMessage: PendingMessage): void {
    this.acks?.onProtocolWillSend(pendingMessage);
    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'Protocol.send()',
        'sending msg; ' +
          stringifyProtocolMessage(pendingMessage.message, this.transport.connectionManager.realtime._RealtimePresence)
      );
    }
    pendingMessage.sendAttempted = true;
    this.transport.send(pendingMessage.message);
  }

  getTransport(): Transport {
    return this.transport;
  }

  finish(): void {
    const transport = this.transport;
    this.onceIdle(function () {
      transport.disconnect();
    });
  }
}

export default Protocol;
