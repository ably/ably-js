import {
  ClientMethods,
  createInjectMessageParams,
  createTransformInterceptedMessageParamsDTO,
  createTransformInterceptedMessageResult,
  InjectMessageParamsDTO,
  InjectMessageResultDTO,
  InterceptionModeDTO,
  ServerMethods,
  TransformInterceptedMessageResult,
} from './ControlRPC';
import { ControlServer, ControlServerConnection } from './ControlServer';
import { InterceptedConnection, WhichConnection } from './InterceptedConnection';
import {
  InterceptedMessagesQueue,
  InterceptedMessageHandle,
  InterceptedMessagePredicate,
  InterceptedMessage,
} from './InterceptedMessagesQueue';
import { ProxyMessage } from './Proxy';
import { ProxyServer } from './ProxyServer';
import { webSocketMessageDataLoggingDescription } from './WebSocketMessageData';
import { TypedJSONRPCServerAndClient, JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from 'json-rpc-2.0';
import { MitmproxyLauncher } from './MitmproxyLauncher';

type ServerParams = {
  controlServerConnection: ControlServerConnection;
};

export class InterceptionContext {
  controlServer: ControlServer | null = null;
  proxyServer: ProxyServer | null = null;
  private jsonRPC: TypedJSONRPCServerAndClient<ServerMethods, ClientMethods, ServerParams>;
  private interceptedMessagesQueue = new InterceptedMessagesQueue();
  private mitmproxyLauncher: MitmproxyLauncher | null = null;

  constructor() {
    this.jsonRPC = new JSONRPCServerAndClient(
      new JSONRPCServer(),
      new JSONRPCClient((request) => {
        this.controlServer!.sendToActiveConnection(JSON.stringify(request));
      }),
    );

    this.jsonRPC.addMethod('startInterception', (params, serverParams) =>
      this.startInterception(params, serverParams.controlServerConnection),
    );
    this.jsonRPC.addMethod('injectMessage', (params) => this.injectMessage(params));
    this.jsonRPC.addMethod('mitmproxyReady', () => this.mitmproxyLauncher?.onMitmproxyReady());
  }

  onControlWebSocketMessage(data: string, controlServerConnection: ControlServerConnection) {
    // TODO what is the promise returned by this?
    this.jsonRPC.receiveAndSend(JSON.parse(data), { controlServerConnection });
  }

  async startInterception(params: InterceptionModeDTO, controlServerConnection: ControlServerConnection): Promise<{}> {
    this.controlServer!.setActiveConnection(controlServerConnection);
    this.mitmproxyLauncher = new MitmproxyLauncher();
    await this.mitmproxyLauncher.launch(params);
    return {};
  }

  private handleTransformInterceptedMessageResponse(
    result: TransformInterceptedMessageResult,
    handle: InterceptedMessageHandle,
  ) {
    if (!this.interceptedMessagesQueue.isHead(handle)) {
      throw new Error('Got response for an intercepted message that’s not at head of queue; shouldn’t be possible');
    }

    const interceptedMessage = this.interceptedMessagesQueue.getHead(handle.predicate);

    if (interceptedMessage.action !== null) {
      throw new Error('Response asked us to set the action for a message that already has action set');
    }

    interceptedMessage.action = result.action;

    this.dequeueInterceptedMessage(handle.predicate);
  }

  private dequeueInterceptedMessage(predicate: InterceptedMessagePredicate) {
    console.log('Dequeueing intercepted message for predicate', predicate.loggingDescription);

    const message = this.interceptedMessagesQueue.pop(predicate);

    if (message.action === null) {
      throw new Error(`Attempted to dequeue message that doesn’t have an action: ${message}`);
    }

    switch (message.action.type) {
      case 'replace':
        console.log(
          `Injecting replacement message for message ${message.id}, with type ${
            message.action.data.type
          } and data (${webSocketMessageDataLoggingDescription(message.action.data)})`,
        );

        predicate.interceptedConnection.inject(predicate.fromClient, message.action.data);
        break;
      case 'drop':
        console.log(`Dropping message ${message}`);
        break;
    }

    if (this.interceptedMessagesQueue.hasMessages(predicate)) {
      this.transformNextMessage(predicate);
    } else {
      // We’re not waiting to forward any more messages, so tell the proxy that it can propagate any pending connection close and propagate any future connection close
      predicate.interceptedConnection.setKeepConnectionAlive(
        false,
        predicate.fromClient ? WhichConnection.ToServer : WhichConnection.ToClient,
      );
    }
  }

  private transformNextMessage(predicate: InterceptedMessagePredicate) {
    const interceptedMessage = this.interceptedMessagesQueue.getHead(predicate);

    const paramsDTO = createTransformInterceptedMessageParamsDTO({
      id: interceptedMessage.id,
      connectionID: predicate.interceptedConnection.id,
      data: interceptedMessage.message.data,
      fromClient: interceptedMessage.message.fromClient,
    });

    Promise.resolve(this.jsonRPC.request('transformInterceptedMessage', paramsDTO))
      .then((resultDTO) => {
        const handle = new InterceptedMessageHandle(predicate, interceptedMessage.id);
        this.handleTransformInterceptedMessageResponse(createTransformInterceptedMessageResult(resultDTO), handle);
      })
      .catch((err) => {
        // TODO a better message
        console.log(`transformInterceptedMessage returned error: ${err}`);
      });
  }

  enqueueMessage(message: ProxyMessage, interceptedConnection: InterceptedConnection) {
    console.log(`enqueueMessage ${message.id}`);

    // Tell the proxy to not propagate a connection close until we’ve had a chance to inject this message
    interceptedConnection.setKeepConnectionAlive(
      true,
      message.fromClient ? WhichConnection.ToServer : WhichConnection.ToClient,
    );

    const predicate = new InterceptedMessagePredicate(interceptedConnection, message.fromClient);

    const interceptedMessage = new InterceptedMessage(message);
    this.interceptedMessagesQueue.append(interceptedMessage, predicate);

    if (this.interceptedMessagesQueue.count(predicate) === 1) {
      this.transformNextMessage(predicate);
    } else {
      console.log(
        `Enqueued message ${interceptedMessage.id} since there are ${
          this.interceptedMessagesQueue.count(predicate) - 1
        } pending messages`,
      );
    }
  }

  injectMessage(paramsDTO: InjectMessageParamsDTO): InjectMessageResultDTO {
    const params = createInjectMessageParams(paramsDTO);
    console.log('context received injectMessage with params', params);

    const interceptedConnection = this.proxyServer!.getInterceptedConnection(params.connectionID);
    if (!interceptedConnection) {
      throw new Error(`No connection exists with ID ${params.connectionID}`);
    }

    // This ProxyMessage is a bit pointless; it’s just so I can generate an ID to return to clients for them to correlate with proxy logs
    const message = new ProxyMessage(params.data, params.fromClient);
    console.log(
      `Injecting user-injected message ${message.id}, with type ${
        message.data.type
      } and data (${webSocketMessageDataLoggingDescription(message.data)})`,
    );
    // TODO consider whether injecting immediately is indeed the right thing to, or whether it should actually go at the end of the queue of messages awaiting a `transformInterceptedMessage` response
    interceptedConnection.inject(message.fromClient, message.data);

    return { id: message.id };
  }
}
