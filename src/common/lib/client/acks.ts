import ErrorInfo from '../types/errorinfo';
import MessageQueue from '../transport/messagequeue';
import Protocol, { PendingMessage } from '../transport/protocol';
import Transport from '../transport/transport';
import Logger from '../util/logger';
import * as Utils from '../util/utils';
import { ErrCallback } from '../../types/utils';
import ConnectionManager from '../transport/connectionmanager';
import Platform from 'common/platform';

export class Acks {
  messageQueue: MessageQueue;

  constructor(transport: Transport) {
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

  onProtocolWillSend(pendingMessage: PendingMessage) {
    if (pendingMessage.ackRequired) {
      this.messageQueue.push(pendingMessage);
    }
  }

  getPendingMessages(): PendingMessage[] {
    return this.messageQueue.copyAll();
  }

  clearPendingMessages(): void {
    return this.messageQueue.clear();
  }

  thingMovedFromActivateTransport(existingActiveProtocol: Protocol, transport: Transport) {
    if (this.messageQueue.count() > 0) {
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
          existingActiveProtocol.acks!.messageQueue.count() +
          ' messages still pending'
      );
    }
  }

  thingMovedFromDeactivateTransport(connectionManager: ConnectionManager, currentProtocol: Protocol) {
    Logger.logAction(
      Logger.LOG_MICRO,
      'ConnectionManager.deactivateTransport()',
      'Getting, clearing, and requeuing ' + currentProtocol.acks!.messageQueue.count() + ' pending messages'
    );
    this.queuePendingMessages(connectionManager, this.getPendingMessages());
    /* Clear any messages we requeue to allow the protocol to become idle.
     * In case of an upgrade, this will trigger an immediate activation of
     * the upgrade transport, so delay a tick so this transport can finish
     * deactivating */
    Platform.Config.nextTick(() => {
      this.clearPendingMessages();
    });
  }

  queuePendingMessages(connectionManager: ConnectionManager, pendingMessages: Array<PendingMessage>): void {
    if (pendingMessages && pendingMessages.length) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'ConnectionManager.queuePendingMessages()',
        'queueing ' + pendingMessages.length + ' pending messages'
      );
      connectionManager.queuedMessages.prepend(pendingMessages);
    }
  }
}
