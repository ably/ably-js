"use strict";

var inspect = function(object) { return JSON.stringify(object); };

var fail = function(error, message, asyncDone) {
  console.error("Error! " + util.inspect(error));
  if (error.stack) { console.error(error.stack); }
  if (message) { console.error(message); }
  assert(false, "Spec failed");
};

if (isBrowser) {
  window.fail = fail;
} else {
  global.fail = fail;

  var util = require('util');
  inspect = util.inspect;
}
