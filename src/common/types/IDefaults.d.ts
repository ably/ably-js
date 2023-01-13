import TransportNames from '../constants/TransportNames';
import { RestAgentOptions } from './ClientOptions';

export default interface IDefaults {
  connectivityCheckUrl: string;
  jsonpInternetUpUrl?: string;
  defaultTransports: TransportNames[];
  baseTransportOrder: TransportNames[];
  transportPreferenceOrder: TransportNames[];
  upgradeTransports: TransportNames[];
  restAgentOptions?: RestAgentOptions;
}
