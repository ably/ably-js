import { IProtocolMessage, IProtocolMessageConstructor } from '../types/protocolmessage';
import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import MessageQueue from './messagequeue';
import ErrorInfo from '../types/errorinfo';
import { ITransport } from './transport';
import { ErrCallback } from '../../types/utils';

export interface IPendingMessage {
  message: IProtocolMessage;
  callback?: ErrCallback;
  sendAttempted: boolean;
  ackRequired: boolean;
  merged: boolean;
}

export interface IPendingMessageConstructor {
  new (message: IProtocolMessage, callback?: ErrCallback): IPendingMessage;
}

export interface IProtocol {
  getTransport(): ITransport;
  onceIdle(listener: ErrCallback): void;
  messageQueue: MessageQueue;
  transport: ITransport;
  finish(): void;
  getPendingMessages(): IPendingMessage[];
  clearPendingMessages(): void;
  send(pendingMessage: IPendingMessage): void;
}

export interface IProtocolConstructor {
  new (transport: ITransport): IProtocol;
}

const protocolClassFactory = (protocolMessageClass: IProtocolMessageConstructor) => {
  const actions = protocolMessageClass.Action;

  class PendingMessage {
    message: IProtocolMessage;
    callback?: ErrCallback;
    merged: boolean;
    sendAttempted: boolean;
    ackRequired: boolean;

    constructor(message: IProtocolMessage, callback?: ErrCallback) {
      this.message = message;
      this.callback = callback;
      this.merged = false;
      const action = message.action;
      this.sendAttempted = false;
      this.ackRequired = action == actions.MESSAGE || action == actions.PRESENCE;
    }
  }

  class Protocol extends EventEmitter {
    transport: ITransport;
    messageQueue: MessageQueue;

    constructor(transport: ITransport) {
      super();
      this.transport = transport;
      this.messageQueue = new MessageQueue();
      transport.on('ack', (serial: number, count: number) => {
        this.onAck(serial, count);
      });
      transport.on('nack', (serial: number, count: number, err: ErrorInfo) => {
        this.onNack(serial, count, err);
      });
    }

    onAck(serial: number, count: number): void {
      Logger.logAction(Logger.LOG_MICRO, 'Protocol.onAck()', 'serial = ' + serial + '; count = ' + count);
      this.messageQueue.completeMessages(serial, count);
    }

    onNack(serial: number, count: number, err: ErrorInfo): void {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Protocol.onNack()',
        'serial = ' + serial + '; count = ' + count + '; err = ' + Utils.inspectError(err)
      );
      if (!err) {
        err = new ErrorInfo('Unable to send message; channel not responding', 50001, 500);
      }
      this.messageQueue.completeMessages(serial, count, err);
    }

    onceIdle(listener: ErrCallback): void {
      const messageQueue = this.messageQueue;
      if (messageQueue.count() === 0) {
        listener();
        return;
      }
      messageQueue.once('idle', listener);
    }

    send(pendingMessage: PendingMessage): void {
      if (pendingMessage.ackRequired) {
        this.messageQueue.push(pendingMessage);
      }
      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        Logger.logAction(
          Logger.LOG_MICRO,
          'Protocol.send()',
          'sending msg; ' + protocolMessageClass.stringify(pendingMessage.message)
        );
      }
      pendingMessage.sendAttempted = true;
      this.transport.send(pendingMessage.message);
    }

    getTransport(): ITransport {
      return this.transport;
    }

    getPendingMessages(): IPendingMessage[] {
      return this.messageQueue.copyAll();
    }

    clearPendingMessages(): void {
      return this.messageQueue.clear();
    }

    finish(): void {
      const transport = this.transport;
      this.onceIdle(function () {
        transport.disconnect();
      });
    }
  }

  return { protocolClass: Protocol, pendingMessageClass: PendingMessage };
};

export { protocolClassFactory };
