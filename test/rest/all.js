"use strict";
var base = require('./common/common').setup();
var _exports = {};

exports.setup0 = base.setupTest;

exports.time = require('./time');
exports.auth = require('./auth');
exports.capability = require('./capability');
exports.stats = require('./stats');
exports.history = require('./history');

exports.clear99 = base.clearTest;
