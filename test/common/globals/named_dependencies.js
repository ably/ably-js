/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function () {
  return (module.exports = {
    // Ably modules
    ably: { browser: 'build/ably', node: 'build/ably-node' },
    'vcdiff-decoder': {
      browser: 'node_modules/@ably/vcdiff-decoder/dist/vcdiff-decoder',
      node: 'node_modules/@ably/vcdiff-decoder',
    },

    // test modules
    globals: { browser: 'test/common/globals/environment', node: 'test/common/globals/environment' },
    shared_helper: { browser: 'test/common/modules/shared_helper', node: 'test/common/modules/shared_helper' },
    async: { browser: 'node_modules/async/lib/async' },
    chai: { browser: 'node_modules/chai/chai', node: 'node_modules/chai/chai' },
    interception_proxy_client: {
      browser: 'test/common/modules/interception_proxy_client',
      node: 'test/common/modules/interception_proxy_client',
    },
  });
});
