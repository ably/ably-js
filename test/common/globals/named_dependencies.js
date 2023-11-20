/* These modules are paths to common modules loaded by requireJs in the browser or Node */
define(function () {
  return (module.exports = {
    // Ably modules
    ably: { browser: 'build/ably', node: 'build/ably-node' },

    // test modules
    globals: { browser: 'test/common/globals/environment', node: 'test/common/globals/environment' },
    shared_helper: { browser: 'test/common/modules/shared_helper', node: 'test/common/modules/shared_helper' },
    async: { browser: 'node_modules/async/lib/async' },
    chai: { browser: 'node_modules/chai/chai', node: 'node_modules/chai/chai' },
    delta_tests: { browser: 'test/realtime/shared/delta_tests', node: 'test/realtime/shared/delta_tests' },
  });
});
