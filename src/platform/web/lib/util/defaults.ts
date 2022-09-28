import IDefaults from 'common/types/IDefaults';
import TransportNames from 'common/constants/TransportNames';

const Defaults: IDefaults = {
  connectivityCheckUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
  jsonpInternetUpUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up-0-9.js',
  /* Order matters here: the base transport is the leftmost one in the
   * intersection of baseTransportOrder and the transports clientOption that's
   * supported.  This is not quite the same as the preference order -- e.g.
   * xhr_polling is preferred to jsonp, but for browsers that support it we want
   * the base transport to be xhr_polling, not jsonp */
  defaultTransports: [
    TransportNames.XhrPolling,
    TransportNames.XhrStreaming,
    TransportNames.JsonP,
    TransportNames.WebSocket,
  ],
  baseTransportOrder: [
    TransportNames.XhrPolling,
    TransportNames.XhrStreaming,
    TransportNames.JsonP,
    TransportNames.WebSocket,
  ],
  transportPreferenceOrder: [
    TransportNames.JsonP,
    TransportNames.XhrPolling,
    TransportNames.XhrStreaming,
    TransportNames.WebSocket,
  ],
  upgradeTransports: [TransportNames.XhrStreaming, TransportNames.WebSocket],
};

export default Defaults;
