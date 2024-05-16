import ProtocolMessage, { actions, stringify as stringifyProtocolMessage } from '../types/protocolmessage';
import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import MessageQueue from './messagequeue';
import ErrorInfo from '../types/errorinfo';
import Transport from './transport';
import { ErrCallback } from '../../types/utils';

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
    this.ackRequired = action == actions.MESSAGE || action == actions.PRESENCE;
  }
}

class Protocol extends EventEmitter {
  transport: Transport;
  messageQueue: MessageQueue;

  constructor(transport: Transport) {
    super(transport.logger);
    this.transport = transport;
    this.messageQueue = new MessageQueue(this.logger);
    transport.on('ack', (serial: number, count: number) => {
      this.onAck(serial, count);
    });
    transport.on('nack', (serial: number, count: number, err: ErrorInfo) => {
      this.onNack(serial, count, err);
    });
  }

  onAck(serial: number, count: number): void {
    Logger.logAction(this.logger, Logger.LOG_MICRO, 'Protocol.onAck()', 'serial = ' + serial + '; count = ' + count);
    this.messageQueue.completeMessages(serial, count);
  }

  onNack(serial: number, count: number, err: ErrorInfo): void {
    Logger.logAction(
      this.logger,
      Logger.LOG_ERROR,
      'Protocol.onNack()',
      'serial = ' + serial + '; count = ' + count + '; err = ' + Utils.inspectError(err),
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
    if (this.logger.shouldLog(Logger.LOG_MICRO)) {
      Logger.logActionNoStrip(
        this.logger,
        Logger.LOG_MICRO,
        'Protocol.send()',
        'sending msg; ' +
          stringifyProtocolMessage(pendingMessage.message, this.transport.connectionManager.realtime._RealtimePresence),
      );
    }
    pendingMessage.sendAttempted = true;
    this.transport.send(pendingMessage.message);
  }

  getTransport(): Transport {
    return this.transport;
  }

  getPendingMessages(): PendingMessage[] {
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

export default Protocol;
