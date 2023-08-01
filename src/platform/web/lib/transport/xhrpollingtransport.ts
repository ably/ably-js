import Platform from '../../../../common/platform';
import { CometTransportClass } from '../../../../common/lib/transport/comettransport';
import XHRRequest from './xhrrequest';
import { IConnectionManager, ITransportParams } from 'common/lib/transport/connectionmanager';
import Auth from 'common/lib/client/auth';
import { RequestParams } from 'common/types/http';

const xhrPollingTransportInitializerFactory = (superclass: CometTransportClass) => {
  var shortName = 'xhr_polling';
  class XHRPollingTransport extends superclass {
    shortName = shortName;
    constructor(connectionManager: IConnectionManager, auth: Auth, params: ITransportParams) {
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

  return function initialiseTransport(connectionManager: any): typeof XHRPollingTransport {
    if (XHRPollingTransport.isAvailable()) connectionManager.supportedTransports[shortName] = XHRPollingTransport;

    return XHRPollingTransport;
  };
};

export default xhrPollingTransportInitializerFactory;
