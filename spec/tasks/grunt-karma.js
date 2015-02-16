"use strict";

module.exports = function (grunt) {
  var defaultBrowser = 'PhantomJS';

  grunt.registerTask('karma', 'Start a Karma server and run the browser test suite.  Optionally specify browser(s) e.g. `grunt karma:Chrome,PhantomJS`', function(browsers) {
    var shell = require('shelljs');

    if (!browsers || browsers == 'undefined') {
      browsers = defaultBrowser;
    }

    grunt.log.writeln("Running Karma tests against the following browsers: " + browsers);
    if (shell.exec('karma start --browsers ' + browsers + ' --single-run').code !== 0) {
      grunt.log.error("Browser tests failed!");
      shell.exit(1);
    } else {
      grunt.log.ok("Browser tests passed");
    }
  });

  grunt.registerTask('karma:server', 'Start a Karma server.  Optionally specify browser(s) e.g. `grunt karma:server:Chrome,PhantomJS`', function(browsers) {
    var shell = require('shelljs');

    if (!browsers) {
      browsers = defaultBrowser;
    }

    grunt.log.writeln("Starting Karma server with the following browsers: " + browsers);
    shell.exit(shell.exec('karma start --browsers ' + browsers).code);
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
