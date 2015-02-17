/* These modules are paths to common modules loaded by requireJs in the browser or Node */

var ablyModules = {
  'ably': { jasmine: 'browser/static/ably', node: 'nodejs/index' },
  'ably.noencryption': { jasmine: 'browser/static/ably.noencryption' },
  'compat-pubnub': { jasmine: 'browser/static/compat-pubnub' },
  'compat-pusher': { jasmine: 'browser/static/compat-pusher' },
  'browser-base64': { jasmine: 'browser/lib/util/base64', node: 'skip' },
  'testapp': { jasmine: 'spec/common/testapp', node: 'spec/common/testapp' },
  'testapp_module': { jasmine: 'spec/common/testapp_module', node: 'spec/common/testapp_module' },
  'client_module': { jasmine: 'spec/common/client_module', node: 'spec/common/client_module' }
};

var isBrowser = (typeof(window) == 'object');
if (!isBrowser) {
  module.exports = { MODULES: ablyModules };
} else {
  __ABLY__.MODULES = ablyModules;
}
