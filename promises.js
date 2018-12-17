"use strict";
function promisifyOptions(options) {
  if(typeof options == 'string') {
    options = (options.indexOf(':') == -1) ? {token: options} : {key: options};
  }
  options.promises = true;
  return options;
}

var Ably = require('./nodejs/index');

var RestPromise = function(options) {
  return new Ably.Rest(promisifyOptions(options));
}
Object.assign(RestPromise, Ably.Rest);

var RealtimePromise = function(options) {
  return new Ably.Realtime(promisifyOptions(options));
}
Object.assign(RealtimePromise, Ably.Realtime);

module.exports = {
  Rest: RestPromise,
  Realtime: RealtimePromise
};
