const config = {
  require: ['source-map-support/register', 'test/support/modules_helper.js', 'test/support/test_helper.js'],
  file: ['test/support/root_hooks.js'],
  reporter: 'test/support/mocha_reporter.js',
};

// mocha has a ridiculous issue (https://github.com/mochajs/mocha/issues/4100) that command line
// specs don't override config specs; they are merged instead, so you can't run a single test file
// if you've defined specs in your config. therefore we work around it by only adding specs to the
// config if none are passed as arguments
if (!process.argv.slice(2).some(isTestFile)) {
  config.spec = ['test/realtime/*.test.js', 'test/rest/*.test.js', 'test/unit/*.test.js'];
}

function isTestFile(arg) {
  return arg.match(/\.test.js$/);
}

module.exports = config;
