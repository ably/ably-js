import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { InterceptionContext } from './InterceptionContext';
import { ProxyMessage } from './Proxy';
import { WebSocketMessageData } from './WebSocketMessageData';
import { stateMachineDefinition, InterceptedConnectionState, InterceptedConnectionEvent } from './StateMachine';
import { InterceptedConnection } from './InterceptedConnection';

const port = 8002;

// TODO make sure this is as accurate as possible (in terms of frames) — forward PING and PONG without emitting our own, etc
// TODO more generally there are definitely going to be nuances that I’ve missed that mean this proxy introduces a not 100% faithful reproduction of the comms, but we can iterate
// TODO Understand the server API better
// TODO note that here we always accept the connection from the client, which, again, isn’t necessarily faithful

export class ProxyServer {
  private wss = new WebSocketServer({ port });
  // Keyed by connections’ `id`
  private interceptedConnections = new Map<string, InterceptedConnection>();

  constructor(private readonly interceptionContext: InterceptionContext) {
    interceptionContext.proxyServer = this;
  }

  start() {
    this.wss.on('connection', (clientConnection, req) => {
      const host = req.headers['ably-test-host'] as string | undefined;
      const proto = req.headers['ably-test-proto'] as string | undefined;

      if (host === undefined) {
        console.error('Connection to proxy server without Ably-Test-Host header; closing');
        clientConnection.close();
        return;
      }

      if (proto === undefined) {
        console.error('Connection to proxy server without Ably-Test-Proto header; closing');
        clientConnection.close();
        return;
      }

      const interceptedConnection = new InterceptedConnection(
        this.interceptionContext,
        host,
        proto,
        req.url!,
        clientConnection,
      );
      // TODO do we actually need to keep hold of it or will it keep itself around since it’s a listener of a WebSocket?
      this.interceptedConnections.set(interceptedConnection.id, interceptedConnection);
    });

    console.log(`Started interception proxy server to receive traffic from mitmproxy on port ${port}`);
  }
}
