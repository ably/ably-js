"use strict";

var path = require('path'),
		shell = require('shelljs'),
		kexec = require('kexec');

module.exports = function (grunt) {
	var karmaPath = 'node_modules/karma/bin/karma ',
			spec = grunt.option('spec');

	function browsersFromArgument(browserArg) {
		var defaultBrowser = 'Firefox';

		if (!browserArg || browserArg == 'undefined' || browserArg == 'default') {
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
		if (!specString) { return ''; }

		grunt.log.error("Karma does not yet support running specific tests, see https://github.com/karma-runner/karma/issues/553");
		process.exit();

		return ' -- ' + specString.split(',').map(function(spec) {
			var fullPath = path.join(process.cwd(), spec);
			return path.relative(process.cwd(), fullPath);
		}).join(' ');
	}

	var optionsDescription = '\nOptions:\n  --browsers [browsers] e.g. Chrome,PhantomJS (Firefox is default)';

	grunt.registerTask('karma', 'Start a Karma server and run the browser test suite' + optionsDescription, function(browsersArg) {
		var browsers = browsersFromArgument(browsersArg);

		grunt.log.writeln("Running Karma tests using browsers '" + browsers.join(',') + "' against " + (spec ? spec : 'all specs'));

		var done = this.async();
		shell.exec(karmaPath + 'start --browsers ' + browsers.join(',') + ' --single-run' + getSpecArguments(spec), function(code) {
			if (code !== 0) {
				grunt.log.error("Browser tests failed!");
				shell.exit(1);
			} else {
				grunt.log.ok("Browser tests passed");
			}
			done();
		});
	});

	grunt.registerTask('karma:server', 'Start a Karma server' + optionsDescription, function(browsersArg) {
		var browsers = browsersFromArgument(browsersArg);

		grunt.log.writeln("Starting Karma server with the following browsers: " + browsers.join(','));
		kexec(karmaPath + 'start --browsers ' + browsers.join(','));
	});

	grunt.registerTask('karma:run', 'run the Karma test runner.  Assumes a Karma server is running', function() {
		grunt.log.writeln("Running Karma test runner against against " + (spec ? spec : 'all specs'));

		var done = this.async();
		shell.exec(karmaPath + 'run' + getSpecArguments(spec), function(code) {
			if (code !== 0) {
				grunt.log.error("Browser tests failed!");
				shell.exit(1);
			} else {
				grunt.log.ok("Browser tests passed");
			}
			done();
		});
	});
};
