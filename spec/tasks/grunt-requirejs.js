"use strict";

var fs = require('fs'),
    path = require('path'),
    glob = require('glob'),
    karmaConfigModule = require('../../karma.conf.js');

module.exports = function (grunt) {
  var requireFiles = {};

  var config = {
    set: function(karmaConf) {
      karmaConf.files.forEach(function(fileSpec) {
        var pattern = fileSpec.pattern;

        if ((fileSpec.included === false) && pattern) {
          glob.sync(path.resolve(__dirname, '../..', pattern)).forEach(function(file) {
            requireFiles[path.relative(path.resolve(__dirname, '../..'), file)] = true;
          });
        }
      });
    }
  };

  karmaConfigModule(config);

  grunt.registerTask('requirejs',
    'Write out the RequireJS dependencies to the grunt-html-runner.js config file',
    function() {
      var body = "window.__karma__ = { base: '../' };\n";
      body += "window.__karma__.files = " + JSON.stringify(requireFiles) + ";"
      fs.writeFileSync(path.resolve(__dirname, '../support', 'browser_file_list.js'), body);
    });
};
