export type WebSocketMessageData = { type: 'binary'; data: Buffer } | { type: 'text'; data: string };

export function webSocketMessageDataLoggingDescription(data: WebSocketMessageData) {
  switch (data.type) {
    case 'binary':
      return `binary data: ${data.data.toString('base64')}`;
    case 'text':
      return `text data: ${data.data}`;
  }
}
