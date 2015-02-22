"use strict";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

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

/* Provide a fail() method that works in an async context */
var fail = function(error) {
  console.error("Failure error: " + inspect(error));
  if (error.stack) { console.error(error.stack); }
  jasmine.getEnv().fail({ message: error.message || error, stack: error.stack || '' });
  if (typeof(jasmine.getEnv().done) === 'function') { jasmine.getEnv().done(); }
};
globalObject.fail = fail;

/* Catch any uncaught exceptions and fail the current test.  Works for async tests as well */
if (isBrowser) {
  var oldOnError = window.onerror;
  window.onerror = function myErrorHandler(errorMsg, url, lineNumber, column, errorObj) {
    if (errorObj) {
      fail(errorObj);
    } else {
      fail(new Error(errorMsg, url, lineNumber));
    }
    if (typeof(oldOnError) === 'function') { oldOnError(errorMsg, url, lineNumber, column, errorObj); }
    return false;
  };
} else {
  process.on('uncaughtException', function(err) {
    fail(err);
  });
}

/*
  Wrap the assert & expect global test assertion function so that they
  always fail the current test on failure.
  For async tests, this is imperative to ensure that a callback that raises an
  assert failure but is swallowed by the caller of the callback will fail the
  currently running test with a meaningful error
*/

globalObject.catchAssertExceptions = function(assertObjectName) {
  var assertObject = globalObject[assertObjectName];

  var catchAndFailFunction = function(fn, oldMethod) {
    return function() {
      try {
        return oldMethod.apply(assertObject, arguments);
      } catch (exception) {
        fail(exception);
        throw exception;
      }
    };
  };

  /* Wrap all assert.function objects in a try / catch that will fail the current test */
  for (var fn in assertObject) {
    if (assertObject.hasOwnProperty(fn)) {
      if (typeof(assertObject[fn]) === 'function') {
        assertObject[fn] = catchAndFailFunction(fn, assertObject[fn]);
      }
    }
  }

  /* If the assert object is a function as well, wrap it and proxy all methods */
  if (typeof(assertObject) === 'function') {
    var target = catchAndFailFunction(assertObjectName, globalObject[assertObjectName]);
    for (var attr in assertObject) {
      target[attr] = assertObject[attr];
    }
    globalObject[assertObjectName] = target;
  }
};
catchAssertExceptions('assert');
