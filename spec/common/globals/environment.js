/* Assumes process.env defined, or window.__env__ or populated via globals.env.js and karam-env-preprocessor plugin */

define(function(require) {
  var environment = (isBrowser ? window.__env__ : process.env) || {};

  function queryStr(Key) {
    var url = window.location.href;
    KeysValues = url.split(/[\?&]+/);
    for (i = 0; i < KeysValues.length; i++) {
        KeyValue = KeysValues[i].split("=");
        if (KeyValue[0] == Key) {
            return KeyValue[1];
        }
    }
  }

  var ablyEnvironment = environment.ABLY_ENV || 'sandbox';
  if (isBrowser && queryStr('env')) {
    ablyEnvironment = queryStr('env');
  }

  return module.exports = {
    environment:  ablyEnvironment,
    realtimeHost: environment.ABLY_REALTIME_HOST,
    restHost:     environment.ABLY_REST_HOST,
    port:         environment.ABLY_PORT || 80,
    tlsPort:      environment.ABLY_TLS_PORT || 443,
    useTls:       String(environment.ABLY_USE_TLS).toLowerCase() === 'false' ? false : true
  };
});
