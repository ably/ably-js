'use strict';

var fs = require('fs');
var path = require('path');
var webpackConfig = require('./webpack.config');
var esbuild = require('esbuild');
var umdWrapper = require('esbuild-plugin-umd-wrapper');
var banner = require('./src/fragments/license');

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

  function execExternal(cmd) {
    return function () {
      var done = this.async();
      grunt.log.ok('Executing ' + cmd);
      require('child_process').exec(cmd, function (err, stdout, stderr) {
        if (err) {
          grunt.fatal('Error executing "' + cmd + '": ' + stderr);
        }
        console.log(stdout);
        stderr && console.error(stderr);
        done();
      });
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
      esbuild.build({
        ...baseConfig,
        entryPoints: ['src/platform/web-noencryption/index.ts'],
        outfile: 'build/ably.noencryption.js',
      }),

      esbuild.build({
        ...baseConfig,
        entryPoints: ['src/platform/web-noencryption/index.ts'],
        outfile: 'build/ably.noencryption.min.js',
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

  grunt.registerTask('default', 'all');
};
