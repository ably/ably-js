import * as Utils from '../../../../common/lib/util/utils';
import ErrorInfo from '../../../../common/lib/types/errorinfo';
import Logger from '../../../../common/lib/util/logger';
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

  XHRPollingTransport.tryConnect = function (connectionManager, auth, params, callback) {
    var transport = new XHRPollingTransport(connectionManager, auth, params);

    var transportAttemptTimer;
    var errorCb = function (err) {
      clearTimeout(transportAttemptTimer);
      callback({ event: this.event, error: err });
    };

    var realtimeRequestTimeout = connectionManager.options.timeouts.realtimeRequestTimeout;
    transportAttemptTimer = setTimeout(function () {
      transport.off(['preconnect', 'disconnected', 'failed']);
      transport.dispose();
      errorCb.call(
        { event: 'disconnected' },
        new ErrorInfo('Timeout waiting for transport to indicate itself viable', 50000, 500)
      );
    }, realtimeRequestTimeout);

    transport.on(['failed', 'disconnected'], errorCb);
    transport.on('preconnect', function () {
      Logger.logAction(Logger.LOG_MINOR, 'XHRPollingTransport.tryConnect()', 'viable transport ' + transport);
      clearTimeout(transportAttemptTimer);
      transport.off(['failed', 'disconnected'], errorCb);
      callback(null, transport);
    });
    transport.connect();
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
