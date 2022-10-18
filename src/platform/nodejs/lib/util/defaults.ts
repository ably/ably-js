import IDefaults from '../../../../common/types/IDefaults';
import TransportNames from '../../../../common/constants/TransportNames';

const Defaults: IDefaults = {
  connectivityCheckUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
  /* Note: order matters here: the base transport is the leftmost one in the
   * intersection of baseTransportOrder and the transports clientOption that's supported.
   * (For node this is the same as the transportPreferenceOrder, but for
   * browsers it's different*/
  defaultTransports: [TransportNames.WebSocket],
  baseTransportOrder: [TransportNames.Comet, TransportNames.WebSocket],
  transportPreferenceOrder: [TransportNames.Comet, TransportNames.WebSocket],
  upgradeTransports: [TransportNames.WebSocket],
  restAgentOptions: { maxSockets: 40, keepAlive: true },
};

export default Defaults;
