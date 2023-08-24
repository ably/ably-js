import CometTransport from '../../../../common/lib/transport/comettransport';
import Platform from '../../../../common/platform';
import XHRRequest from './xhrrequest';
import ConnectionManager, { TransportParams, TransportStorage } from 'common/lib/transport/connectionmanager';
import Auth from 'common/lib/client/auth';
import { RequestParams } from 'common/types/http';
import { TransportNames } from 'common/constants/TransportName';

const shortName = TransportNames.XhrStreaming;
class XHRStreamingTransport extends CometTransport {
  shortName = shortName;
  constructor(connectionManager: ConnectionManager, auth: Auth, params: TransportParams) {
    super(connectionManager, auth, params);
  }

  static isAvailable() {
    return Platform.Config.xhrSupported && Platform.Config.streamingSupported && Platform.Config.allowComet;
  }

  toString() {
    return 'XHRStreamingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
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

function initialiseTransport(transportStorage: TransportStorage): typeof XHRStreamingTransport {
  if (XHRStreamingTransport.isAvailable()) transportStorage.supportedTransports[shortName] = XHRStreamingTransport;

  return XHRStreamingTransport;
}

export default initialiseTransport;
