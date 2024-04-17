import { randomUUID } from 'crypto';
import { stateMachineDefinition, InterceptedConnectionState, InterceptedConnectionEvent } from './StateMachine';
import { WebSocket, WebSocketServer } from 'ws';
import { ProxyMessage } from './Proxy';
import { WebSocketMessageData } from './WebSocketMessageData';
import { InterceptionContext } from './InterceptionContext';

export enum WhichConnection {
  ToServer,
  ToClient,
}

/**
 * Represents a WebSocket connection that we’re forwarding from a client to a server.
 */
export class InterceptedConnection {
  readonly id = randomUUID();
  private _state = InterceptedConnectionState.ConnectedToClientButNotYetServer;
  serverConnection: WebSocket | null = null;

  private messageQueues: {
    /**
     * Messages that are waiting to be sent to the server
     */
    toServer: WebSocketMessageData[];
    /**
     * Messages that are waiting to be sent to the client
     */
    toClient: WebSocketMessageData[];
  } = {
    toServer: [],
    toClient: [],
  };

  private keepClientConnectionAlive = false;
  private keepServerConnectionAlive = false;

  /**
   * @param clientConnection An open WebSocket connection to the client.
   */
  constructor(
    private readonly interceptionContext: InterceptionContext,
    host: string,
    proto: string,
    url: string,
    readonly clientConnection: WebSocket,
  ) {
    this.log(`New connection to proxy server (forwarded host ${host}, forwarded proto ${proto})`);

    clientConnection.on('close', () => {
      this.log('clientConnection close event');
      this.on(InterceptedConnectionEvent.ClientClose);
      // TODO I’ve written a state machine but instead of state machine actions I have these calls below (ditto for the server connection); seems maybe suboptimal but not important now
      this.tryFlushSendQueue(false); // drop all queued client-bound messages
      this.tryPropagateClosure(WhichConnection.ToServer);
    });
    // TODO do something with this event?
    clientConnection.on('error', (err) => {
      this.log(`clientConnection error event: ${err}`);
    });

    this.connectToServer(host, proto, url);

    clientConnection.on('message', (data, isBinary) => {
      console.info('Got message from client');
      // TODO sort out type assertion
      this.onMessage(data as Buffer, isBinary, true);
    });
  }

  get state(): InterceptedConnectionState {
    return this._state;
  }

  log(message: string) {
    console.log(`Connection ${this.id} (state ${InterceptedConnectionState[this.state]}): ${message}`);
  }

  on(event: InterceptedConnectionEvent) {
    const transition = stateMachineDefinition.fetchTransition(this.state, event);

    if (transition === null) {
      throw new Error(
        `No transition defined for current state ${InterceptedConnectionState[this.state]} and event ${
          InterceptedConnectionEvent[event]
        }`,
      );
    }

    this.log(`Transitioning to state ${InterceptedConnectionState[transition.newState]}`);
    this._state = transition.newState;

    if (this._state === InterceptedConnectionState.Disconnected) {
      this.log(`Finished`);
    }
  }

  private connectToServer(host: string, proto: string, resourceName: string) {
    const uri = `${proto}://${host}${resourceName}`;
    this.log(`Starting forwarding to ${uri}`);

    const serverConnection = new WebSocket(uri);
    this.serverConnection = serverConnection;

    serverConnection.on('open', () => {
      this.log('serverConnection open event');
      this.on(InterceptedConnectionEvent.ServerOpen);
      this.tryFlushSendQueue(true); // forward all queued server-bound messages
    });
    serverConnection.on('close', () => {
      this.log('serverConnection close event');
      this.on(InterceptedConnectionEvent.ServerClose);
      this.tryFlushSendQueue(true); // drop all queued server-bound messages
      this.tryPropagateClosure(WhichConnection.ToClient);
    });
    // TODO better logging, do something with this event?
    serverConnection.on('error', (err) => {
      this.log(`serverConnection error event: ${err}`);
    });

    serverConnection.on('message', (data, isBinary) => {
      // TODO sort out type assertion
      this.onMessage(data as Buffer, isBinary, false);
    });
  }

  private onMessage(data: Buffer, isBinary: boolean, fromClient: boolean) {
    const proxyMessage = new ProxyMessage(
      isBinary ? { type: 'binary', data } : { type: 'text', data: data.toString('utf-8') },
      fromClient,
    );

    this.log(`Got message ${proxyMessage.loggingDescription}`);

    // We don’t forward this message directly to the other peer; rather we pass it to the interception context, which will use the control API to ask its client what to do with this message. It might, for example, result in a replacement message being injected via `inject`.

    this.interceptionContext.enqueueMessage(proxyMessage, this);
  }

  inject(fromClient: boolean, data: WebSocketMessageData) {
    this.enqueueForSend(fromClient, data);
    this.tryFlushSendQueue(fromClient);
  }

  /**
   * When called with `keepAlive` set to `true`, tells the proxy not to close the connection described by `connection` until called again with `keepAlive` set to `false`.
   */
  setKeepConnectionAlive(keepAlive: boolean, connection: WhichConnection) {
    this.log(`set ${keepAlive ? '' : 'no '}keepAlive connection ${WhichConnection[connection]}`);

    switch (connection) {
      case WhichConnection.ToServer:
        this.keepServerConnectionAlive = keepAlive;
        break;
      case WhichConnection.ToClient:
        this.keepClientConnectionAlive = keepAlive;
        break;
    }

    this.tryPropagateClosure(connection);
  }

