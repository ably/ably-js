import { TransportNames } from 'common/constants/TransportName';
import initialiseNodeCometTransport from './nodecomettransport';
import { default as initialiseWebSocketTransport } from '../../../../common/lib/transport/websockettransport';

export default {
  order: [TransportNames.Comet],
  bundledImplementations: {
    [TransportNames.WebSocket]: initialiseWebSocketTransport,
    [TransportNames.Comet]: initialiseNodeCometTransport,
  },
};
