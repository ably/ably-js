'use strict';
function promisifyOptions(options) {
  if (typeof options == 'string') {
    options = options.indexOf(':') == -1 ? { token: options } : { key: options };
  }
  options.promises = true;
  return options;
}

/* Please note that the file imported below is only generated after running
 * the build task. */
// eslint-disable-next-line @typescript-eslint/no-var-requires
var Ably = require('./build/ably-node');

var ErrorInfo = function(message, code, statusCode, cause) {
  return new Ably.ErrorInfo(message, code, statusCode, cause);
}

var RestPromise = function (options) {
  return new Ably.Rest(promisifyOptions(options));
};
Object.assign(RestPromise, Ably.Rest);

var RealtimePromise = function (options) {
  return new Ably.Realtime(promisifyOptions(options));
};
Object.assign(RealtimePromise, Ably.Realtime);

module.exports = {
  ErrorInfo: ErrorInfo,
  Rest: RestPromise,
  Realtime: RealtimePromise,
};
