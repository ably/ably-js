import { TransportStorage } from '../../../../common/lib/transport/connectionmanager';
import Transport from '../../../../common/lib/transport/transport';

declare function initialiseNodeCometTransport(transportStorage: TransportStorage): typeof Transport;
export default initialiseNodeCometTransport;
