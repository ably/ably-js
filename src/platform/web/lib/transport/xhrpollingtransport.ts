import * as Utils from '../../../../common/lib/util/utils';
import Platform from '../../../../common/platform';
import CometTransport from '../../../../common/lib/transport/comettransport';
import XHRRequest from './xhrrequest';

var XHRPollingTransport = function (connectionManager) {
  var shortName = 'xhr_polling';

  function XHRPollingTransport(connectionManager, auth, params) {
    params.stream = false;
    CometTransport.call(this, connectionManager, auth, params);
    this.shortName = shortName;
  }
  Utils.inherits(XHRPollingTransport, CometTransport);

  XHRPollingTransport.isAvailable = function () {
    return Platform.Config.xhrSupported && Platform.Config.allowComet;
  };

  XHRPollingTransport.prototype.toString = function () {
    return 'XHRPollingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
  };

  XHRPollingTransport.prototype.createRequest = function (uri, headers, params, body, requestMode) {
    return XHRRequest.createRequest(uri, headers, params, body, requestMode, this.timeouts);
  };

  if (typeof connectionManager !== 'undefined' && XHRPollingTransport.isAvailable()) {
    connectionManager.supportedTransports[shortName] = XHRPollingTransport;
  }

  return XHRPollingTransport;
};

export default XHRPollingTransport;
