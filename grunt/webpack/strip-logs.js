const { implSrcDir, createStripLogsStats, checkStripLogsStats } = require('../strip-logs/transform');
const { statsByKey } = require('./strip-logs-loader');

/**
 * The webpack counterpart of the esbuild plugin in ../esbuild/strip-logs.js, for the bundles
 * webpack builds: strips every log below error level from the implementation's sources.
 *
 * Returns a module rule and a plugin that share one record of what the rule found, so that the
 * plugin can run the same bundle-wide sense checks as the esbuild plugin once the compilation is
 * done. Call it once per webpack config.
 */
function createStripLogs() {
  const stats = createStripLogsStats();
  const statsKey = `strip-logs-${statsByKey.size}`;
  statsByKey.set(statsKey, stats);

  const rule = {
    test: /\.ts$/,
    include: implSrcDir,
    // Runs before ts-loader, on the TypeScript source, as the esbuild plugin does.
    enforce: 'pre',
    loader: require.resolve('./strip-logs-loader'),
    options: { statsKey },
  };

  const plugin = {
    apply(compiler) {
      compiler.hooks.afterCompile.tap('StripLogs', (compilation) => {
        for (const message of checkStripLogsStats(stats)) {
          compilation.errors.push(new Error(message));
        }
      });
    },
  };

  return { rule, plugin };
}

module.exports = { createStripLogs };
