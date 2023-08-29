import { TransportNames } from 'common/constants/TransportName';
import initialiseNodeCometTransport from './nodecomettransport';

export default {
  order: [TransportNames.Comet],
  implementations: { [TransportNames.Comet]: initialiseNodeCometTransport },
};
