import { TransportNames } from 'common/constants/TransportName';
import initialiseXHRPollingTransport from './xhrpollingtransport';
import initialiseXHRStreamingTransport from './xhrstreamingtransport';

export default {
  order: [TransportNames.XhrPolling, TransportNames.XhrStreaming],
  implementations: {
    [TransportNames.XhrPolling]: initialiseXHRPollingTransport,
    [TransportNames.XhrStreaming]: initialiseXHRStreamingTransport,
  },
};
