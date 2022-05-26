import { Modify } from './utils';
import * as API from '../../../ably';

export default interface ClientOptions extends API.Types.ClientOptions {
  restAgentOptions?: { keepAlive: boolean; maxSockets: number };
  pushFullWait?: boolean;
  checkChannelsOnResume?: boolean;
  agents?: string[];
}

export type DeprecatedClientOptions = Modify<
  ClientOptions,
  {
    host?: string;
    wsHost?: string;
    queueEvents?: boolean;
    promises?: boolean;
    headers?: Record<string, string>;
    maxMessageSize?: number;
    timeouts?: Record<string, number>;
  }
>;

export type NormalisedClientOptions = Modify<
  DeprecatedClientOptions,
  {
    realtimeHost: string;
    restHost: string;
    keyName?: string;
    keySecret?: string;
    timeouts: Record<string, number>;
    maxMessageSize: number;
  }
>;
