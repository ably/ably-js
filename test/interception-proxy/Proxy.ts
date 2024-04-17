// TODO implement the proxy! These types are placeholders

import { randomUUID } from 'crypto';
import { WebSocketMessageData, webSocketMessageDataLoggingDescription } from './WebSocketMessageData';

export class ProxyMessage {
  // unique identifier that we generate for this message
  id = randomUUID();

  constructor(readonly data: WebSocketMessageData, readonly fromClient: boolean) {}

  get loggingDescription(): string {
    const sourceDescription = `from ${this.fromClient ? 'client' : 'server'}`;

    return `${sourceDescription} (id: ${this.id}, ${webSocketMessageDataLoggingDescription(this.data)})`;
  }
}
