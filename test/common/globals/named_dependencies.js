/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function() {
	return module.exports = {
		// Ably modules
		'ably':              { browser: 'browser/static/ably',                node: 'browser/static/ably-node' },
		'ably.noencryption': { browser: 'browser/static/ably.noencryption' },
		'base64':            { browser: 'node_modules/crypto-js/build/enc-base64',            node: 'skip' },
		'utf8':              { browser: 'node_modules/crypto-js/build/enc-utf8',            node: 'skip' },
		'vcdiff-decoder':    { browser: 'node_modules/@ably/vcdiff-decoder/dist/vcdiff-decoder',  node:'node_modules/@ably/vcdiff-decoder'},

		// test modules
		'globals':           { browser: 'test/common/globals/environment',    node: 'test/common/globals/environment' },
		'shared_helper':     { browser: 'test/common/modules/shared_helper',  node: 'test/common/modules/shared_helper' },
		'async':             { browser: 'node_modules/async/lib/async' },
		'chai':              { browser: 'node_modules/chai/chai',             node: 'node_modules/chai/chai' }
	};
});
