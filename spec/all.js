"use strict";

var fs = require('fs'),
	path = require('path'),
	specDir = __dirname;

require('./support/modules_helper');
require('./support/test_helper');

function findAll(dir, pattern) {
	var searchDir = path.resolve(specDir, dir),
		result = {};

	fs.readdirSync(searchDir).filter(function (file) {
		return pattern.test(file);
	}).forEach(function(file) {
		result[file.match(pattern)[1]] = require(path.resolve(searchDir, file));
	});

	return result;
}

exports.rest = findAll('rest', /(\w+)\.test\.js/);
exports.realtime = findAll('realtime', /(\w+)\.test\.js/);

exports.tear_down = require('./support/tear_down');
