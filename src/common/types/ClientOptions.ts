import { Modify } from './utils';
import * as API from '../../../ably';
import { ModularPlugins } from 'common/lib/client/modularplugins';

export type RestAgentOptions = {
  keepAlive: boolean;
  maxSockets: number;
};

export default interface ClientOptions extends API.ClientOptions<API.CorePlugins & ModularPlugins> {
  restAgentOptions?: RestAgentOptions;
  pushFullWait?: boolean;
  agents?: Record<string, string | undefined>;
}

export type NormalisedClientOptions = Modify<
  ClientOptions,
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
