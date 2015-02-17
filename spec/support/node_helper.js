__ABLY__ = require('./globals.js.env').__ABLY__;
__ABLY__.MODULES = require('./modules.js').MODULES;

define = function(requireModules, callback) {
  var required = requireModules.map(function (moduleName) {
    var modulePath = (__ABLY__.MODULES[moduleName] || {}).node;

    if (modulePath === 'skip') { return; }
    if (!modulePath) { console.error("Module " + moduleName + " is not a configured Node module"); }

    return require("../../" + modulePath);
  });

  callback.apply(this, required);
}

var reporters = require('jasmine-reporters');
jasmine.getEnv().addReporter(new reporters.TerminalReporter({ verbosity: 3, color: true }));

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