  private tryPropagateClosure(targetConnectionDescription: WhichConnection) {
    let keepAlive: boolean;
    let queuedMessages: WebSocketMessageData[];
    let targetConnection: WebSocket | null;

    switch (targetConnectionDescription) {
      case WhichConnection.ToServer:
        keepAlive = this.keepServerConnectionAlive;
        queuedMessages = this.messageQueues.toServer;
        targetConnection = this.serverConnection;
        break;
      case WhichConnection.ToClient:
        keepAlive = this.keepClientConnectionAlive;
        queuedMessages = this.messageQueues.toClient;
        targetConnection = this.clientConnection;
        break;
    }

    // if there are queued messages then we’ll call tryPropagateClosure again after sending them
    if (keepAlive || queuedMessages.length !== 0) {
      return;
    }

    let propagate;

    switch (this.state) {
      case InterceptedConnectionState.ConnectingToServerButNoLongerConnectedToClient:
      case InterceptedConnectionState.ConnectedToServerButNoLongerToClient:
        propagate = targetConnectionDescription === WhichConnection.ToServer;
        break;
      case InterceptedConnectionState.ConnectedToClientAndFailedToConnectToServer:
      case InterceptedConnectionState.ConnectedToClientButNoLongerToServer:
        propagate = targetConnectionDescription === WhichConnection.ToClient;
        break;
      case InterceptedConnectionState.ConnectedToClientButNotYetServer:
      case InterceptedConnectionState.ConnectedToClientAndServer:
        propagate = false; // nothing to propagate
        break;
      case InterceptedConnectionState.Disconnected:
        propagate = false; // already propagated
        break;
    }

    // TODO make use of the information about how the connection closed (i.e. code and data), instead of just a generic close. Not immediately important I think because I don’t think Ably / our tests care about whether clean or what the closing handshake said
    if (propagate) {
      this.log(`Propagating close of connection ${WhichConnection[targetConnectionDescription]}`);
      targetConnection?.close();
    }
  }

  private enqueueForSend(fromClient: boolean, data: WebSocketMessageData) {
    const queue = fromClient ? this.messageQueues.toServer : this.messageQueues.toClient;
    queue.push(data);
  }

  private tryFlushSendQueue(fromClient: boolean) {
    const queue = fromClient ? this.messageQueues.toServer : this.messageQueues.toClient;

    if (queue.length === 0) {
      return;
    }

    let whenCanSend: 'now' | 'later' | 'never';

    switch (this.state) {
      case InterceptedConnectionState.ConnectedToClientButNotYetServer:
        whenCanSend = fromClient ? 'later' : 'now';
        break;
      case InterceptedConnectionState.ConnectingToServerButNoLongerConnectedToClient:
        whenCanSend = fromClient ? 'later' : 'never';
        break;
      case InterceptedConnectionState.ConnectedToClientAndFailedToConnectToServer:
        whenCanSend = fromClient ? 'never' : 'now';
        break;
      case InterceptedConnectionState.ConnectedToClientAndServer:
        whenCanSend = 'now';
        break;
      case InterceptedConnectionState.ConnectedToClientButNoLongerToServer:
        whenCanSend = fromClient ? 'never' : 'now';
        break;
      case InterceptedConnectionState.ConnectedToServerButNoLongerToClient:
        whenCanSend = fromClient ? 'now' : 'never';
        break;
      case InterceptedConnectionState.Disconnected:
        whenCanSend = 'never';
        break;
    }

    let clearQueue = false;

    switch (whenCanSend) {
      case 'now':
        this.log(`Sending ${queue.length} injected messages to ${fromClient ? 'server' : 'client'}`);
        const outgoingConnection = fromClient ? this.serverConnection : this.clientConnection;
        for (const data of queue) {
          this.send(data, outgoingConnection!);
        }
        clearQueue = true;
        break;
      case 'later':
        this.log(
          `There are ${queue.length} injected messages to send to ${
            fromClient ? 'server' : 'client'
          }; will try sending later since connection is in state ${InterceptedConnectionState[this.state]}`,
        );
        break;
      case 'never':
        this.log(
          `There are ${queue.length} injected messages to send to ${
            fromClient ? 'server' : 'client'
          }; cannot do this ever since connection is in state ${
            InterceptedConnectionState[this.state]
          }. Dropping messages.`,
        );
        clearQueue = true;
        break;
    }

    if (clearQueue) {
      queue.length = 0; // clear the queue
      this.tryPropagateClosure(fromClient ? WhichConnection.ToServer : WhichConnection.ToClient);
    }
  }

  private send(data: WebSocketMessageData, connection: WebSocket) {
    let buffer: Buffer;
    switch (data.type) {
      case 'binary':
        buffer = data.data;
        break;
      case 'text':
        buffer = Buffer.from(data.data, 'utf-8');
        break;
    }

    let binary: boolean;
    switch (data.type) {
      case 'binary':
        binary = true;
        break;
      case 'text':
        binary = false;
        break;
    }

    // TODO what does the callback that you can pass here do?
    connection.send(buffer, { binary });
  }
}
