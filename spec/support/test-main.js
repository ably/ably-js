"use strict";

var allTestFiles = [],
    TEST_REGEXP = /(spec|test)\.js$/i;

var pathToModule = function(path) {
  return path.replace(/^\/base\//, '').replace(/\.js$/, '');
};

Object.keys(window.__karma__.files).forEach(function(file) {
  if (TEST_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    allTestFiles.push(pathToModule(file));
  }
});

require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  paths: {
    'ably': 'browser/static/ably',
    'ably.noencryption': 'browser/static/ably.noencryption',
    'compat-pubnub': 'browser/static/compat-pubnub',
    'compat-pusher': 'browser/static/compat-pusher',
    'browser-base64': 'browser/lib/util/base64'
  },

  shim: {
    'browser-base64': {
      exports: 'Base64'
    }
  },

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: function() {
    jasmine.getEnv().defaultTimeoutInterval = 20000;
    window.__karma__.start();
  }
});
