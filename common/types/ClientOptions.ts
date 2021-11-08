import { LoggerOptions } from "../lib/util/logger";
import AuthOptions from "./AuthOptions";
import TokenParams from "./TokenParams";
import { Modify } from "./utils";

type Transport = 'web_socket' | 'xhr_streaming' | 'xhr_polling' | 'jsonp' | 'comet';

export default interface ClientOptions extends AuthOptions {
  /**
   * When true will automatically connect to Ably when library is instanced. This is true by default
   */
  autoConnect?: boolean;

  defaultTokenParams?: TokenParams;

  /**
   * When true, messages published on channels by this client will be echoed back to this client.
   * This is true by default
   */
  echoMessages?: boolean;

  /**
   * Use this only if you have been provided a dedicated environment by Ably
   */
  environment?: string;

  /**
   * Logger configuration
   */
  log?: LoggerOptions;
  port?: number;

  /**
   * When true, messages will be queued whilst the connection is disconnected. True by default.
   */
  queueMessages?: boolean;

  restHost?: string;
  realtimeHost?: string;
  fallbackHosts?: string[];
  fallbackHostsUseDefault?: boolean;

  /**
   * Can be used to explicitly recover a connection.
   * See https://www.ably.com/documentation/realtime/connection#connection-state-recovery
   */
  recover?: boolean | null | string | ((lastConnectionDetails: {
    recoveryKey: string;
    disconnectedAt: number;
    location: string;
    clientId: string | null;
  }, callback: (shouldRecover: boolean) => void) => void);

  /**
   * Use a non-secure connection connection. By default, a TLS connection is used to connect to Ably
   */
  tls?: boolean;
  tlsPort?: number;

  /**
   * When true, the more efficient MsgPack binary encoding is used.
   * When false, JSON text encoding is used.
   */
  useBinaryProtocol?: boolean;

  disconnectedRetryTimeout?: number;
  suspendedRetryTimeout?: number;
  closeOnUnload?: boolean;
  idempotentRestPublishing?: boolean;
  transportParams?: {[k: string]: string};
  transports?: Transport[];

  httpMaxRetryCount?: number;
  restAgentOptions?: { keepAlive: boolean, maxSockets: number };
  pushFullWait?: boolean;
  checkChannelsOnResume?: boolean;
  plugins?: Record<string, unknown>;
  agents?: string[];
}

export type DeprecatedClientOptions = Modify<ClientOptions, {
  host?: string;
  wsHost?: string;
  queueEvents?: boolean;
  promises?: boolean;
  headers?: Record<string, string>;
  maxMessageSize?: number;
  timeouts?: Record<string, number>;
}>

export type NormalisedClientOptions = Modify<DeprecatedClientOptions, {
  realtimeHost: string;
  restHost: string;
  keyName?: string;
  keySecret?: string;
  timeouts: Record<string, number>;
  maxMessageSize: number;
}>
