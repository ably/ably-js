"use strict";

module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-curl');
	grunt.loadNpmTasks('grunt-zip');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-closure-compiler');
	grunt.loadNpmTasks('grunt-bump');

	var dirs = {
		common: 'common',
		browser: 'browser',
		fragments: 'browser/fragments',
		static: 'browser/static',
		dest: 'browser/static',
		compat: 'browser/compat',
		crypto_js: 'node_modules/crypto-js/src',
		tools_compiler: __dirname + '/tools/closure-compiler'
	};

	function compilerSpec(src, dest) {
		return {
			closurePath: dirs.tools_compiler,
			js: src,
			jsOutputFile: (dest || src.replace(/\.js/, '.min.js')),
			maxBuffer: 500,
			noreport: true,
			options: { compilation_level: 'SIMPLE_OPTIMIZATIONS' }
		};
	}

	var gruntConfig = {
		dirs: dirs,
		pkgVersion: grunt.file.readJSON('package.json').version
	};

	gruntConfig.curl = {
		'compiler': {
			src: 'http://dl.google.com/closure-compiler/compiler-latest.zip',
			dest: '<%= dirs.tools_compiler %>/build/compiler-latest.zip'
		}
	};

	gruntConfig.unzip = {
		'compiler': {
			src: '<%= dirs.tools_compiler %>/build/compiler-latest.zip',
			dest: '<%= dirs.tools_compiler %>/build'
		}
	};

	gruntConfig.copy = {
		'compat-pubnub-js': {
			src: '<%= dirs.compat %>/pubnub.js',
			dest: '<%= dirs.dest %>/compat-pubnub.js',
			flatten: true,
			nonull: true
		},
		'compat-pubnub-md': {
			src: '<%= dirs.compat %>/pubnub.md',
			dest: '<%= dirs.dest %>/compat-pubnub.md',
			flatten: true
		},
		'compat-pusher-md': {
			src: '<%= dirs.compat %>/pusher.md',
			dest: '<%= dirs.dest %>/compat-pusher.md',
			flatten: true
		}
	};

	gruntConfig.concat = {
		ably: {
			dest: '<%= dirs.dest %>/ably.js',
			nonull: true
		},
		'ably.noencryption': {
			dest: '<%= dirs.dest %>/ably.noencryption.js',
			nonull: true
		},
		'iframe.js': {
			dest: '<%= dirs.dest %>/iframe.js',
			nonull: true
		},
		'iframe.html': {
			dest: '<%= dirs.dest %>/iframe-<%= pkgVersion %>.html',
			nonull: true
		},
		'iframe.min.html': {
			dest: '<%= dirs.dest %>/iframe.min-<%= pkgVersion %>.html',
			nonull: true
		},
		pusher: {
			dest: '<%= dirs.dest %>/compat-pusher.js',
			nonull: true
		}
	};

	gruntConfig['closure-compiler'] = {
		'ably.js': compilerSpec('<%= dirs.static %>/ably.js'),
		'ably.noencryption.js': compilerSpec('<%= dirs.static %>/ably.noencryption.js'),
		'iframe.js': compilerSpec('<%= dirs.static %>/iframe.js'),
		'pubnub.js': compilerSpec('<%= dirs.static %>/compat-pubnub.js'),
		'pusher.js': compilerSpec('<%= dirs.static %>/compat-pusher.js')
	};

	var ablyFiles = [
		'<%= dirs.browser %>/lib/util/defaults.js',
		'<%= dirs.browser %>/lib/util/bufferutils.js',
		'<%= dirs.browser %>/lib/util/cookie.js',
		'<%= dirs.browser %>/lib/util/http.js',
		'<%= dirs.browser %>/lib/util/base64.js',
		'<%= dirs.browser %>/lib/util/domevent.js',
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.common %>/lib/util/defaults.js',
		'<%= dirs.common %>/lib/util/eventemitter.js',
		'<%= dirs.common %>/lib/util/logger.js',
		'<%= dirs.common %>/lib/util/utils.js',
		'<%= dirs.common %>/lib/util/multicaster.js',

		'<%= dirs.common %>/lib/types/errorinfo.js',
		'<%= dirs.common %>/lib/types/message.js',
		'<%= dirs.common %>/lib/types/presencemessage.js',
		'<%= dirs.common %>/lib/types/protocolmessage.js',
		'<%= dirs.common %>/lib/types/stats.js',

		'<%= dirs.common %>/lib/transport/connectionerror.js',
		'<%= dirs.common %>/lib/transport/messagequeue.js',
		'<%= dirs.common %>/lib/transport/protocol.js',
		'<%= dirs.common %>/lib/transport/connectionmanager.js',
		'<%= dirs.common %>/lib/transport/transport.js',
		'<%= dirs.common %>/lib/transport/websockettransport.js',
		'<%= dirs.common %>/lib/transport/comettransport.js',

		'<%= dirs.common %>/lib/client/presence.js',
		'<%= dirs.common %>/lib/client/resource.js',
		'<%= dirs.common %>/lib/client/paginatedresource.js',
		'<%= dirs.common %>/lib/client/auth.js',
		'<%= dirs.common %>/lib/client/rest.js',
		'<%= dirs.common %>/lib/client/realtime.js',
		'<%= dirs.common %>/lib/client/connectionstatechange.js',
		'<%= dirs.common %>/lib/client/connection.js',
		'<%= dirs.common %>/lib/client/channel.js',
		'<%= dirs.common %>/lib/client/realtimechannel.js',
		'<%= dirs.common %>/lib/client/realtimepresence.js',

		'<%= dirs.browser %>/lib/transport/jsonptransport.js',
		'<%= dirs.browser %>/lib/transport/xhrrequest.js',
		'<%= dirs.browser %>/lib/transport/xhrtransport.js',
		'<%= dirs.browser %>/lib/transport/iframetransport.js'
	];

	gruntConfig.concat['ably'].src = [].concat(
		'<%= dirs.fragments %>/ably-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',
		'<%= dirs.crypto_js %>/cipher-core.js',
		'<%= dirs.crypto_js %>/aes.js',
		'<%= dirs.crypto_js %>/lib-typedarrays.js',

		'<%= dirs.browser %>/lib/util/crypto.js',
		ablyFiles,

		'<%= dirs.fragments %>/ably-epilogue.js'
	);

	gruntConfig.concat['ably.noencryption'].src = [].concat(
		'<%= dirs.fragments %>/ably-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',

		ablyFiles,

		'<%= dirs.fragments %>/ably-epilogue.js'
	);

	gruntConfig.concat['iframe.js'].src = [
		'<%= dirs.fragments %>/ably-prologue.js',
		'<%= dirs.browser %>/lib/util/defaults.js',
		'<%= dirs.browser %>/lib/util/domevent.js',

		'<%= dirs.common %>/lib/util/defaults.js',
		'<%= dirs.common %>/lib/util/eventemitter.js',
		'<%= dirs.common %>/lib/util/logger.js',
		'<%= dirs.common %>/lib/util/multicaster.js',
		'<%= dirs.common %>/lib/util/utils.js',
		'<%= dirs.common %>/lib/types/protocolmessage.js',

		'<%= dirs.browser %>/lib/transport/xhrrequest.js',
		'<%= dirs.browser %>/lib/transport/iframeagent.js',
		'<%= dirs.fragments %>/ably-epilogue.js'
	];

	gruntConfig.concat['iframe.html'].src = [
		'<%= dirs.fragments %>/iframe-prologue.html',
		'<%= dirs.dest %>/iframe.js',
		'<%= dirs.fragments %>/iframe-epilogue.html'
	];

	gruntConfig.concat['iframe.min.html'].src = [
		'<%= dirs.fragments %>/iframe-prologue.html',
		'<%= dirs.dest %>/iframe.min.js',
		'<%= dirs.fragments %>/iframe-epilogue.html'
	];

	gruntConfig.concat['pusher'].src = [
		'<%= dirs.fragments %>/prologue.js',
		'<%= dirs.common %>/lib/util/eventemitter.js',
		'<%= dirs.common %>/lib/util/utils.js',
		'<%= dirs.browser %>/compat/pusher.js',
		'<%= dirs.fragments %>/epilogue.js'
	];

	gruntConfig.bump = {
		options: {
			files: ['package.json'],
			commit: true,
			commitMessage: 'Regenerate and release version %VERSION%',
			commitFiles: [], // Add files manually as can't add new files with a commit flag
			createTag: true,
			tagName: '%VERSION%',
			tagMessage: 'Version %VERSION%',
			push: false,
		}
	};

	grunt.initConfig(gruntConfig);

	grunt.registerTask('compiler', [
		'curl:compiler',
		'unzip:compiler'
	]);

	grunt.registerTask('build', [
		'set-library-version',
		'ably.js',
		'ably.noencryption.js',
		'iframe.js',
		'iframe.html',
		'pusher',
		'pubnub'
	]);

	grunt.registerTask('ably.js', [
		'concat:ably'
	]);

	grunt.registerTask('ably.noencryption.js', [
		'concat:ably.noencryption'
	]);

	grunt.registerTask('iframe.js', [
		'concat:iframe.js'
	]);

	grunt.registerTask('iframe.html', [
		'concat:iframe.html'
	]);

	grunt.registerTask('iframe.min.html', [
		'closure-compiler:iframe.js',
		'concat:iframe.min.html'
	]);

	grunt.registerTask('pusher', [
		'concat:pusher',
		'copy:compat-pusher-md'
	]);

	grunt.registerTask('pubnub', [
		'copy:compat-pubnub-js',
		'copy:compat-pubnub-md'
	]);

	grunt.registerTask('minify', [
		'closure-compiler:ably.js',
		'closure-compiler:ably.noencryption.js',
		'iframe.min.html',
		'closure-compiler:pubnub.js',
		'closure-compiler:pusher.js'
	]);

	grunt.registerTask('all', ['clean', 'build', 'minify', 'requirejs']);

	grunt.loadTasks('spec/tasks');

	var browsers = grunt.option('browsers') || 'default';
	var optionsDescription = '\nOptions:\n  --browsers [browsers] e.g. Chrome,PhantomJS (Firefox is default)';

	grunt.registerTask('clean',
		'Remove versioned files',
		function() {
			grunt.file.expand(gruntConfig.dirs.dest + '/iframe-*.html').forEach(grunt.file.delete);
			grunt.file.expand(gruntConfig.dirs.dest + '/iframe.min-*.html').forEach(grunt.file.delete);
		}
	);

	grunt.registerTask('set-library-version',
		'Set the library version string used for loading dependencies',
		function() {
			var defaultsFile = gruntConfig.dirs.common + '/lib/util/defaults.js';
			var defaultsText = grunt.file.read(defaultsFile).replace(/(version\s*=\s*)'([\w\.]*)'/, '$1\'' + gruntConfig.pkgVersion + '\'');
			grunt.file.write(defaultsFile, defaultsText);
		}
	);

	grunt.registerTask('test',
		'Concat files and run the entire test suite (Jasmine with node & Karma in a browser)' + optionsDescription,
		['build', 'nodeunit', 'karma:' + browsers]
	);

	grunt.registerTask('test:karma',
		'Run the Karma test suite' + optionsDescription,
		['build', 'karma:' + browsers]
	);

	grunt.registerTask('test:karma:run',
		'Concat files and then run the Karma test runner.  Assumes a Karma server is running',
		['copy', 'concat', 'requirejs', 'karma:run']
	);

	grunt.registerTask('test:nodeunit',
		'Concat files and then run the Nodeunit specs\nOptions\n  --test [tests] e.g. --test test/rest/auth.js',
		['copy', 'concat', 'requirejs', 'nodeunit']
	);

	grunt.registerTask('test:webserver',
		'Launch the Nodeunit test web server on http://localhost:3000/',
		['copy', 'concat', 'requirejs', 'nodeunit:webserver']
	);

	grunt.registerTask('release:refresh-pkgVersion',
		'Refreshes GruntConfig.pkgVersion', function() {
			grunt.config('pkgVersion', grunt.file.readJSON('package.json').version);
			grunt.log.ok('pkgVersion updated');
		}
  );

	grunt.registerTask('release:git-add-generated',
		'Adds generated files to the git staging area', function() {
			var done = this.async();
			var generatedFiles = [
				gruntConfig.dirs.static,
				gruntConfig.dirs.common + '/lib/util/defaults.js',
				'package.json',
				'spec/support/browser_file_list.js'
			];
			var cmd = 'git add -A ' + generatedFiles.join(' ');
			grunt.log.ok("Executing " + cmd);

			require('child_process').exec(cmd, function(err, stdout, stderr) {
				if (err) {
					grunt.fatal('git add . -A failed with ' + stderr);
				}
				done();
			});
		}
	);

	grunt.registerTask('release',
		'Increments the version, regenerates, and makes a tagged commit. Run as "grunt release:type", where "type" is "major", "minor", "patch", "prepatch", etc.)',
		function(versionType) {
			grunt.task.run([
				'bump-only:' + versionType,
				'release:refresh-pkgVersion', // Else the iframe file gets created with the old version
				'all',
				'release:git-add-generated',
				'bump-commit']);
		}
	);

	grunt.registerTask('default', 'all');
};
