"use strict";

var allTestFiles = [],
    TEST_REGEXP = /\.test\.js$/i,
    TEAR_DOWN_REGEXP = /tear_down\.js$/i;

var pathToModule = function(path) {
  return path.replace(/^\/base\//, '').replace(/\.js$/, '');
};

// Match all test files
Object.keys(window.__karma__.files).forEach(function(file) {
  if (TEST_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    allTestFiles.push(pathToModule(file));
  }
});

// Add the final tear down
Object.keys(window.__karma__.files).forEach(function(file) {
  if (TEAR_DOWN_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    allTestFiles.push(pathToModule(file));
  }
});

var baseUrl = window.__karma__.base || '/base';

require([(baseUrl + '/spec/common/globals/named_dependencies.js').replace('//','/')], function(modules) {
  var requireJsPaths = {};
  for (var key in modules) {
    if (modules.hasOwnProperty(key)) {
      requireJsPaths[key] = modules[key].jasmine;
    }
  }

  require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: baseUrl,

    // Ensure changes to these modules are reflected in node_helper.js
    paths: requireJsPaths,

    // The following requireJS depdendencies are not requireJS compatible but instead pollute the global namespace
    // It is better therefore to grab the global object and provide that to requireJS dependency management
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

    // we have to kickoff jasmine with Karma
    callback: function() {
      require(allTestFiles, function() {
        var testModules = {};
        for (var i = 0; i < allTestFiles.length; i++) {
          testModules[allTestFiles[i]] = arguments[i];
        }
        nodeunit.run(testModules);
        if (window.__karma__.start) { window.__karma__.start(); }
      });
    }
  });
});
