"use strict";

var path = require('path'),
    shell = require('shelljs');

module.exports = function (grunt) {
  var karmaPath = 'node_modules/karma/bin/karma ',
      spec = grunt.option('spec');

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

  function getSpecArguments(specString) {
    if (!specString) { return '' };

    grunt.log.error("Karma does not yet support running specific tests, see https://github.com/karma-runner/karma/issues/553");
    grunt.log.error("To run a single test prefix the describe or it block with f, such as fdescribe");
    grunt.log.error("See http://jasmine.github.io/2.2/focused_specs.html");
    process.exit();

    return ' -- ' + specString.split(',').map(function(spec) {
      var fullPath = path.join(process.cwd(), spec);
      return path.relative(process.cwd(), fullPath);
    }).join(' ');
  }

  grunt.registerTask('karma', 'Start a Karma server and run the browser test suite.  Optionally specify browser(s) e.g. `grunt karma:Chrome,PhantomJS`', function(browsersArg) {
    var browsers = browsersFromArgument(browsersArg);

    grunt.log.writeln("Running Karma tests using browsers '" + browsers.join(',') + "' against " + (spec ? spec : 'all specs'));

    if (shell.exec(karmaPath + 'start --browsers ' + browsers.join(',') + ' --single-run' + getSpecArguments(spec)).code !== 0) {
      grunt.log.error("Browser tests failed!");
      shell.exit(1);
    } else {
      grunt.log.ok("Browser tests passed");
    }
  });

  grunt.registerTask('karma:server', 'Start a Karma server.  Optionally specify browser(s) e.g. `grunt karma:server:Chrome,PhantomJS`', function(browsersArg) {
    var browsers = browsersFromArgument(browsersArg);

    grunt.log.writeln("Starting Karma server with the following browsers: " + browsers.join(','));
    shell.exit(shell.exec(karmaPath + 'start --browsers ' + browsers.join(',')).code);
  });

  grunt.registerTask('karma:run', 'run the Karma test runner.  Assumes a Karma server is running', function() {
    grunt.log.writeln("Running Karma test runner against against " + (spec ? spec : 'all specs'));

    if (shell.exec(karmaPath + 'run' + getSpecArguments(spec)).code !== 0) {
      grunt.log.error("Browser tests failed!");
      shell.exit(1);
    } else {
      grunt.log.ok("Browser tests passed");
    }
  });
};
