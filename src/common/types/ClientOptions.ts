import { Modify } from './utils';
import * as API from '../../../ably';

export type RestAgentOptions = {
  keepAlive: boolean;
  maxSockets: number;
};

export default interface ClientOptions extends API.ClientOptions {
  restAgentOptions?: RestAgentOptions;
  pushFullWait?: boolean;
  agents?: Record<string, string | undefined>;
}

/**
 * Properties which internal and test code wish to be able to pass to the public constructor of `Rest` and `Realtime` in order to modify the behaviour of those classes.
 */
export type InternalClientOptions = Modify<
  ClientOptions,
  {
    internal?: {
      maxMessageSize?: number;
    };
  }
>;

export type NormalisedClientOptions = Modify<
  InternalClientOptions,
  {
    realtimeHost: string;
    restHost: string;
    keyName?: string;
    keySecret?: string;
    timeouts: Record<string, number>;
    maxMessageSize: number;
    connectivityCheckParams: Record<string, string> | null;
    headers: Record<string, string>;
  }
>;
