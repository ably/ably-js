"use strict";

define(['shared_helper'], function(helper) {

	/* Because the Logger cannot be loaded as a module, we mimic here the loading mechanism
	 * used in /nodejs/realtime.js and /nodejs/rest.js to get a reference to the Logger instance.
	 */

	var fs   = require('fs');
	var path = require('path');
	var vm   = require('vm');

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

	var Logger = context.Logger;

	/*
	 * Check that the Logger was instantiated correctly for testing.
	 */
	exports.logger_instantiate = function(test) {
		test.expect(1);

		test.equal(typeof Logger, 'function', 'Instantiated logger');
		
		test.done();
	};

	/*
	 * Check that the Logger writes to stdout by default.
	 */
	exports.logger_writes_to_stdout = function(test) {
		test.expect(0);

		test.done();
	}
	
	/*
	 * Check that the default logging level is Logger.MAJOR.
	 */
	exports.logger_level_defaults_to_warn = function(test) {
		test.expect(0);

		test.done();
	}
	
	/*
	 * Check that the logging level can be changed.
	 */
	exports.logger_level_change = function(test) {
		test.expect(0);

		test.done();
	}
	
	/*
	 * Check that a custom logger can be provided in the constructor.
	 */
	exports.logger_custom = function(test) {
		test.expect(0);

		test.done();
	}

	return module.exports = helper.withTimeout(exports);
});
