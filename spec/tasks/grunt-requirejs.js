"use strict";

var fs = require('fs'),
		path = require('path'),
		browserTestFiles = require('./lib/browser_test_files');

module.exports = function (grunt) {
	grunt.registerTask('requirejs',
		'Write out the RequireJS dependencies to the grunt-html-runner.js config file',
		function() {
			var body = "window.__karma__ = { base: '../' };\n";
			body += "window.__karma__.files = " + JSON.stringify(browserTestFiles()) + ";"
			fs.writeFileSync(path.resolve(__dirname, '../support', 'browser_file_list.js'), body);
		});
};
