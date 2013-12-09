"use strict";
var base = require('./common');
var path = require('path');
var vm = require('vm');
var fs = require('fs');
var _exports = {};

var filename = path.resolve(__dirname, 'common/secure-message.js');
eval(fs.readFileSync(filename, 'utf8'));
