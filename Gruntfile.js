'use strict';

var fs = require('fs');
var path = require('path');
var webpackConfig = require('./webpack.config');
var esbuild = require('esbuild');
var umdWrapper = require('esbuild-plugin-umd-wrapper');
var banner = require('./src/fragments/license');
var process = require('process');
var stripLogsPlugin = require('./grunt/esbuild/strip-logs').default;
var kexec = require('kexec');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-webpack');

  var dirs = {
    common: 'src/common',
    browser: 'src/platform/web',
    fragments: 'src/platform/web/fragments',
    static: 'build',
    dest: 'build',
  };

  async function execExternalPromises(cmd) {
    grunt.log.ok('Executing ' + cmd);
    return new Promise(function (resolve, reject) {
      require('child_process').exec(cmd, function (err, stdout, stderr) {
        if (err) {
          grunt.fatal('Error executing "' + cmd + '":\nstderr:\n' + stderr + '\nstdout:\n' + stdout);
          reject(err);
        }
        console.log(stdout);
        stderr && console.error(stderr);
        resolve();
      });
    });
  }

  function execExternal(cmd) {
    return function () {
      var done = this.async();
      execExternalPromises(cmd)
        .then(() => done())
        .catch((error) => done(error));
    };
  }

  var gruntConfig = {
    dirs: dirs,
    webpack: {
      all: Object.values(webpackConfig),
      node: [webpackConfig.node],
      browser: [webpackConfig.browser, webpackConfig.browserMin, webpackConfig.mochaJUnitReporterBrowser],
    },
  };

  grunt.initConfig(gruntConfig);

  grunt.registerTask('checkGitSubmodules', 'Check, if git submodules are properly installed', function () {
    var done = this.async();
    var pathToSubmodule = path.join(__dirname, 'test', 'common', 'ably-common');
    fs.stat(pathToSubmodule, function (error, stats) {
      if (error) {
        grunt.log.writeln('%s : while checking submodule path!', error.message);
        grunt.log.writeln('Probably, git submodule at %s are not initialized?', pathToSubmodule);
        grunt.log.writeln('Please, initialize it with `git submodule init & git submodule update`!');
        return done(false);
      }
      if (stats.isDirectory()) {
        grunt.log.writeln('Git submodule at %s is found!', pathToSubmodule);
        return done();
      }
      grunt.log.writeln('Git submodule at %s is not initialized!', pathToSubmodule);
      grunt.log.writeln('Please, initialize it with `git submodule init & git submodule update`!');
      return done(false);
    });
  });

  grunt.registerTask('build', ['checkGitSubmodules', 'webpack:all', 'build:browser']);

  grunt.registerTask('build:node', ['checkGitSubmodules', 'webpack:node']);

  grunt.registerTask('build:browser', ['checkGitSubmodules', 'webpack:browser']);

  grunt.registerTask('all', ['build', 'requirejs']);

  grunt.registerTask('mocha:webserver', 'Run the Mocha web server', function () {
    kexec('test/web_server');
  });

  grunt.registerTask('build:browser', function () {
    var done = this.async();

    function createBaseConfig() {
      return {
        entryPoints: ['src/platform/web/index.ts'],
        outfile: 'build/ably.js',
        bundle: true,
        sourcemap: true,
        format: 'umd',
        banner: { js: '/*' + banner + '*/' },
        plugins: [umdWrapper.default({ libraryName: 'Ably', amdNamedModule: false })],
        target: 'es2017',
      };
    }

    function createModularConfig() {
      return {
        // We need to create a new copy of the base config, because calling
        // esbuild.build() with the base config causes it to mutate the passed
        // config’s `banner.js` property to add some weird modules shim code,
        // which we don’t want here.
        ...createBaseConfig(),
        entryPoints: ['src/platform/web/modular.ts'],
        outfile: 'build/modular/index.js',
        format: 'esm',
        plugins: [stripLogsPlugin],
      };
    }

    Promise.all([
      esbuild.build(createBaseConfig()),
      esbuild.build({
        ...createBaseConfig(),
        outfile: 'build/ably.min.js',
        minify: true,
      }),
      esbuild.build(createModularConfig()),
    ]).then(() => {
      console.log('esbuild succeeded');
      done(true);
    });
  });

  grunt.registerTask('test:webserver', 'Launch the Mocha test web server on http://localhost:3000/', [
    'build:browser',
    'checkGitSubmodules',
    'mocha:webserver',
  ]);

  (function () {
    const baseDir = path.join(__dirname, 'test', 'package', 'browser');
    const buildDir = path.join(baseDir, 'build');

    grunt.registerTask(
      'test:package:browser:prepare-project',
      'Prepare an app to be used for testing the NPM package in a browser environment',
      function () {
        const done = this.async();

        (async function () {
          if (grunt.file.exists(buildDir)) {
            grunt.file.delete(buildDir);
          }

          // Create an app based on the template
          grunt.file.copy(path.join(baseDir, 'template'), buildDir);

          // Use `npm pack` to generate a .tgz NPM package
          await execExternalPromises('npm run build');
          await execExternalPromises('npm pack --pack-destination test/package/browser/build');
          const version = grunt.file.readJSON('package.json').version;
          const packFileName = `ably-${version}.tgz`;

          // Configure app to consume the generated .tgz file
          const pwd = process.cwd();
          process.chdir(buildDir);
          await execExternalPromises(`npm install ${packFileName}`);

          // Install further dependencies required for testing the app
          await execExternalPromises('npm run test:install-deps');
          process.chdir(pwd);
        })()
          .then(() => done(true))
          .catch((error) => done(error));
      },
    );

    grunt.registerTask('test:package:browser:test', 'Test the NPM package in a browser environment', function () {
      const done = this.async();

      (async function () {
        grunt.task.requires('test:package:browser:prepare-project');

        const pwd = process.cwd();
        process.chdir(buildDir);

        // Perform type checking on TypeScript code that imports ably-js
        await execExternalPromises('npm run typecheck');

        // Build bundle including ably-js
        await execExternalPromises('npm run build');

        // Test that the code which exercises ably-js behaves as expected
        await execExternalPromises('npm run test');

        process.chdir(pwd);
      })()
        .then(() => done(true))
        .catch((error) => done(error));
    });
  })();

  grunt.registerTask('test:package:browser', ['test:package:browser:prepare-project', 'test:package:browser:test']);
  grunt.registerTask('test:package', ['test:package:browser']);

  grunt.registerTask('default', 'all');
};
