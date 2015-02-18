var reporters = require('jasmine-reporters');
jasmine.getEnv().addReporter(new reporters.TerminalReporter({ verbosity: 3, color: true }));

var chai = require('chai');
global.assert = chai.assert;
