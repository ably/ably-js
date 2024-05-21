import { WebSocket, WebSocketServer } from 'ws';
import { InterceptionContext } from './InterceptionContext';

const port = 8001;

// think of it as an opaque type for now
export type ControlServerConnection = WebSocket;

export class ControlServer {
  private wss = new WebSocketServer({ port });
  private webSocketConnections: WebSocket[] = [];
  private activeConnection: WebSocket | null = null;

  constructor(private readonly interceptionContext: InterceptionContext) {
    interceptionContext.controlServer = this;
  }

  start() {
    this.wss.on('connection', (ws) => {
      console.log('New connection to control server');
      this.webSocketConnections.push(ws);
      ws.on('error', console.error);

      ws.on('message', (data, isBinary) => {
        try {
          if (isBinary) {
            throw new Error('Control server got a binary message; it only works with text messages');
          }

          const text = data.toString('utf-8');
          console.info('Control server received message', text);
          this.interceptionContext.onControlWebSocketMessage(text, ws);
        } catch (err) {
          console.error('Control server got error handling message', err);
        }
      });
    });
    console.log(`Started control server on port ${port}`);
  }

  send(data: string, connection: ControlServerConnection) {
    console.log('Control server sending message', data);
    connection.send(data);
  }

  sendToActiveConnection(data: string) {
    console.log('Control server sending message to active connection', data);
    this.activeConnection?.send(data);
  }

  setActiveConnection(connection: ControlServerConnection) {
    if (this.activeConnection !== null) {
      throw new Error('There is already an active connection to the control server');
    }

    console.log('Control server set active connection');
    this.activeConnection = connection;
  }
}
