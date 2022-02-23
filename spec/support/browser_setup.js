"use strict";

var allTestFiles = [];

var baseUrl = '';

require([(baseUrl + '/spec/common/globals/named_dependencies.js').replace('//','/')], function(modules) {
	var requireJsPaths = {};
	for (var key in modules) {
		if (modules.hasOwnProperty(key) && modules[key].browser) {
			requireJsPaths[key] = modules[key].browser;
		}
	}

	require.config({
		// Karma serves files under /base, which is the basePath from your config file
		baseUrl: baseUrl,

		// Ensure changes to these modules are reflected in node_helper.js
		paths: requireJsPaths,

		// The following requireJS depdendencies are not requireJS compatible but instead pollute the global namespace
		// It is better therefore to grab the global object and provide that to requireJS dependency management
		shim: {
			'ably': {
				exports: 'Ably'
			},
			'ably.noencryption': {
				exports: 'Ably'
			},
			'browser-base64': {
				exports: 'Base64'
			},
			'vcdiff-decoder': {
				exports: 'vcdiffDecoder'
			}
		},

		// dynamically load all test files
		deps: allTestFiles,

		// we have to kickoff mocha
		callback: ()=>mocha.run()
	});
});
