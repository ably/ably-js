import { Modify } from './utils';
import * as API from '../../../ably';

export type RestAgentOptions = {
  keepAlive: boolean;
  maxSockets: number;
};

export default interface ClientOptions extends API.Types.ClientOptions {
  restAgentOptions?: RestAgentOptions;
  pushFullWait?: boolean;
  agents?: Record<string, string | undefined>;
}

export type DeprecatedClientOptions = Modify<
  ClientOptions,
  {
    host?: string;
    wsHost?: string;
    queueEvents?: boolean;
    promises?: boolean;
    /**
     * This option dates back to the initial commit of the repo but was never in the specification and sounds like nobody is depending on it; Paddy said we can remove in v2 (see https://ably-real-time.slack.com/archives/CURL4U2FP/p1709909310332169?thread_ts=1709908997.753599&cid=CURL4U2FP)
     */
    headers?: Record<string, string>;
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
    connectivityCheckParams: Record<string, string> | null;
  }
>;
