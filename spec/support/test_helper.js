"use strict";

var globalObject;
if (isBrowser) {
  globalObject = window;
} else {
  globalObject = global;
}

/* Provide a global inspect() method, useful for debugging object properties */
if (isBrowser) {
  window.inspect = function(object) { return JSON.stringify(object); };
} else {
  var util = require('util');
  global.inspect = util.inspect;
}
