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

var requireJsPaths = {};
for (var key in __ABLY__.MODULES) {
  if (__ABLY__.MODULES.hasOwnProperty(key)) {
    requireJsPaths[key] = __ABLY__.MODULES[key].jasmine;
  }
}

require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  // Ensure changes to these modules are reflected in node_helper.js
  paths: requireJsPaths,

  shim: {
    'ably': {
      exports: 'Ably'
    },
    'ably.noencryption': {
      exports: 'Ably'
    },
    'browser-base64': {
      exports: 'Base64'
    }
  },

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
    window.__karma__.start();
  }
});
