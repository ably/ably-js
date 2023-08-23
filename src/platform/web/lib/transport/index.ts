import TransportName from 'common/constants/TransportName';
import Platform from 'common/platform';
import initialiseXHRPollingTransport from './xhrpollingtransport';
import initialiseXHRStreamingTransport from './xhrstreamingtransport';
import { default as initialiseWebSocketTransport } from '../../../../common/lib/transport/websockettransport';

// For reasons that I don’t understand, if we use [TransportNames.XhrStreaming] and [TransportNames.XhrPolling] for the keys in defaultTransports’s, then defaultTransports does not get tree-shaken. Hence using literals instead. They’re still correctly type-checked.

const order: TransportName[] = ['xhr_polling', 'xhr_streaming'];

const defaultTransports: (typeof Platform)['Transports'] = {
  order,
  bundledImplementations: {
    web_socket: initialiseWebSocketTransport,
    xhr_polling: initialiseXHRPollingTransport,
    xhr_streaming: initialiseXHRStreamingTransport,
  },
};

export default defaultTransports;

export const ModulesTransports: (typeof Platform)['Transports'] = {
  order,
  bundledImplementations: {},
};
