import ErrorInfo from '../types/errorinfo';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import { IPendingMessage } from './protocol';

class MessageQueue extends EventEmitter {
  messages: Array<IPendingMessage>;

  constructor() {
    super();
    this.messages = [];
  }

  count(): number {
    return this.messages.length;
  }

  push(message: IPendingMessage): void {
    this.messages.push(message);
  }

  shift(): IPendingMessage | undefined {
    return this.messages.shift();
  }

  last(): IPendingMessage {
    return this.messages[this.messages.length - 1];
  }

  copyAll(): IPendingMessage[] {
    return this.messages.slice();
  }

  append(messages: Array<IPendingMessage>): void {
    this.messages.push.apply(this.messages, messages);
  }

  prepend(messages: Array<IPendingMessage>): void {
    this.messages.unshift.apply(this.messages, messages);
  }

  completeMessages(serial: number, count: number, err?: ErrorInfo | null): void {
    Logger.logAction(Logger.LOG_MICRO, 'MessageQueue.completeMessages()', 'serial = ' + serial + '; count = ' + count);
    err = err || null;
    const messages = this.messages;
    if (messages.length === 0) {
      throw new Error('MessageQueue.completeMessages(): completeMessages called on any empty MessageQueue');
    }
    const first = messages[0];
    if (first) {
      const startSerial = first.message.msgSerial as number;
      const endSerial = serial + count; /* the serial of the first message that is *not* the subject of this call */
      if (endSerial > startSerial) {
        const completeMessages = messages.splice(0, endSerial - startSerial);
        for (const message of completeMessages) {
          (message.callback as Function)(err);
        }
      }
      if (messages.length == 0) this.emit('idle');
    }
  }

  completeAllMessages(err: ErrorInfo): void {
    this.completeMessages(0, Number.MAX_SAFE_INTEGER || Number.MAX_VALUE, err);
  }

  resetSendAttempted(): void {
    for (let msg of this.messages) {
      msg.sendAttempted = false;
    }
  }

  clear(): void {
    Logger.logAction(Logger.LOG_MICRO, 'MessageQueue.clear()', 'clearing ' + this.messages.length + ' messages');
    this.messages = [];
    this.emit('idle');
  }
}

export default MessageQueue;
