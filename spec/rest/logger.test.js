"use strict";

define(['shared_helper'], function(helper) {

	/* Because the Logger cannot be loaded as a module, we mimic here the loading mechanism
	 * used in /nodejs/realtime.js and /nodejs/rest.js to get a reference to the Logger instance.
	 * If we are in a browser, we just clone the object from the global context to get a "fresh"
	 * instance for isolated testing.
	 */
	
	var isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),

	var fs,path,vm;
	if ((typeof(window) != 'object')) {
		fs   = require('fs');
		path = require('path');
		vm   = require('vm');
	}
	
	var instantiateFreshLogger = function(customOutput) {

		if (isBrowser)
			return Object.create(Logger,customOutput);
		
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

		return context.Logger;
	}

	/*
	 * Check that the Logger was instantiated correctly for testing.
	 */
	exports.logger_instantiate = function(test) {
		test.expect(1);
		
		var Logger = instantiateFreshLogger(); 

		test.equal(typeof Logger, 'function', 'Instantiated logger');
		
		test.done();
	};

	/*
	 * Check that the Logger writes to stdout by default with no errors.
	 */
	exports.logger_writes_to_stdout = function(test) {
		test.expect(1);

		var Logger = instantiateFreshLogger();
		
		test.doesNotThrow(function() {
			Logger.logAction(Logger.LOG_NONE,'logger_writes_to_stdout()','test message');
		},'Logger does not throw when called');

		test.done();
	}

	/*
	 * Check that the default logging level is Logger.MAJOR.
	 */
	exports.logger_level_defaults_to_warn = function(test) {
		test.expect(2);
		
		var Logger = instantiateFreshLogger();
		
		test.equal(true, Logger.shouldLog(Logger.LOG_MAJOR), 'Logger writes at level MAJOR by default');
		test.equal(false,Logger.shouldLog(Logger.LOG_MINOR), 'Logger does not write at lever MINOR by default');

		test.done();
	}
	
	/*
	 * Check that the logging level can be changed.
	 */
	exports.logger_level_change = function(test) {
		test.expect(5);
		
		var Logger = instantiateFreshLogger();
		
		test.equal(true, Logger.shouldLog(Logger.LOG_MAJOR), 'Logger writes at level MAJOR before changing level');
		test.equal(false,Logger.shouldLog(Logger.LOG_MINOR), 'Logger does not write at lever MINOR before changing level');
		
		Logger.setLog(Logger.LOG_MICRO);
		
		test.equal(true, Logger.shouldLog(Logger.LOG_MICRO), 'Logger writes at level MICRO when set to MICRO');

		Logger.setLog(Logger.LOG_MINOR);
		
		test.equal(false, Logger.shouldLog(Logger.LOG_MICRO), 'Logger does not write at level MICRO when set to MINOR');
		test.equal(true, Logger.shouldLog(Logger.LOG_MINOR), 'Logger writes at level MINOR when set to MINOR');


		test.done();
	}
	
	/*
	 * Check that a custom logger can be used.
	 */
	exports.logger_custom = function(test) {
		test.expect(1);
		
		var customLogger = (function() {
			return {
				lastMessage: null,
				log: function(message) {
					this.lastMessage = message;
				}
			}
		})();
		
		var Logger = instantiateFreshLogger();
		var action = 'logger_custom';
		var message = 'test message';
		Logger.setLog( Logger.LOG_NONE, customLogger.log );
		
		Logger.logAction(Logger.LOG_NONE, action, message);
		console.log(customLogger.lastMessage);

		test.equal('Ably: ' + action + ': ' + message, customLogger.lastMessage);
		
		test.done();
	}

	return module.exports = helper.withTimeout(exports);
});
