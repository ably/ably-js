"use strict";

var fs = require('fs'),
    path = require('path'),
    shell = require('shelljs');

module.exports = function (grunt) {
  var spec = grunt.option('spec');

  // See https://github.com/jasmine/jasmine-npm/issues/29
  // We need to load the helpers manually
  function getHelpers() {
    var files = fs.readdirSync(path.resolve(__dirname, '../support/'));
    return files.filter(function(name) {
      return name.match(/_helper\.js$/);
    }).map(function(name) {
      var fullPath = path.join(path.dirname(fs.realpathSync(__filename)), '..', 'support', name);
      return path.relative(process.cwd(), fullPath);
    });
  }

  function resolveSpecs(specString) {
    return specString.split(',').map(function(spec) {
      var fullPath = path.join(process.cwd(), spec);
      return path.relative(process.cwd(), fullPath);
    });
  }

  grunt.registerTask('jasmine',
    'Run the Jasmine test suite.\nOptions\n  --spec [specs] e.g. --spec spec/rest/auth.spec.js,spec/rest/messages.spec.js',
    function() {
      var runSpecs = '';
      grunt.log.writeln("Running Jasmine test suite against " + (spec ? spec : 'all specs'));

      if (spec) {
        runSpecs = getHelpers().concat(resolveSpecs(spec)).join(' ');
      }

      if (shell.exec('node_modules/jasmine/bin/jasmine.js ' + runSpecs).code !== 0) {
        grunt.log.error("Browser tests failed!");
        shell.exit(1);
      } else {
        grunt.log.ok("Browser tests passed");
      }
    });
};
