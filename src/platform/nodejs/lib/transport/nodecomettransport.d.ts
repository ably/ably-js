import ConnectionManager from '../../../../common/lib/transport/connectionmanager';
import Transport from '../../../../common/lib/transport/transport';

declare function initialiseNodeCometTransport(connectionManager: typeof ConnectionManager): typeof Transport;
export default initialiseNodeCometTransport;
