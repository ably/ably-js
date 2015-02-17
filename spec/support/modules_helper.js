"use strict";

/*
  Modules helper
  --------------

  RequireJS is used within browser tests to manage dependency loading.
  Node.js CommonJS is used within Node.js Jasmine tests, however the RequireJS syntax is not
    supported so this library provides compatibility with RequiredJS

  Exports
  -------

  For browsers, RequireJS convention is used returning the exported methods.
  For Node.js,  public methods are exported using module.exports

  To export for both Node.js & Browser use the follwing at the end of your modules:
    return modules.exports = yourObject;
*/

var isBrowser = (typeof(window) == 'object');
if (isBrowser) {
  window.module = {};
  window.isBrowser = true;
} else {
  global.isBrowser = false;

  // Simulate the dependency injection from RequireJS in Node.js
  global.define = function(requireModules, callback) {
    if (typeof(requireModules) === 'function') {
      // no dependencies were provided, just call the provided callback
      requireModules.apply(this, require);
    } else {
      var namedDependencies = require('../common/globals/named_dependencies');

      var required = requireModules.map(function (module) {
        var modulePath = (namedDependencies[module] || {}).node;
        if (modulePath === 'skip') { return; }
        return require("../../" + (modulePath || module));
      });

      callback.apply(this, required);
    }
  };
}
