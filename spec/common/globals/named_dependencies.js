/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function(require) {
  return module.exports = {
    // Ably modules
    'ably':              { jasmine: 'browser/static/ably',                node: 'nodejs/index' },
    'ably.noencryption': { jasmine: 'browser/static/ably.noencryption' },
    'compat-pubnub':     { jasmine: 'browser/static/compat-pubnub' },
    'compat-pusher':     { jasmine: 'browser/static/compat-pusher' },
    'browser-base64':    { jasmine: 'browser/lib/util/base64',            node: 'skip' },

    // test modules
    'globals':           { jasmine: 'spec/common/globals/environment',    node: 'spec/common/globals/environment' },
    'shared_helper':     { jasmine: 'spec/common/modules/shared_helper',  node: 'spec/common/modules/shared_helper' }
  };

  return module.exports = ablyModules;
});
