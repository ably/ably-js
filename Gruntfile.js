'use strict';

var fs = require('fs');
var path = require('path');
var webpackConfig = require('./webpack.config');
var esbuild = require('esbuild');
var umdWrapper = require('esbuild-plugin-umd-wrapper');
var banner = require('./src/fragments/license');
var process = require('process');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-webpack');

  var dirs = {
    common: 'src/common',
    browser: 'src/platform/web',
    fragments: 'src/platform/web/fragments',
    static: 'build',
    dest: 'build',
  };

  function compilerSpec(src, dest) {
    return {
      src: src,
      dest: dest || src.replace(/\.js/, '.min.js'),
    };
  }

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
    pkgVersion: grunt.file.readJSON('package.json').version,
    webpack: {
      all: Object.values(webpackConfig),
      node: webpackConfig.node,
      browser: [webpackConfig.browser, webpackConfig.browserMin],
    },
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
      prereleaseName: 'beta',
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

  grunt.registerTask('build:browser', function () {
    var done = this.async();

    var baseConfig = {
      entryPoints: ['src/platform/web/index.ts'],
      outfile: 'build/ably.js',
      bundle: true,
      sourcemap: true,
      format: 'umd',
      banner: { js: '/*' + banner + '*/' },
      plugins: [umdWrapper.default()],
      target: 'es6',
    };

    var modulesConfig = {
      ...baseConfig,
      entryPoints: ['src/platform/web/modules.ts'],
      outfile: 'build/modules/index.js',
      format: 'esm',
      plugins: [],
      // TODO understand this syntax, do for base too, document why these are named as they are, link to issue, comment on issue
      mangleProps: /(_body|_headers|_unpacked|_statusCode|_err|_fatal|_transport)/,
    };

    // For reasons I don't understand this build fails when run asynchronously
    esbuild.buildSync(modulesConfig);

    Promise.all([
      esbuild.build(baseConfig),
      esbuild.build({
        ...baseConfig,
        outfile: 'build/ably.min.js',
        minify: true,
      }),
    ]).then(() => {
      console.log('esbuild succeeded');
      done(true);
    });
  });

  grunt.loadTasks('test/tasks');

  grunt.registerTask('test', ['test:node']);
  grunt.registerTask(
    'test:node',
    'Build the library and run the node test suite\nOptions\n  --test [tests] e.g. --test test/rest/auth.js',
    ['build:node', 'mocha']
  );

  grunt.registerTask('test:webserver', 'Launch the Mocha test web server on http://localhost:3000/', [
    'build:browser',
    'checkGitSubmodules',
    'mocha:webserver',
  ]);

  grunt.registerTask('release:refresh-pkgVersion', 'Refreshes GruntConfig.pkgVersion', function () {
    grunt.config('pkgVersion', grunt.file.readJSON('package.json').version);
    grunt.log.ok('pkgVersion updated');
  });

  grunt.registerTask('release:git-add-generated', 'Adds generated files to the git staging area', function () {
    var done = this.async();
    var generatedFiles = [
      gruntConfig.dirs.common + '/lib/util/defaults.js',
      gruntConfig.dirs.fragments + '/license.js',
      'package.json',
      'package-lock.json',
      'README.md',
      'test/support/browser_file_list.js',
    ];
    var cmd = 'git add -A ' + generatedFiles.join(' ');
    grunt.log.ok('Executing ' + cmd);

    require('child_process').exec(cmd, function (err, stdout, stderr) {
      if (err) {
        grunt.fatal('git add . -A failed with ' + stderr);
      }
      done();
    });
  });

  grunt.registerTask('release:git-push', 'Pushes to git', execExternal('git push origin main --follow-tags'));

  grunt.registerTask('release:ably-deploy', 'Deploys to ably CDN', function () {
    var version = grunt.file.readJSON('package.json').version,
      cmd = 'node scripts/cdn_deploy.js --skipCheckout --tag ' + version;
    console.log('Publishing version ' + version + ' of the library to the CDN');
    execExternal(cmd).call(this);
  });

  grunt.registerTask('release:deploy', 'Pushes a new release to github and then deploys to the Ably CDN', function () {
    grunt.task.run(['release:git-push', 'release:ably-deploy']);
  });

  grunt.registerTask(
    'release',
    'Increments the version, regenerates, and makes a tagged commit. Run as "grunt release:type", where "type" is "major", "minor", "patch", "prepatch", etc.)',
    function (versionType) {
      grunt.task.run([
        'bump-only:' + versionType,
        'release:refresh-pkgVersion',
        'all',
        'release:git-add-generated',
        'bump-commit',
      ]);
    }
  );

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
      }
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
