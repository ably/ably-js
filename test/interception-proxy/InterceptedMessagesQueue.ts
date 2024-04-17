import { InterceptedConnection } from './InterceptedConnection';
import { ProxyMessage } from './Proxy';
import { WebSocketMessageData } from './WebSocketMessageData';

export class InterceptedMessagePredicate {
  constructor(readonly interceptedConnection: InterceptedConnection, readonly fromClient: boolean) {}

  get loggingDescription() {
    return `(messages from ${this.fromClient ? 'client' : 'server'} for connection ID ${
      this.interceptedConnection.id
    })`;
  }

  get keyForMap() {
    return `${this.interceptedConnection.id}-${this.fromClient}`;
  }
}

// A handle for locating a message within InterceptedMessageQueue.
export class InterceptedMessageHandle {
  constructor(readonly predicate: InterceptedMessagePredicate, readonly messageId: string) {}
}

export type MessageAction = { type: 'drop' } | { type: 'replace'; data: WebSocketMessageData };

export class InterceptedMessage {
  action: MessageAction | null = null;

  constructor(readonly message: ProxyMessage) {}

  get id(): string {
    return this.message.id;
  }
}

// Per-connection, per-direction message queue. We use it to queue intercepted messages whilst waiting for a control server message telling us what to do with the message at the head of the queue.
export class InterceptedMessagesQueue {
  // Maps an InterceptedMessagePredicate’s `keyForMap` to a queue
  private readonly queues = new Map<string, InterceptedMessage[]>();

  private messagesFor(predicate: InterceptedMessagePredicate, createIfNeeded = false) {
    const queue = this.queues.get(predicate.keyForMap);
    if (queue !== undefined) {
      return queue;
    } else {
      const result: InterceptedMessage[] = [];

      if (createIfNeeded) {
        this.queues.set(predicate.keyForMap, result);
      }

      return result;
    }
  }

  pop(predicate: InterceptedMessagePredicate) {
    const messages = this.messagesFor(predicate);

    if (messages.length === 0) {
      throw new Error('pop called for empty queue');
    }

    return messages.shift()!;
  }

  hasMessages(predicate: InterceptedMessagePredicate) {
    return this.messagesFor(predicate).length > 0;
  }

  append(message: InterceptedMessage, predicate: InterceptedMessagePredicate) {
    this.messagesFor(predicate, true).push(message);
  }

  count(predicate: InterceptedMessagePredicate) {
    return this.messagesFor(predicate).length;
  }

  isHead(handle: InterceptedMessageHandle) {
    const head = this.messagesFor(handle.predicate)[0];
    return head.id === handle.messageId;
  }

  getHead(predicate: InterceptedMessagePredicate) {
    return this.messagesFor(predicate)[0];
  }
}
