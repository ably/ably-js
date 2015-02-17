var reporters = require('jasmine-reporters');
jasmine.getEnv().addReporter(new reporters.TerminalReporter({ verbosity: 3, color: true }));

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

var chai = require('chai');
global.assert = chai.assert;

var util = require('util');
global.fail = function(error, message) {
  console.error("Error! " + util.inspect(error));
  if (error.stack) { console.error(error.stack); }
  if (message) { console.error(message); };
  assert.notOk(true, 'failed');
}
