"use strict";

define(['shared_helper'], function(helper) {
	var exports = {};

	var isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document);

	/* If we are running node, we mimic the loading mechanism used in /nodejs/realtime.js and /nodejs/rest.js
	 * to get a reference to the logger. We do this because its implementation is not a module.
	 * 
	 * If we are in a browser, the logger is already loaded manually via a script tag in nodeunit.html.
	 */

	var logger = isBrowser ? Logger : (function() {

		var
			fs   = require('fs'),
			path = require('path'),
			vm   = require('vm');

		var context = vm.createContext({
			require:require,
			console:console,
			process:process,
			Buffer:Buffer,
			setTimeout:setTimeout,
			setInterval:setInterval,
			clearTimeout:clearTimeout,
			clearInterval:clearInterval,
			global:global
		});

		var includeScript = function(name) {
			var filename = path.resolve(__dirname, name);
			return vm.runInContext(fs.readFileSync(filename, 'utf8'), context, filename);
		};

		includeScript('../../common/lib/util/logger.js');

		return context.logger;
	})();
	
	/*
	 * Check that the logger was instantiated correctly for testing.
	 */
	exports.logger_instantiate = function(test) {
		test.expect(1);

		test.equal(typeof(logger), 'function', 'Logger has been instantiated');

		test.done();
	};

	/*
	 * Check that the logger writes to stdout by default with no errors.
	 */
	exports.logger_writes_to_stdout = function(test) {
		test.expect(1);

		test.doesNotThrow(function() {
			logger.logAction(logger.LOG_NONE,'logger_writes_to_stdout()','test message');
		},'logger does not throw when called');

		test.done();
	}

	/*
	 * Check that the default logging level is logger.MAJOR.
	 */
	exports.logger_level_defaults_to_warn = function(test) {
		test.expect(2);
		
		test.equal(true, logger.shouldLog(logger.LOG_MAJOR), 'Logger writes at level MAJOR by default');
		test.equal(false,logger.shouldLog(logger.LOG_MINOR), 'Logger does not write at lever MINOR by default');

		test.done();
	}

	/*
	 * Check that the logging level can be changed.
	 */
	exports.logger_level_change = function(test) {
		test.expect(3);
		
		logger.setLog(logger.LOG_MICRO);
		test.equal(true, logger.shouldLog(logger.LOG_MICRO), 'Logger writes at level MICRO when set to MICRO');
		logger.setLog(logger.LOG_MINOR);
		test.equal(false, logger.shouldLog(logger.LOG_MICRO), 'Logger does not write at level MICRO when set to MINOR');
		test.equal(true, logger.shouldLog(logger.LOG_MINOR), 'Logger writes at level MINOR when set to MINOR');

		test.done();
	}
	
	/*
	 * Check that a custom logger can be used.
	 */
	exports.logger_custom = function(test) {
		test.expect(1);
		
		var lastMessage = null,
		customlogger = function(message) {
			lastMessage = message;
		},
		action = 'logger_custom',
		message = 'test message';

		logger.setLog( logger.LOG_NONE, customlogger );
		logger.logAction(logger.LOG_NONE, action, message);
		test.equal('Ably: ' + action + ': ' + message, lastMessage, 'Logger writes correctly to custom logger');

		test.done();
	}

	return module.exports = helper.withTimeout(exports);
});
