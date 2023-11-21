import TransportName from '../constants/TransportName';
import { RestAgentOptions } from './ClientOptions';

export default interface IDefaults {
  connectivityCheckUrl: string;
  defaultTransports: TransportName[];
  baseTransportOrder: TransportName[];
  transportPreferenceOrder: TransportName[];
  upgradeTransports: TransportName[];
  restAgentOptions?: RestAgentOptions;
}
