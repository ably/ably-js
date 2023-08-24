import TransportName from 'common/constants/TransportName';
import initialiseXHRPollingTransport from './xhrpollingtransport';
import initialiseXHRStreamingTransport from './xhrstreamingtransport';

export default {
  order: [TransportName.XhrPolling, TransportName.XhrStreaming],
  implementations: {
    [TransportName.XhrPolling]: initialiseXHRPollingTransport,
    [TransportName.XhrStreaming]: initialiseXHRStreamingTransport,
  },
};
