"use strict";

var async = require('async');
var fs = require('fs');
var path = require('path');
var webpackConfig = require('./webpack.config');
var exec = require('child_process').exec;
var pkgJSON = require('./package.json');
var util = require('util');

module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-closure-tools');
	grunt.loadNpmTasks('grunt-bump');
	grunt.loadNpmTasks('grunt-webpack');

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
			exec(cmd, function(err, stdout, stderr) {
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
		pkgVersion: grunt.file.readJSON('package.json').version,
		webpack: {
			config: webpackConfig
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
				language_in: 'ECMASCRIPT5',
				language_out: 'ECMASCRIPT5',
				strict_mode_input: true,
				checks_only: true,
				warning_level: 'QUIET'
			}
		},
		'ably.js': compilerSpec('<%= dirs.static %>/ably.js')
	};

	gruntConfig.bump = {
		options: {
			files: ['package.json', 'README.md'],
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

	grunt.registerTask('checkGitSubmodules',
		'Check, if git submodules are properly installed', function (){
			var done = this.async();
			var pathToSubmodule = path.join(__dirname, 'spec', 'common', 'ably-common');
			fs.stat(pathToSubmodule, function (error, stats){
				if(error) {
					grunt.log.writeln('%s : while checking submodule path!', error.message);
					grunt.log.writeln('Probably, git submodule at %s are not initialized?', pathToSubmodule);
					grunt.log.writeln('Please, initialize it with `git submodule init & git submodule update`!');
					return done(false);
				}
				if(stats.isDirectory()) {
					grunt.log.writeln('Git submodule at %s is found!', pathToSubmodule);
					return done();
				}
				grunt.log.writeln('Git submodule at %s is not initialized!', pathToSubmodule);
				grunt.log.writeln('Please, initialize it with `git submodule init & git submodule update`!');
				return done(false);
			});
		});

	// this function just bumps npm package version with respect to semver versioning
	// via incrementing patch version
	// so, 1.2.14 becomes 1.2.15
	grunt.registerTask('bump', function (done) {
		grunt.log.writeln('Current version is %s...', pkgJSON.version);
		var versions = pkgJSON.version.split('.');
		var major = parseInt(versions[0], 10);
		var minor = parseInt(versions[1], 10);
		var patch = parseInt(versions[2], 10);
		if (!major) {
			grunt.log.writeln('Malformed version major %s instead of number', major);
			return done(false);
		}
		if (!minor) {
			grunt.log.writeln('Malformed version minor %s instead of number', minor);
			return done(false);
		}
		if (!patch) {
			grunt.log.writeln('Malformed version patch %s instead of number', patch);
			return done(false);
		}
		patch += 1;
		pkgJSON.version = util.format("%s.%s.%s", major, minor, patch);
		grunt.log.writeln('Preparing to save package.json with new version %s into %s',
			pkgJSON.version,
			path.join(__dirname, 'package.json')
		);
		fs.writeFile(
			path.join(__dirname, 'package.json'),
			JSON.stringify(pkgJSON, null, '  '),
			{encoding:'utf8', flag:'w+'},
			function (error) {
				if (error) {
					grunt.log.writeln('%s - while saving package.json file', error);
					return done(false);
				}
				grunt.log.writeln('Package.json is upgraded! New version is %s!', pkgJSON.version);
				return done(true);
			});
	});
	// this command makes git commit with upgraded (by bump) package.json
	// and version engraved as commit message
	grunt.registerTask('commitVersion', function (done) {
		async
			.series([
				function addPackageJSON(cb) {
					exec('git add package.json', function (error, stdout, stderr) {
						if (error) {
							grunt.log.writeln('%s : while executing git tagging command', error);
							grunt.log.writeln('STDOUT: %s', stdout);
							grunt.log.writeln('STDERR: %s', stderr);
							return cb(error);
						}
						return cb(null);
					});
				},
				function commit(cb) {
					exec(util.format('git commit -m "Version bumped to %s"', pkgJSON.version), function (error, stdout, stderr) {
						if (error) {
							grunt.log.writeln('%s : while executing git commit command', error);
							grunt.log.writeln('STDOUT: %s', stdout);
							grunt.log.writeln('STDERR: %s', stderr);
							return cb(error);
						}
						return cb(null);
					});
				},
				function push(cb) {
					exec('git push"', function (error, stdout, stderr) {
						if (error) {
							grunt.log.writeln('%s : while executing git push command', error);
							grunt.log.writeln('STDOUT: %s', stdout);
							grunt.log.writeln('STDERR: %s', stderr);
							return cb(error);
						}
						return cb(null);
					});
				}
			], function (error) {
				if (error) {
					grunt.log.writeln('%s : while executing commitVersion', error);
					return done(false);
				}
				done(true);
			});
	});
	// this function just creates git tag in local repo
	grunt.registerTask('tag', function (done){
		exec(util.format('git tag v%s', pkgJSON.version), function (error, stdout, stderr){
			if(error) {
				grunt.log.writeln('%s : while executing git tagging command', error);
				grunt.log.writeln('STDOUT: %s', stdout);
				grunt.log.writeln('STDERR: %s', stderr);
				return done(false);
			}
			grunt.log.writeln('New git tag is created - v%s', pkgJSON.version);
			done(true);
		});
	});
	// this function makes github release of code by
	// calling github API via request as described here
	// https://docs.github.com/en/rest/reference/repos#create-a-release
	grunt.registerTask('release', function (done){
		grunt.log.writeln('not implemented yet');
		done(false);
	});

	// this grunt task makes
	// 1. upgrade version
	// 2. commit and push `package.json` with bumped version
	// 3. make git tag with latest commit pushed in tag 2
	// 4. makes github release (WIP)
	grunt.registerTask('publish-version-release',[
		'build',
		'bump',
		'commitVersion',
		'tag',
		'release'
	]);


	grunt.registerTask('build', [
		'checkGitSubmodules',
		'webpack'
	]);

	grunt.registerTask('check-closure-compiler', [
		'build',
		'closureCompiler:ably.js'
	]);

	grunt.registerTask('all', ['build', 'check-closure-compiler', 'requirejs']);

	grunt.loadTasks('spec/tasks');

	var browsers = grunt.option('browsers') || 'default';
	var optionsDescription = '\nOptions:\n  --browsers [browsers] e.g. Chrome,PhantomJS (Firefox is default)';

	grunt.registerTask('test',
		'Concat files and run the entire test suite (Jasmine with node & Karma in a browser)' + optionsDescription,
		['build', 'mocha', 'karma:' + browsers]
	);

	grunt.registerTask('test:karma',
		'Run the Karma test suite' + optionsDescription,
		['build', 'karma:' + browsers]
	);

	grunt.registerTask('test:karma:run',
		'Concat files and then run the Karma test runner.  Assumes a Karma server is running',
		['build', 'requirejs', 'karma:run']
	);

	grunt.registerTask('test:mocha',
		'Concat files and then run the Mocha specs\nOptions\n  --test [tests] e.g. --test test/rest/auth.js',
		['build', 'mocha']
	);

	grunt.registerTask('test:webserver',
		'Launch the Mocha test web server on http://localhost:3000/',
		['build', 'checkGitSubmodules', 'requirejs', 'mocha:webserver']
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
				gruntConfig.dirs.common + '/lib/util/defaults.js',
				gruntConfig.dirs.fragments + '/license.js',
				'package.json',
				'package-lock.json',
				'README.md',
				'spec/support/browser_file_list.js'
			];
			var cmd = 'git add -A ' + generatedFiles.join(' ');
			grunt.log.ok("Executing " + cmd);

			exec(cmd, function(err, stdout, stderr) {
				if (err) {
					grunt.fatal('git add . -A failed with ' + stderr);
				}
				done();
			});
		}
	);

	grunt.registerTask('release:git-push',
		'Pushes to git', execExternal('git push origin main --follow-tags')
	);

	grunt.registerTask('release:ably-deploy',
		'Deploys to ably CDN, assuming infrastructure repo is in same dir as ably-js',
		function() {
			var infrastructurePath = '../infrastructure',
					maxTraverseDepth = 3,
					infrastructureFound;

			var infrastructureDirExists = function() {
				try {
					var fileStat = fs.statSync(infrastructurePath);
					if (fileStat.isDirectory()) {
						return true;
					}
				} catch (e) { /* does not exist */ }
			}

			while (infrastructurePath.length < 'infrastructure'.length + maxTraverseDepth*3) {
				if (infrastructureFound = infrastructureDirExists(infrastructurePath)) {
					break;
				} else {
					infrastructurePath = "../" + infrastructurePath;
				}
			}
			if (!infrastructureFound) {
				grunt.fatal('Infrastructure repo could not be found in any parent folders up to a folder depth of ' + maxTraverseDepth);
			}
			var version = grunt.file.readJSON('package.json').version,
					cmd = 'cd ' + infrastructurePath + '; bundle exec ./bin/ably-env deploy javascript --version ' + version;
			console.log('Publishing version ' + version + ' of the library to the CDN');
			execExternal(cmd).call(this);
		}
	);

	grunt.registerTask('release:deploy',
		'Pushes a new release to github and then deploys to the Ably CDN',
		function() {
			grunt.task.run([
				'release:git-push',
				'release:ably-deploy'
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
