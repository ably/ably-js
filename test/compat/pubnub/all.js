"use strict";
var base = require('./common');
var displayError = base.displayError;

var _exports = {};

exports.setup0 = base.setupTest;
exports.general = require('./general');
exports.message = require('./message');
exports.history = require('./history');
exports.presence = require('./presence');
exports.clear99 = base.clearTest;

exports.setupSecure0 = base.setupTestSecure;
exports.secure_message = require('./secure-message');
exports.secure_history = require('./secure-history');
exports.secure_presence = require('./secure-presence');
exports.clearSecure99 = base.clearTest;
