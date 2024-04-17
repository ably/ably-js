import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { randomUUID } from 'crypto';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  StartInterceptionJSONRPCRequest,
  TransformInterceptedMessageJSONRPCRequest,
  TransformInterceptedMessageJSONRPCResponse,
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

export class InterceptionContext {
  controlServer: ControlServer | null = null;
  proxyServer: ProxyServer | null = null;
  private interceptedMessagesQueue = new InterceptedMessagesQueue();
  // TODO use a Map
  private jsonRPCRequestIDsToHandles: Partial<Record<string, InterceptedMessageHandle>> = {};
  private onMitmproxyReady: (() => void) | null = null;

  onControlWebSocketMessage(data: string, controlServerConnection: ControlServerConnection) {
    const dto = JSON.parse(data);

    if ('error' in dto) {
      throw new Error('Not expecting an error in JSON-RPC response');
    } else if ('result' in dto) {
      const response = JSONRPCResponse.fromDTO(dto);
      this.handleJSONRPCResponse(response);
    } else if ('method' in dto) {
      if ('id' in dto) {
        const request = StartInterceptionJSONRPCRequest.fromDTO(dto);
        this.handleJSONRPCRequest(request, controlServerConnection);
      } else if (dto.method === 'mitmproxyReady') {
        // notification telling us that mitmproxy is running
        this.onMitmproxyReady?.();
      }
    } else {
      throw new Error(`Got unrecognised control API message: ${dto}`);
    }
  }

  private handleJSONRPCRequest(request: JSONRPCRequest, controlServerConnection: ControlServerConnection) {
    try {
      if (request instanceof StartInterceptionJSONRPCRequest) {
        this.controlServer!.setActiveConnection(controlServerConnection);

        console.log('starting mitmdump, mode', request.mode);

        let mitmdumpBinary: string;
        let mitmdumpMode: string | null;

        // TODO this is currently written on the assumption that darwin means running locally and linux means running in GitHub action; sort out so that you can run (locally or on CI) on (macOS or Linux)
        switch (process.platform) {
          // currently this actually means "
          case 'darwin':
            mitmdumpBinary = 'mitmdump';
            switch (request.mode.mode) {
              case 'local':
                mitmdumpMode = `local:${request.mode.pid}`;
                break;
              case 'proxy':
                mitmdumpMode = null;
                break;
            }
            break;
          case 'linux':
            // Currently we expect that you set up the iptables rules externally
            mitmdumpBinary = '/opt/pipx_bin/mitmdump';
            switch (request.mode.mode) {
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

        this.onMitmproxyReady = () => {
          this.onMitmproxyReady = null;
          console.log(`mitmdump has started`);
          const response = new JSONRPCResponse(request.id);
          const responseDTO = response.createDTO();
          this.controlServer!.sendToActiveConnection(JSON.stringify(responseDTO));
        };
      } else {
        throw new Error(`Got unknown control API request: ${request}`);
      }
    } catch (error) {
      console.log(`Error handling JSON-RPC request ${request.id}:`, error);
      const response = new JSONRPCResponse(request.id, `Error handling request: ${error}`);
      const responseDTO = response.createDTO();
      this.controlServer!.send(JSON.stringify(responseDTO), controlServerConnection);
    }
  }

  private handleJSONRPCResponse(response: JSONRPCResponse) {
    if (response instanceof TransformInterceptedMessageJSONRPCResponse) {
      this.handleTransformInterceptedMessageResponse(response);
    } else {
      throw new Error(`Got unknown control API response: ${response}`);
    }
  }

  private handleTransformInterceptedMessageResponse(response: TransformInterceptedMessageJSONRPCResponse) {
    const handle = this.jsonRPCRequestIDsToHandles[response.id];

    if (handle === undefined) {
      throw new Error(`Unrecognised control response ID: ${response.id}`);
    }

    delete this.jsonRPCRequestIDsToHandles[response.id];

    if (!this.interceptedMessagesQueue.isHead(handle)) {
      throw new Error('Got response for an intercepted message that’s not at head of queue; shouldn’t be possible');
    }

    const interceptedMessage = this.interceptedMessagesQueue.getHead(handle.predicate);

    if (interceptedMessage.action !== null) {
      throw new Error('Response asked us to set the action for a message that already has action set');
    }

    interceptedMessage.action = response.action;

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
      this.broadcastNextMessage(predicate);
    } else {
      // We’re not waiting to forward any more messages, so tell the proxy that it can propagate any pending connection close and propagate any future connection close
      predicate.interceptedConnection.setKeepConnectionAlive(
        false,
        predicate.fromClient ? WhichConnection.ToServer : WhichConnection.ToClient,
      );
    }
  }

  private broadcastJSONRPCRequest(request: JSONRPCRequest) {
    const data = JSON.stringify(request.createDTO());

    console.log(`Broadcasting request JSON ${data}`);
    this.controlServer?.sendToActiveConnection(data);
  }

  private broadcastNextMessage(predicate: InterceptedMessagePredicate) {
    const interceptedMessage = this.interceptedMessagesQueue.getHead(predicate);

    const jsonRPCRequestID = randomUUID();
    const handle = new InterceptedMessageHandle(predicate, interceptedMessage.id);
    this.jsonRPCRequestIDsToHandles[jsonRPCRequestID] = handle;

    // Broadcast to everyone connected to the control server.
    // TODO I think would be better for there to be one client who sends an explicit message to become the active client, or to only allow a single connection at a time; not important now though

    const jsonRPCRequest = new TransformInterceptedMessageJSONRPCRequest(
      jsonRPCRequestID,
      interceptedMessage.id,
      predicate.interceptedConnection.id,
      interceptedMessage.message.data,
      interceptedMessage.message.fromClient,
    );

    this.broadcastJSONRPCRequest(jsonRPCRequest);
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
      this.broadcastNextMessage(predicate);
    } else {
      console.log(
        `Enqueued message ${interceptedMessage.id} since there are ${
          this.interceptedMessagesQueue.count(predicate) - 1
        } pending messages`,
      );
    }
  }
}
