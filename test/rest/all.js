"use strict";
var base = require('./common/common').setup();
var _exports = {};

exports.setup0 = base.setupTest;

exports.time = require('./time');
exports.auth = require('./auth');
exports.capability = require('./capability');
exports.history = require('./history');
exports.stats = require('./stats');

exports.clear99 = base.clearTest;
