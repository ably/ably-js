// Karma configuration
// Generated on Mon Feb 16 2015 09:26:57 GMT+0000 (GMT)

module.exports = function(config) {
  var customLaunchers = {
    // BrowserStack launchers. List here: https://www.browserstack.com/list-of-browsers-and-platforms?product=automate
    // To get actual values run `curl -u "BROWSERSTACK_USERNAME:BROWSERSTACK_ACCESSKEY" https://api.browserstack.com/automate/browsers.json | json_pp`
    bs_firefox_catalina: {
      base: 'BrowserStack',
      browser: 'firefox',
      browser_version: '82.0',
      os: 'OS X',
      os_version: 'Catalina'
    },
    bs_chrome_catalina: {
      base: 'BrowserStack',
      browser: 'chrome',
      browser_version: '86.0',
      os: 'OS X',
      os_version: 'Catalina'
    },
    bs_ie11_win10: {
      base: 'BrowserStack',
      browser: 'ie',
      browser_version: '11.0',
      os: 'Windows',
      os_version: '10'
    },
    bs_safari_catalina: {
      base: 'BrowserStack',
      browser: 'safari',
      browser_version: '13.1',
      os: 'OS X',
      os_version: 'Catalina'
    },
    bs_android_10: {
      base: 'BrowserStack',
      browser: 'android',
      os: 'android',
      os_version: '10.0',
      device: 'Samsung Galaxy S20',
      real_mobile: true
    }
  };

  config.set({

    browserStack: {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESSKEY,
      timeout: 1800
    },

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['requirejs', 'mocha', 'chai'],

    // list of files / patterns to load in the browser
    files: [
      'spec/support/environment.vars.js',
      'spec/support/modules_helper.js',
      'spec/support/test_helper.js',
      'spec/support/browser_setup.js',

      // following files are loaded by RequireJS
      { pattern: 'browser/static/*.js', included: false },
      { pattern: 'browser/lib/util/base64.js', included: false },

      { pattern: 'node_modules/async/lib/async.js', included: false },
      { pattern: 'node_modules/@ably/vcdiff-decoder/dist/vcdiff-decoder.js', included: false },
      
      // shared test set up files
      { pattern: 'spec/common/**/*.js', included: false },
      { pattern: 'spec/common/ably-common/test-resources/*.json', included: false },
      { pattern: 'spec/support/*.js', included: false },

      // List of Tests to run
      // To run an individual test, comment the patterns below and specify path to a single test file
      { pattern: 'spec/realtime/*.test.js', included: false },
      { pattern: 'spec/rest/*.test.js', included: false },
      { pattern: 'spec/browser/*.test.js', included: false }
    ],

    // list of files to exclude
    exclude: [
      'spec/support/browser_file_list.js',
      'spec/support/node_helper.js',
      'spec/support/nodeunit.js'
    ],

    customHeaders: [{
      match: '.*',
      name: 'Access-Control-Allow-Origin',
      value: '*'
    },
    {
      match: '.*',
      name: 'Access-Control-Allow-Methods',
      value: '*'
    }],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'spec/support/environment.vars.js': ['env']
    },

    envPreprocessor: [
      'ABLY_ENV',
      'ABLY_REALTIME_HOST',
      'ABLY_REST_HOST',
      'ABLY_PORT',
      'ABLY_TLS_PORT',
      'ABLY_USE_TLS',
      'ABLY_LOG_LEVEL'
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['failed'],
    reportSlowerThan: 5000,

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    captureTimeout: 360000,
    browserDisconnectTimeout : 10000,
    browserNoActivityTimeout: 360000,
    customLaunchers: customLaunchers,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    client: {
      captureConsole: false,
    }
  });
};
