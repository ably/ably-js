"use strict";
var base = require('./common/common').setup();
var _exports = {};

exports.setup0 = base.setupTest;

exports.init = require('./init');
exports.ws = require('./ws');
exports.comet = require('./comet');
exports.auth = require('./auth');
exports.channel = require('./channel');
exports.upgrade = require('./upgrade');
exports.message = require('./message');
exports.presence = require('./presence');
exports.resume = require('./resume');
exports.crypto = require('./crypto');

exports.clear99 = base.clearTest;
