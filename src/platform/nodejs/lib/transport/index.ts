import TransportName from 'common/constants/TransportName';
import initialiseNodeCometTransport from './nodecomettransport';

export default {
  order: [TransportName.Comet],
  implementations: { [TransportName.Comet]: initialiseNodeCometTransport },
};
