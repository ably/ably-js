import Platform from 'platform';
import IDefaults from '../../../../common/types/IDefaults';
import TransportNames from '../../../../common/constants/TransportNames';

const Defaults: IDefaults = {
  internetUpUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
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

/* If using IE8, don't attempt to upgrade from xhr_polling to xhr_streaming -
 * while it can do streaming, the low max http-connections-per-host limit means
 * that the polling transport is crippled during the upgrade process. So just
 * leave it at the base transport */
if (Platform.noUpgrade) {
  Defaults.upgradeTransports = [];
}

export default Defaults;
