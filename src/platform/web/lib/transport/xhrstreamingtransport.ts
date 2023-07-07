import * as Utils from '../../../../common/lib/util/utils';
import CometTransport from '../../../../common/lib/transport/comettransport';
import Platform from '../../../../common/platform';
import XHRRequest from './xhrrequest';

var XHRStreamingTransport = function (connectionManager) {
  var shortName = 'xhr_streaming';

  /* public constructor */
  function XHRStreamingTransport(connectionManager, auth, params) {
    CometTransport.call(this, connectionManager, auth, params);
    this.shortName = shortName;
  }
  Utils.inherits(XHRStreamingTransport, CometTransport);

  XHRStreamingTransport.isAvailable = function () {
    return Platform.Config.xhrSupported && Platform.Config.streamingSupported && Platform.Config.allowComet;
  };

  XHRStreamingTransport.prototype.toString = function () {
    return 'XHRStreamingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
  };

  XHRStreamingTransport.prototype.createRequest = function (uri, headers, params, body, requestMode) {
    return XHRRequest.createRequest(uri, headers, params, body, requestMode, this.timeouts);
  };

  if (typeof connectionManager !== 'undefined' && XHRStreamingTransport.isAvailable()) {
    connectionManager.supportedTransports[shortName] = XHRStreamingTransport;
  }

  return XHRStreamingTransport;
};

export default XHRStreamingTransport;
