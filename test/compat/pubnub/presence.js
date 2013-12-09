"use strict";
var base = require('./common');
var path = require('path');
var vm = require('vm');
var fs = require('fs');
var _exports = {};

var filename = path.resolve(__dirname, 'common/presence.js');
eval(fs.readFileSync(filename, 'utf8'));
