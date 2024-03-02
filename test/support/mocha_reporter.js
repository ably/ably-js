const Mocha = require('mocha');
const MochaJUnitReporter = require('mocha-junit-reporter');
const path = require('path');
const jUnitDirectoryPath = require('./junit_directory_path');

/**
 * Logs test results to the console (by extending the default `Spec` reporter) and also emits a JUnit XML file.
 */
class Reporter extends Mocha.reporters.Spec {
  jUnitReporter;

  constructor(runner, options) {
    super(runner, options);
    const jUnitFileName = `node-${process.version.split('.')[0]}.junit`;
    const jUnitFilePath = path.join(jUnitDirectoryPath, jUnitFileName);
    this.jUnitReporter = new MochaJUnitReporter(runner, { reporterOptions: { mochaFile: jUnitFilePath } });
  }
}

module.exports = Reporter;
