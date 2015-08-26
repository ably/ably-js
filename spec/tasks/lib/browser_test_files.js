"use strict";

var path = require('path'),
		glob = require('glob');

module.exports = function () {
	// Clear the Require cache for live updates of the Karma conf
	for (var cacheKey in require.cache) {
		if (/karma\.conf/.test(cacheKey)) {
			delete require.cache[cacheKey];
		}
	}

	var requireFiles = {},
			karmaConfigModule = require('../../../karma.conf.js');

	var config = {
		set: function(karmaConf) {
			karmaConf.files.forEach(function(fileSpec) {
				var pattern = fileSpec.pattern;

				if ((fileSpec.included === false) && pattern) {
					glob.sync(path.resolve(__dirname, '../../..', pattern)).forEach(function(file) {
						requireFiles[path.relative(path.resolve(__dirname, '../../..'), file)] = true;
					});
				}
			});
		}
	};

	karmaConfigModule(config);

	return requireFiles;
};
