import Platform from '../../../../common/platform';
import CometTransport from '../../../../common/lib/transport/comettransport';
import XHRRequest from './xhrrequest';
import ConnectionManager, { TransportParams } from 'common/lib/transport/connectionmanager';
import Auth from 'common/lib/client/auth';
import { RequestParams } from 'common/types/http';
import { TransportNames } from 'common/constants/TransportName';

var shortName = TransportNames.XhrPolling;
class XHRPollingTransport extends CometTransport {
  shortName = shortName;
  constructor(connectionManager: ConnectionManager, auth: Auth, params: TransportParams) {
    super(connectionManager, auth, params);
    params.stream = false;
    this.shortName = shortName;
  }

  static isAvailable() {
    return Platform.Config.xhrSupported && Platform.Config.allowComet;
  }

  toString() {
    return 'XHRPollingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
  }

  createRequest(
    uri: string,
    headers: Record<string, string>,
    params: RequestParams,
    body: unknown,
    requestMode: number
  ) {
    return XHRRequest.createRequest(uri, headers, params, body, requestMode, this.timeouts);
  }
}

function initialiseTransport(connectionManager: typeof ConnectionManager): typeof XHRPollingTransport {
  if (XHRPollingTransport.isAvailable()) connectionManager.supportedTransports[shortName] = XHRPollingTransport;

  return XHRPollingTransport;
}

export default initialiseTransport;
