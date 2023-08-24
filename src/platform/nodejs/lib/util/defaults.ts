import IDefaults from '../../../../common/types/IDefaults';
import TransportName from '../../../../common/constants/TransportName';

const Defaults: IDefaults = {
  connectivityCheckUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
  /* Note: order matters here: the base transport is the leftmost one in the
   * intersection of baseTransportOrder and the transports clientOption that's supported. */
  defaultTransports: [TransportName.WebSocket],
  baseTransportOrder: [TransportName.Comet, TransportName.WebSocket],
  transportPreferenceOrder: [TransportName.Comet, TransportName.WebSocket],
  upgradeTransports: [TransportName.WebSocket],
  restAgentOptions: { maxSockets: 40, keepAlive: true },
};

export default Defaults;
