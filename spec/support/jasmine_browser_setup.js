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

var baseUrl = window.__karma__.base || '/base';

require([baseUrl + '/spec/common/globals/named_dependencies.js'], function(modules) {
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
      if (typeof(window.__karma__.start) === 'function') {
        window.__karma__.start();
      } else {
        // load Chai
        require(['../node_modules/chai/chai.js'], function() {
          // then require it with the name it has used to register itself
          require(['chai'], function(chai) {
            window.assert = chai.assert;
            catchAssertExceptions('assert');

            require(allTestFiles, function() {
              var env = jasmine.getEnv();

              var queryString = new jasmine.QueryString({
                getWindowLocation: function() { return window.location; }
              });

              var htmlReporter = new jasmine.HtmlReporter({
                env: env,
                onRaiseExceptionsClick: function() { queryString.navigateWithNewParam("catch", !env.catchingExceptions()); },
                addToExistingQueryString: function(key, value) { return queryString.fullStringWithNewParam(key, value); },
                getContainer: function() { return document.body; },
                createElement: function() { return document.createElement.apply(document, arguments); },
                createTextNode: function() { return document.createTextNode.apply(document, arguments); },
                timer: new jasmine.Timer()
              });

              env.addReporter(htmlReporter);
              htmlReporter.initialize();
              env.execute();
            });
          });
        });
      }
    }
  });
});
