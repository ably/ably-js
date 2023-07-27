import { ICometTransportConstructor } from '../../../../common/lib/transport/comettransport';
import Platform from '../../../../common/platform';
import XHRRequest from './xhrrequest';
import { IConnectionManager, ITransportParams } from 'common/lib/transport/connectionmanager';
import Auth from 'common/lib/client/auth';
import { RequestParams } from 'common/types/http';

const xhrStreamingTransportInitializerFactory = (superclass: ICometTransportConstructor) => {
  const shortName = 'xhr_streaming';
  class XHRStreamingTransport extends superclass {
    shortName = shortName;
    constructor(connectionManager: IConnectionManager, auth: Auth, params: ITransportParams) {
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

  return function initialiseTransport(connectionManager: any): typeof XHRStreamingTransport {
    if (XHRStreamingTransport.isAvailable()) connectionManager.supportedTransports[shortName] = XHRStreamingTransport;

    return XHRStreamingTransport;
  };
};

export default xhrStreamingTransportInitializerFactory;
