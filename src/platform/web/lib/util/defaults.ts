import IDefaults from 'common/types/IDefaults';
import TransportName from 'common/constants/TransportName';

const Defaults: IDefaults = {
  connectivityCheckUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
  /* Order matters here: the base transport is the leftmost one in the
   * intersection of baseTransportOrder and the transports clientOption that's
   * supported. */
  defaultTransports: [TransportName.XhrPolling, TransportName.XhrStreaming, TransportName.WebSocket],
  baseTransportOrder: [TransportName.XhrPolling, TransportName.XhrStreaming, TransportName.WebSocket],
  transportPreferenceOrder: [TransportName.XhrPolling, TransportName.XhrStreaming, TransportName.WebSocket],
  upgradeTransports: [TransportName.XhrStreaming, TransportName.WebSocket],
};

export default Defaults;
