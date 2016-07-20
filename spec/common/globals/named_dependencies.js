/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function() {
	return module.exports = {
		// Ably modules
		'ably':              { browser: 'browser/static/ably',                node: 'nodejs/index' },
		'ably.noencryption': { browser: 'browser/static/ably.noencryption' },
		'browser-base64':    { browser: 'browser/lib/util/base64',            node: 'skip' },

		// test modules
		'globals':           { browser: 'spec/common/globals/environment',    node: 'spec/common/globals/environment' },
		'shared_helper':     { browser: 'spec/common/modules/shared_helper',  node: 'spec/common/modules/shared_helper' },
		'async':             { browser: 'node_modules/async/lib/async' }
	};
});
