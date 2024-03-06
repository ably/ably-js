module.exports = {
  require: ['source-map-support/register', 'test/support/modules_helper.js', 'test/support/test_helper.js'],
  reporter: 'test/support/mocha_reporter.js',
  spec: ['test/realtime/*.test.js', 'test/rest/*.test.js'],
};
