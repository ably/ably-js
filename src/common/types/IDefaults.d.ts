import TransportNames from '../constants/TransportNames';

export default interface IDefaults {
  connectivityCheckUrl: string;
  jsonpInternetUpUrl?: string;
  defaultTransports: TransportNames[];
  baseTransportOrder: TransportNames[];
  transportPreferenceOrder: TransportNames[];
  upgradeTransports: TransportNames[];
  restAgentOptions?: { keepAlive: boolean; maxSockets: number };
}
