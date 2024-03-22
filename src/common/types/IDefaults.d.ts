import TransportName from '../constants/TransportName';
import { RestAgentOptions } from './ClientOptions';

export default interface IDefaults {
  connectivityCheckUrl: string;
  wsConnectivityUrl: string;
  defaultTransports: TransportName[];
  restAgentOptions?: RestAgentOptions;
}
