"use strict";

var inspect = function(object) { return JSON.stringify(object); };

var fail = function(error) {
  console.error("Failure error: " + inspect(error));
  if (error.stack) { console.error(error.stack); }
  jasmine.getEnv().fail({ message: error.message || error, stack: error.stack || '' });
  if (typeof(jasmine.getEnv().done) === 'function') { jasmine.getEnv().done(); }
};

if (isBrowser) {
  window.fail = fail;

  var oldOnError = window.onerror;
  window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
    fail(new Error(errorMsg, url, lineNumber));
    if (typeof(oldOnError) === 'function') { oldOnError(errorMsg, url, lineNumber); }
    return false;
  };
} else {
  global.fail = fail;

  var util = require('util');
  inspect = util.inspect;

  process.on('uncaughtException', function(err) {
    fail(err);
  });
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
