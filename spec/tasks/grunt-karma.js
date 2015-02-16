"use strict";

module.exports = function (grunt) {
  function browsersFromArgument(browserArg) {
    var defaultBrowser = 'PhantomJS';
    if (!browserArg || browserArg == 'undefined') {
      browserArg = defaultBrowser;
    }
    return browserArg.split(',').map(function(browser) {
      if (browser.toLowerCase() == 'phantomjs') {
        return 'PhantomJS_without_security';
      } else {
        return browser;
      }
    });
  }

  grunt.registerTask('karma', 'Start a Karma server and run the browser test suite.  Optionally specify browser(s) e.g. `grunt karma:Chrome,PhantomJS`', function(browsersArg) {
    var shell = require('shelljs');
    var browsers = browsersFromArgument(browsersArg);

    grunt.log.writeln("Running Karma tests against the following browsers: " + browsers.join(','));
    if (shell.exec('karma start --browsers ' + browsers.join(',') + ' --single-run').code !== 0) {
      grunt.log.error("Browser tests failed!");
      shell.exit(1);
    } else {
      grunt.log.ok("Browser tests passed");
    }
  });

  grunt.registerTask('karma:server', 'Start a Karma server.  Optionally specify browser(s) e.g. `grunt karma:server:Chrome,PhantomJS`', function(browsersArg) {
    var shell = require('shelljs');
    var browsers = browsersFromArgument(browsersArg);

    grunt.log.writeln("Starting Karma server with the following browsers: " + browsers.join(','));
    shell.exit(shell.exec('karma start --browsers ' + browsers.join(',')).code);
  });

  grunt.registerTask('karma:run', 'run the Karma test runner.  Assumes a Karma server is running', function() {
    var shell = require('shelljs');
    grunt.log.writeln("Running Karma test runner");
    if (shell.exec('karma run').code !== 0) {
      grunt.log.error("Browser tests failed!");
      shell.exit(1);
    } else {
      grunt.log.ok("Browser tests passed");
    }
  });
};
