"use strict";

var fs = require('fs');

module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-closure-tools');
	grunt.loadNpmTasks('grunt-bump');

	var dirs = {
		common: 'common',
		browser: 'browser',
		fragments: 'browser/fragments',
		static: 'browser/static',
		dest: 'browser/static',
		compat: 'browser/compat',
		crypto_js: 'node_modules/crypto-js/src',
		tools_compiler: __dirname + '/node_modules/google-closure-compiler/compiler.jar'
	};

	function compilerSpec(src, dest) {
		return {
			src: src,
			dest: (dest || src.replace(/\.js/, '.min.js'))
		};
	}

  function execExternal(cmd) {
		return function() {
			var done = this.async();
			grunt.log.ok("Executing " + cmd);
			require('child_process').exec(cmd, function(err, stdout, stderr) {
				if (err) {
					grunt.fatal('Error executing "' + cmd + '": ' + stderr);
				}
				console.log(stdout)
				stderr && console.error(stderr)
				done();
			});
		};
	}

	var gruntConfig = {
		dirs: dirs,
		pkgVersion: grunt.file.readJSON('package.json').version
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
		'ably-commonjs': {
			dest: '<%= dirs.dest %>/ably-commonjs.js',
			nonull: true
		},
		'ably-reactnative': {
			dest: '<%= dirs.dest %>/ably-reactnative.js',
			nonull: true
		},
		'ably-nativescript': {
			dest: '<%= dirs.dest %>/ably-nativescript.js',
			nonull: true
		},
		'ably-commonjs.noencryption': {
			dest: '<%= dirs.dest %>/ably-commonjs.noencryption.js',
			nonull: true
		},
		'ably.d.ts': {
			dest: '<%= dirs.dest %>/ably.d.ts',
			nonull: true
		}
	};

	gruntConfig['closureCompiler'] = {
		options: {
			compilerFile: dirs.tools_compiler,
			compilerOpts: {
				compilation_level: 'SIMPLE_OPTIMIZATIONS',
				/* By default, the compiler assumes you're using es6 and transpiles to
				 * es3, adding various (unnecessary and undesired) polyfills. Specify
				 * both in and out to es3 to avoid transpilation */
				language_in: 'ECMASCRIPT3',
				language_out: 'ECMASCRIPT3',
				/* The compiler strips all 'use strict' directives. Can have it add it
				 * by targeting ECMASCRIPT5_STRICT, but that means targeting es5; no
				 * way to target es3 and include 'use strict'. So add it manually */
				output_wrapper_file: dirs.fragments + '/minifieroutputwrapper',
				strict_mode_input: true,
				/* Let it know that we wrap everything in an IIFE, to enable additional optimizations */
				assume_function_wrapper: true,
			}
		},
		'ably.js': compilerSpec('<%= dirs.static %>/ably.js'),
		'ably.noencryption.js': compilerSpec('<%= dirs.static %>/ably.noencryption.js')
	};

	var ablyFiles = [
		'<%= dirs.browser %>/lib/util/defaults.js',
		'<%= dirs.browser %>/lib/util/bufferutils.js',
		'<%= dirs.common %>/lib/util/utils.js',
		'<%= dirs.browser %>/lib/util/http.js',
		'<%= dirs.browser %>/lib/util/base64.js',

		'<%= dirs.common %>/lib/util/defaults.js',
		'<%= dirs.common %>/lib/util/eventemitter.js',
		'<%= dirs.common %>/lib/util/logger.js',
		'<%= dirs.common %>/lib/util/multicaster.js',
		'<%= dirs.common %>/lib/util/errorreporter.js',

		'<%= dirs.common %>/lib/types/errorinfo.js',
		'<%= dirs.common %>/lib/types/message.js',
		'<%= dirs.common %>/lib/types/presencemessage.js',
		'<%= dirs.common %>/lib/types/protocolmessage.js',
		'<%= dirs.common %>/lib/types/stats.js',
		'<%= dirs.common %>/lib/types/devicedetails.js',
		'<%= dirs.common %>/lib/types/pushchannelsubscription.js',

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
		'<%= dirs.common %>/lib/client/channelstatechange.js',
		'<%= dirs.common %>/lib/client/connection.js',
		'<%= dirs.common %>/lib/client/push.js',
		'<%= dirs.common %>/lib/client/channel.js',
		'<%= dirs.common %>/lib/client/realtimechannel.js',
		'<%= dirs.common %>/lib/client/realtimepresence.js',

		'<%= dirs.browser %>/lib/transport/xhrrequest.js',
		'<%= dirs.browser %>/lib/transport/xhrstreamingtransport.js',
		'<%= dirs.browser %>/lib/transport/xhrpollingtransport.js',
	];

	gruntConfig.concat['ably'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',
		'<%= dirs.crypto_js %>/cipher-core.js',
		'<%= dirs.crypto_js %>/aes.js',
		'<%= dirs.crypto_js %>/lib-typedarrays.js',

		'<%= dirs.browser %>/lib/util/domevent.js',
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-browser.js',

		'<%= dirs.browser %>/lib/util/crypto.js',
		'<%= dirs.browser %>/lib/util/webstorage.js',
		ablyFiles,
		'<%= dirs.browser %>/lib/transport/jsonptransport.js',

		'<%= dirs.fragments %>/ably-epilogue.js'
	);

	gruntConfig.concat['ably-commonjs'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-commonjs-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',
		'<%= dirs.crypto_js %>/cipher-core.js',
		'<%= dirs.crypto_js %>/aes.js',
		'<%= dirs.crypto_js %>/lib-typedarrays.js',

		'<%= dirs.browser %>/lib/util/domevent.js',
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-browser.js',

		'<%= dirs.browser %>/lib/util/crypto.js',
		'<%= dirs.browser %>/lib/util/webstorage.js',
		ablyFiles,
		'<%= dirs.browser %>/lib/transport/jsonptransport.js',

		'<%= dirs.fragments %>/ably-commonjs-epilogue.js'
	);

	gruntConfig.concat['ably-reactnative'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-commonjs-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',
		'<%= dirs.crypto_js %>/cipher-core.js',
		'<%= dirs.crypto_js %>/aes.js',
		'<%= dirs.crypto_js %>/lib-typedarrays.js',

		/* domevent omitted; not supported in react native */
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-reactnative.js',

		'<%= dirs.browser %>/lib/util/crypto.js',
		'<%= dirs.browser %>/lib/util/webstorage.js',
		ablyFiles,
		/* jsonptransport omitted */

		'<%= dirs.fragments %>/ably-commonjs-epilogue.js'
	);

	gruntConfig.concat['ably-nativescript'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-commonjs-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',
		'<%= dirs.crypto_js %>/cipher-core.js',
		'<%= dirs.crypto_js %>/aes.js',
		'<%= dirs.crypto_js %>/lib-typedarrays.js',

		/* domevent omitted; not supported in nativescript */
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-nativescript.js',

		'<%= dirs.browser %>/lib/util/crypto.js',

		/* Note: nativescript-specific webstorage */
		'<%= dirs.browser %>/lib/util/nativescript-webstorage.js',
		ablyFiles,
		/* jsonptransport omitted */

		'<%= dirs.fragments %>/ably-commonjs-epilogue.js'
	);

	gruntConfig.concat['ably.noencryption'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',

		'<%= dirs.browser %>/lib/util/domevent.js',
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-browser.js',
		'<%= dirs.browser %>/lib/util/webstorage.js',

		ablyFiles,
		'<%= dirs.browser %>/lib/transport/jsonptransport.js',

		'<%= dirs.fragments %>/ably-epilogue.js'
	);

	gruntConfig.concat['ably-commonjs.noencryption'].src = [].concat(
		'<%= dirs.fragments %>/license.js',
		'<%= dirs.fragments %>/ably-commonjs-prologue.js',
		'<%= dirs.crypto_js %>/core.js',
		'<%= dirs.crypto_js %>/sha256.js',
		'<%= dirs.crypto_js %>/hmac.js',
		'<%= dirs.crypto_js %>/enc-base64.js',

		'<%= dirs.browser %>/lib/util/domevent.js',
		'<%= dirs.browser %>/lib/util/msgpack.js',

		'<%= dirs.fragments %>/platform-browser.js',

		'<%= dirs.browser %>/lib/util/webstorage.js',
		ablyFiles,
		'<%= dirs.browser %>/lib/transport/jsonptransport.js',

		'<%= dirs.fragments %>/ably-commonjs-epilogue.js'
	);

	gruntConfig.concat['ably.d.ts'].src = [].concat(
		'ably.d.ts'
	);

	gruntConfig.bump = {
		options: {
			files: ['package.json', 'bower.json', 'README.md'],
			globalReplace: true,
			commit: true,
			commitMessage: 'Regenerate and release version %VERSION%',
			commitFiles: [], // Add files manually as can't add new files with a commit flag
			createTag: true,
			tagName: '%VERSION%',
			tagMessage: 'Version %VERSION%',
			push: false,
			prereleaseName: 'beta'
		}
	};

	grunt.initConfig(gruntConfig);

	grunt.registerTask('build', [
		'set-library-version',
		'concat'
	]);

	grunt.registerTask('minify', [
		'closureCompiler:ably.js',
		'closureCompiler:ably.noencryption.js'
	]);

	grunt.registerTask('all', ['build', 'minify', 'requirejs']);

	grunt.loadTasks('spec/tasks');

	var browsers = grunt.option('browsers') || 'default';
	var optionsDescription = '\nOptions:\n  --browsers [browsers] e.g. Chrome,PhantomJS (Firefox is default)';

	grunt.registerTask('set-library-version',
		'Set the library version string used for loading dependencies',
		function() {
			var defaultsFile = gruntConfig.dirs.common + '/lib/util/defaults.js';
			var defaultsText = grunt.file.read(defaultsFile).replace(/(version\s*=\s*)'([\w\.\-]+)'/, '$1\'' + gruntConfig.pkgVersion + '\'');
			grunt.file.write(defaultsFile, defaultsText);

			var licenseFile = gruntConfig.dirs.fragments + '/license.js';
			var licenseText = grunt.file.read(licenseFile).
													replace(/(Ably JavaScript Library v)([\w\.\-]+)/i, '$1' + gruntConfig.pkgVersion).
													replace(/(Copyright )(\d{4,})/i, '$1' + new Date().getFullYear())
			grunt.file.write(licenseFile, licenseText);
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
		['concat', 'requirejs', 'karma:run']
	);

	grunt.registerTask('test:nodeunit',
		'Concat files and then run the Nodeunit specs\nOptions\n  --test [tests] e.g. --test test/rest/auth.js',
		['concat', 'requirejs', 'nodeunit']
	);

	grunt.registerTask('test:webserver',
		'Launch the Nodeunit test web server on http://localhost:3000/',
		['concat', 'requirejs', 'nodeunit:webserver']
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
				gruntConfig.dirs.fragments + '/license.js',
				'package.json',
				'bower.json',
				'README.md',
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

	grunt.registerTask('release:git-push',
		'Pushes to git', execExternal('git push origin master --follow-tags')
	);

	grunt.registerTask('release:npm-publish',
		/* Workaround for npm bug, see https://github.com/ably/ably-js/issues/422 */
		'Pushes to npm', execExternal('mv spec/common/ably-common/.git /tmp/ably-common-gitfile && npm publish . ; mv /tmp/ably-common-gitfile spec/common/ably-common/.git')
	);

	grunt.registerTask('release:ably-deploy',
		'Deploys to ably CDN, assuming infrastructure repo is in same dir as ably-js',
		function() {
			var infrastructurePath = '../infrastructure',
					maxTraverseDepth = 3,
					infrastructureFound;

			var folderExists = function(relativePath) {
				try {
					var fileStat = fs.statSync(infrastructurePath);
					if (fileStat.isDirectory()) {
						return true;
					}
				} catch (e) { /* does not exist */ }
			}

			while (infrastructurePath.length < 'infrastructure'.length + maxTraverseDepth*3) {
				if (infrastructureFound = folderExists(infrastructurePath)) {
					break;
				} else {
					infrastructurePath = "../" + infrastructurePath;
				}
			}
			if (!infrastructureFound) {
				grunt.fatal('Infrastructure repo could not be found in any parent folders up to a folder depth of ' + maxTraverseDepth);
			}
			var version = grunt.file.readJSON('package.json').version,
					cmd = 'BUNDLE_GEMFILE="' + infrastructurePath + '/Gemfile" bundle exec ' + infrastructurePath + '/bin/ably-env deploy javascript --version ' + version;
			console.log('Publishing version ' + version + ' of the library to the CDN');
			execExternal(cmd).call(this);
		}
	);

	grunt.registerTask('release:deploy',
		'Pushes a new release to github, deploys to npm, deploys to ably CDN',
		function() {
			grunt.task.run([
				'release:git-push',
				'release:npm-publish',
				'release:ably-deploy',
			]);
		}
	);

	grunt.registerTask('release',
		'Increments the version, regenerates, and makes a tagged commit. Run as "grunt release:type", where "type" is "major", "minor", "patch", "prepatch", etc.)',
		function(versionType) {
			grunt.task.run([
				'bump-only:' + versionType,
				'release:refresh-pkgVersion',
				'all',
				'release:git-add-generated',
				'bump-commit']);
		}
	);

	grunt.registerTask('default', 'all');
};
