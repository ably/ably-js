/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function() {
	return module.exports = {
		// Ably modules
		'ably':              { browser: 'browser/static/ably',                node: 'browser/static/ably-node' },
		'ably.noencryption': { browser: 'browser/static/ably.noencryption' },
		'browser-base64':    { browser: 'browser/lib/util/base64_var',            node: 'skip' },
		'vcdiff-decoder':    { browser: 'node_modules/@ably/vcdiff-decoder/dist/vcdiff-decoder',  node:'node_modules/@ably/vcdiff-decoder'},
		
		// test modules
		'globals':           { browser: 'spec/common/globals/environment',    node: 'spec/common/globals/environment' },
		'shared_helper':     { browser: 'spec/common/modules/shared_helper',  node: 'spec/common/modules/shared_helper' },
		'async':             { browser: 'node_modules/async/lib/async' }
	};
});
