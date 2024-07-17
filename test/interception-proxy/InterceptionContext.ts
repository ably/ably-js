import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import {
  ClientMethods,
  createTransformInterceptedMessageParamsDTO,
  createTransformInterceptedMessageResult,
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

type ServerParams = {
  controlServerConnection: ControlServerConnection;
};

export class InterceptionContext {
  controlServer: ControlServer | null = null;
  proxyServer: ProxyServer | null = null;
  private jsonRPC: TypedJSONRPCServerAndClient<ServerMethods, ClientMethods, ServerParams>;
  private interceptedMessagesQueue = new InterceptedMessagesQueue();
  private onMitmproxyReady: (() => void) | null = null;

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
    this.jsonRPC.addMethod('mitmproxyReady', () => this.onMitmproxyReady?.());
  }

  onControlWebSocketMessage(data: string, controlServerConnection: ControlServerConnection) {
    // TODO what is the promise returned by this?
    this.jsonRPC.receiveAndSend(JSON.parse(data), { controlServerConnection });
  }

  async startInterception(params: InterceptionModeDTO, controlServerConnection: ControlServerConnection): Promise<{}> {
    this.controlServer!.setActiveConnection(controlServerConnection);

    console.log('starting mitmdump, mode', params.mode);

    let mitmdumpBinary: string;
    let mitmdumpMode: string | null;

    // TODO this is currently written on the assumption that darwin means running locally and linux means running in GitHub action; sort out so that you can run (locally or on CI) on (macOS or Linux)
    switch (process.platform) {
      case 'darwin':
        mitmdumpBinary = 'mitmdump';
        switch (params.mode) {
          case 'local':
            mitmdumpMode = `local:${params.pid}`;
            break;
          case 'proxy':
            mitmdumpMode = null;
            break;
        }
        break;
      case 'linux':
        // Currently we expect that you set up the iptables rules externally
        mitmdumpBinary = '/opt/pipx_bin/mitmdump';
        switch (params.mode) {
          case 'local':
            mitmdumpMode = 'transparent';
            break;
          case 'proxy':
            mitmdumpMode = null;
            break;
        }
        break;
      default:
        throw new Error(`Don’t know how to set up mitmdump interception for platform ${process.platform}`);
    }

    // sounds like we don’t need to explicitly stop this when we stop the current process: https://nodejs.org/api/child_process.html#optionsdetached
    const mitmdump = spawn(mitmdumpBinary, [
      '--set',
      'stream_large_bodies=1',
      ...(mitmdumpMode === null ? [] : ['--mode', mitmdumpMode]),
      '-s',
      'test/mitmproxy_addon_2.py',
      '--set',
      // "full request URL with response status code and HTTP headers" (the default truncates the URL)
      'flow_detail=2',
    ]);

    const formatMitmdumpOutput = (source: string, data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split('\n');
      return lines.map((line) => `mitmdump ${source}: ${line}`).join('\n');
    };

    mitmdump.stdout.on('data', (data) => {
      console.log(formatMitmdumpOutput('stdout', data));
    });

    mitmdump.stderr.on('data', (data) => {
      console.log(formatMitmdumpOutput('stderr', data));
    });

    console.log(`Waiting for mitmdump to start`);

    let resolveResult: () => void;
    const result = new Promise<{}>((resolve) => {
      resolveResult = () => resolve({});
    });

    this.onMitmproxyReady = () => {
      this.onMitmproxyReady = null;
      console.log(`mitmdump has started`);
      resolveResult();
    };

    return result;
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
}
