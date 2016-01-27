"use strict";

define(['shared_helper'], function(helper) {
	var exports = {};

	var isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document);

	/* If we are running node, we mimic the loading mechanism used in /nodejs/realtime.js and /nodejs/rest.js
	 * to get a reference to the logger. We do this because its implementation is not a module.
	 * 
	 * If we are in a browser, the logger is already loaded manually via a script tag in nodeunit.html.
	 */

	var logger;
	
	if (isBrowser) {
		logger = Logger;
	} else {

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

		var
			includeScript = function(name) {
				var filename = path.resolve(__dirname, name);
				return vm.runInContext(fs.readFileSync(filename, 'utf8'), context, filename);
			};

		includeScript('../../common/lib/util/logger.js');

		logger = context.Logger;
	};
	
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
		test.expect(2);

		// TODO check to see what can be done for IE

		var
			oldLog = console.log,
			messageOut = '';

		console.log = function() {
			// TODO check to see if can safely use slice
			var args = Array.prototype.slice.call(arguments);
			messageOut += args.join(' ') + "\n";
		};
		
		test.doesNotThrow(function() {
			logger.logAction(logger.LOG_NONE,'logger_writes_to_stdout()','test message');
		},'logger does not throw when called');

		test.ok(messageOut.indexOf('test message') >= 0, 'Logger writes to stdout');

		console.log = oldLog;

		test.done();
	}

	/*
	 * Check that a custom logger can be used. Check that the default logging level is logger.MAJOR.
	 */
	exports.logger_level_defaults_to_warn = function(test) {
		test.expect(4);
		
		var messageOut = '',
		customLogger = function(message) {
			messageOut += message + "\n";
		};
		logger.setLog(undefined, customLogger);
		
		logger.logAction(logger.LOG_ERROR, 'Error level message');
		logger.logAction(logger.LOG_MAJOR, 'Major level message');
		logger.logAction(logger.LOG_MINOR, 'Minor level message');
		logger.logAction(logger.LOG_MICRO, 'Micro level message');

		test.ok(messageOut.indexOf('Error level message') >= 0, 'Logger writes at level ERROR by default');
		test.ok(messageOut.indexOf('Major level message') >= 0, 'Logger writes at level MAJOR by default');
		test.ok(messageOut.indexOf('Minor level message') < 0, 'Logger does not write at lever MINOR by default');
		test.ok(messageOut.indexOf('Micro level message') < 0, 'Logger does not write at level MICRO by default');

		test.done();
	}

	/*
	 * Check that the logging level can be changed.
	 */
	exports.logger_level_change = function(test) {
		test.expect(4);

		var messageOut = '',
		customLogger = function(message) {
			messageOut += message + "\n";
		};
		logger.setLog(logger.LOG_MICRO, customLogger);
		
		logger.logAction(logger.LOG_ERROR, 'Error level message');
		logger.logAction(logger.LOG_MAJOR, 'Major level message');
		logger.logAction(logger.LOG_MINOR, 'Minor level message');
		logger.logAction(logger.LOG_MICRO, 'Micro level message');

		test.ok(messageOut.indexOf('Error level message') >= 0, 'Logger writes at level ERROR by default');
		test.ok(messageOut.indexOf('Major level message') >= 0, 'Logger writes at level MAJOR by default');
		test.ok(messageOut.indexOf('Minor level message') >= 0, 'Logger does not write at lever MINOR by default');
		test.ok(messageOut.indexOf('Micro level message') >= 0, 'Logger does not write at level MICRO by default');

		test.done();
	}

	return module.exports = helper.withTimeout(exports);
});
