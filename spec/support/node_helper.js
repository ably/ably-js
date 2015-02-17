var reporters = require('jasmine-reporters');
jasmine.getEnv().addReporter(new reporters.TerminalReporter({ verbosity: 3, color: true }));

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
