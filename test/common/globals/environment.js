/* Assumes process.env defined, or window.__env__ or populated via globals.env.js and karam-env-preprocessor plugin */

define(function (require) {
  var defaultLogLevel = 4,
    environment = isBrowser ? window.__env__ || {} : process.env,
    ablyEndpoint = environment.ABLY_ENDPOINT || 'nonprod:sandbox',
    port = environment.ABLY_PORT || 80,
    tlsPort = environment.ABLY_TLS_PORT || 443,
    tls = 'ABLY_USE_TLS' in environment ? environment.ABLY_USE_TLS.toLowerCase() !== 'false' : true,
    logLevel = environment.ABLY_LOG_LEVEL || defaultLogLevel;

  let logLevelSet = environment.ABLY_LOG_LEVEL !== undefined;

  if (isBrowser) {
    var url = window.location.href,
      keysValues = url.split(/[\?&]+/),
      query = {};

    for (i = 0; i < keysValues.length; i++) {
      var keyValue = keysValues[i].split('=');
      query[keyValue[0]] = keyValue[1];
    }

    if (query['endpoint']) ablyEndpoint = query['endpoint'];
    if (query['port']) port = query['port'];
    if (query['tls_port']) tlsPort = query['tls_port'];
    if (query['tls']) tls = query['tls'].toLowerCase() !== 'false';
    if (query['log_level']) {
      logLevel = Number(query['log_level']);
      logLevelSet = true;
    }
  } else if (process) {
    process.on('uncaughtException', function (err) {
      console.error(err.stack);
    });
  }

  function getLogTimestamp() {
    const time = new Date();
    return (
      time.getHours().toString().padStart(2, '0') +
      ':' +
      time.getMinutes().toString().padStart(2, '0') +
      ':' +
      time.getSeconds().toString().padStart(2, '0') +
      '.' +
      time.getMilliseconds().toString().padStart(3, '0')
    );
  }

  let clientLogs = [];

  function getLogs() {
    return clientLogs;
  }

  function flushLogs() {
    clientLogs = [];
  }

  return (module.exports = {
    endpoint: ablyEndpoint,
    port: port,
    tlsPort: tlsPort,
    tls: tls,
    logLevel: logLevel,
    getLogs,
    flushLogs,

    logHandler: function (msg) {
      if (logLevelSet) {
        console.log(getLogTimestamp(), msg);
      } else {
        clientLogs.push([getLogTimestamp(), msg]);
      }
    },
  });
});
